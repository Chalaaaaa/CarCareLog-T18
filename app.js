const $ = id => document.getElementById(id);
const services = ['Oil change', 'Tire rotation', 'Brake service', 'Inspection', 'Battery', 'Other'];
let cars = [], currentId = null, data = null;
const money = cents => new Intl.NumberFormat('en-US', {style: 'currency', currency: 'USD'}).format(cents / 100);
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, ch => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'}[ch]));
const today = () => {const now = new Date(); return `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;};

async function api(path, method = 'GET', body) {
  const response = await fetch(path, {method, headers: body ? {'Content-Type': 'application/json'} : {}, body: body ? JSON.stringify(body) : undefined});
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Request failed.');
  return result;
}
function message(text, error = false) {
  $('message').hidden = false; $('message').textContent = text; $('message').className = error ? 'error' : '';
}
function openDialog(id) {
  $(id).querySelector('.form-error').textContent = ''; $(id).showModal();
}
async function reload(selectedId = currentId) {
  cars = await api('/api/vehicles');
  currentId = cars.some(c => c.id === Number(selectedId)) ? Number(selectedId) : cars[0]?.id ?? null;
  $('vehicle-select').innerHTML = cars.length ? cars.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('') : '<option>No vehicles yet</option>';
  $('vehicle-select').value = currentId ?? '';
  $('edit-vehicle').disabled = !currentId;
  $('demo').hidden = cars.length > 0;
  $('welcome').hidden = !!currentId;
  $('dashboard').hidden = !currentId;
  if (currentId) {
    data = await api(`/api/dashboard?vehicle_id=${currentId}`);
    render();
  }
}
function render() {
  $('mileage-stat').textContent = data.vehicle.mileage.toLocaleString() + ' km';
  $('cost-stat').textContent = money(data.total_cents);
  $('count-stat').textContent = data.records.length;
  $('due-stat').textContent = data.reminders.filter(r => r.status === 'Due / overdue').length;
  $('export').href = `/api/export?vehicle_id=${currentId}`;
  $('answer').textContent = '';
  $('reminder-list').innerHTML = data.reminders.length ? data.reminders.map(r => `<div class="reminder"><div class="reminder-head"><strong>${escapeHtml(r.service_item)}</strong><span class="badge ${r.status === 'Due / overdue' ? 'due' : r.status === 'Upcoming' ? 'upcoming' : ''}">${escapeHtml(r.status)}</span></div><p>${r.due_mileage !== null ? `Due at ${r.due_mileage.toLocaleString()} km` : ''}${r.due_mileage !== null && r.due_date ? ' · ' : ''}${r.due_date ? `Due ${r.due_date}` : ''}${r.record_id ? ` · Based on record #${r.record_id}` : 'Add a matching service record to calculate the next due date.'}</p><p class="reference">${escapeHtml(r.reference)}</p><div class="actions"><button class="link-button" data-edit-reminder="${r.id}">Edit interval</button><button class="link-button" data-delete-reminder="${r.id}">Remove interval</button></div></div>`).join('') : '<p class="empty-inline">No intervals configured. Use your vehicle manual to set one.</p>';
  const max = Math.max(1, ...data.monthly.map(m => m.Maintenance + m.Repair));
  $('spending-list').innerHTML = data.monthly.length ? data.monthly.map(m => `<div class="spending-row"><span>${m.month}</span><div class="bar" aria-label="Maintenance ${money(m.Maintenance)}, repairs ${money(m.Repair)}"><span class="maintenance-bar" style="width:${m.Maintenance/max*100}%"></span><span class="repair-bar" style="width:${m.Repair/max*100}%"></span></div><span class="amount">${money(m.Maintenance+m.Repair)}</span></div>`).join('') + '<p class="legend"><span class="maintenance-bar"></span>Maintenance &nbsp; <span class="repair-bar"></span>Repair</p>' : '<p class="empty-inline">Monthly spending appears after you save a record.</p>';
  renderRecords();
}
function renderRecords() {
  if (!data) return;
  const term = $('search').value.trim().toLowerCase();
  const rows = data.records.filter(r => (!term || `${r.service_item} ${r.provider}`.toLowerCase().includes(term)) && (!$('from-date').value || r.service_date >= $('from-date').value) && (!$('to-date').value || r.service_date <= $('to-date').value));
  $('record-list').innerHTML = rows.length ? rows.map(r => `<article class="record" id="record-${r.id}"><time datetime="${r.service_date}">${r.service_date}</time><div><strong>${escapeHtml(r.service_item)}</strong><small>#${r.id} · ${r.category} · ${r.mileage.toLocaleString()} km${r.provider ? ' · ' + escapeHtml(r.provider) : ''}</small>${r.notes ? `<p>${escapeHtml(r.notes)}</p>` : ''}</div><strong class="cost">${money(r.cost_cents)}</strong><div class="record-actions"><button class="link-button" data-edit="${r.id}">Edit</button><button class="link-button" data-delete="${r.id}">Delete</button></div></article>`).join('') : '<p class="empty-inline">No matching records. Add a record or adjust your search.</p>';
}
function editVehicle(car) {
  const form = $('vehicle-form'); form.reset();
  form.elements.id.value = car?.id ?? '';
  form.elements.name.value = car?.name ?? '';
  form.elements.mileage.value = car?.mileage ?? '';
  $('vehicle-title').textContent = car ? 'Update vehicle' : 'Add vehicle';
  openDialog('vehicle-dialog');
}
function editRecord(record) {
  const form = $('record-form'); form.reset();
  form.elements.id.value = record?.id ?? '';
  form.elements.service_date.max = today();
  form.elements.service_date.value = record?.service_date ?? today();
  form.elements.mileage.value = record?.mileage ?? data.vehicle.mileage;
  form.elements.cost.value = record ? (record.cost_cents / 100).toFixed(2) : '';
  for (const field of ['service_item','category','provider','notes']) if (record) form.elements[field].value = record[field];
  $('record-title').textContent = record ? 'Edit service record' : 'Add service record';
  openDialog('record-dialog');
}
function editReminder(rule) {
  const form = $('reminder-form'); form.reset();
  if (rule) for (const field of ['service_item','interval_km','interval_months','reference']) form.elements[field].value = rule[field];
  openDialog('reminder-dialog');
}
function bindForm(id, submit) {
  $(id).addEventListener('submit', async event => {
    event.preventDefault();
    const form = event.target, button = form.querySelector('[type=submit]');
    button.disabled = true;
    form.querySelector('.form-error').textContent = '';
    try {await submit(Object.fromEntries(new FormData(form))); form.closest('dialog').close();}
    catch (error) {form.querySelector('.form-error').textContent = error.message;}
    finally {button.disabled = false;}
  });
}
bindForm('vehicle-form', async body => {
  const car = await api(body.id ? `/api/vehicles/${body.id}` : '/api/vehicles', body.id ? 'PUT' : 'POST', body);
  await reload(car.id); message('Vehicle saved.');
});
bindForm('record-form', async body => {
  body.vehicle_id = currentId;
  await api(body.id ? `/api/records/${body.id}` : '/api/records', body.id ? 'PUT' : 'POST', body);
  await reload(); message('Record confirmed and saved. Reminders and spending have been updated.');
});
bindForm('reminder-form', async body => {
  body.vehicle_id = currentId;
  await api('/api/reminders', 'POST', body); await reload(); message('Service interval saved.');
});
$('add-vehicle').onclick = () => editVehicle();
$('edit-vehicle').onclick = () => editVehicle(data.vehicle);
$('add-record').onclick = () => editRecord();
$('add-reminder').onclick = () => editReminder();
$('vehicle-select').onchange = async event => {try {await reload(Number(event.target.value));} catch (error) {message(error.message, true);}};
$('demo').onclick = async () => {try {const result = await api('/api/demo','POST',{}); await reload(result.vehicle_id); message('Demo data loaded. These records and intervals are examples only.');} catch (error) {message(error.message, true);}};
for (const id of ['search','from-date','to-date']) $(id).addEventListener('input', renderRecords);
$('clear-filters').onclick = () => {for (const id of ['search','from-date','to-date']) $(id).value = ''; renderRecords();};
document.querySelectorAll('.service-options').forEach(select => select.innerHTML = services.map(s => `<option>${s}</option>`).join(''));
document.addEventListener('click', async event => {
  const target = event.target.closest('button'); if (!target) return;
  try {
    if (target.dataset.close) $(target.dataset.close).close();
    if (target.dataset.edit) editRecord(data.records.find(r => r.id === Number(target.dataset.edit)));
    if (target.dataset.editReminder) editReminder(data.reminders.find(r => r.id === Number(target.dataset.editReminder)));
    if (target.dataset.delete && confirm('Delete this confirmed service record?')) {
      await api(`/api/records/${target.dataset.delete}`, 'DELETE'); await reload(); message('Record deleted. Current odometer mileage is retained.');
    }
    if (target.dataset.deleteReminder && confirm('Remove this service interval?')) {
      await api(`/api/reminders/${target.dataset.deleteReminder}`, 'DELETE'); await reload(); message('Service interval removed.');
    }
    if (target.dataset.question) {
      const result = await api(`/api/answer?vehicle_id=${currentId}&question=${target.dataset.question}`);
      $('answer').textContent = result.answer + (result.record_ids.length ? '\nSources: ' + result.record_ids.map(id => `record #${id}`).join(', ') : '\nNo supporting record available.');
    }
  } catch (error) {message(error.message, true);}
});
reload().catch(error => message('Could not load the app: ' + error.message, true));
