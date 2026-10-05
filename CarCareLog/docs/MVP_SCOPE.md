# CarCareLog MVP scope

This prototype implements the core manual workflow in the team's stakeholder requirements document. It is a development starting point, not a claim that all 18 requirements or all course deliverables are complete.

| Requirement | Prototype coverage | Evidence / remaining work |
| --- | --- | --- |
| SR01 | Implemented | Add/edit/delete selected-vehicle records. API lifecycle test. |
| SR02 | Implemented for core workflow | Current mileage and descending service timeline; client-side service/provider search and date-range filters. |
| SR03–SR05 | Pending | Receipt upload, AI field proposal, explicit draft confirmation and timed usability study. Manual saving does require confirmation. |
| SR06 | Partial | User supplies the manual reference for each interval. The app does not verify or retrieve that reference. |
| SR07–SR08 | Implemented | Recompute on mileage changes and record add/edit/delete. Mileage/time due and upcoming states tested. |
| SR09 | Implemented | Exact-cent total and monthly costs split by Maintenance/Repair category. |
| SR10–SR11 | Partial | Two fixed history queries cite record IDs or state insufficient evidence. Natural-language AI and manual-grounded answers are pending. |
| SR12 | Implemented | CSV exports all confirmed records for the selected vehicle; Unicode and spreadsheet formula escaping tested. |
| SR13 | Pending | Local loopback server only. No accounts, owner authorization or multi-user access control. |
| SR14 | Pending | No seven-day availability measurement has been performed. |
| SR15 | Supported | All core record operations work without any AI dependency. AI outage behavior awaits an actual AI integration. |
| SR16 | Initial coverage | Repeatable API checks cover CRUD, reminders, expenses, exports and fixed grounded lookup. Future AI workflows need additional regression tests. |
| SR17 | Pending | No external AI requests are made by this version. |
| SR18 | Pending | Stop-and-copy backup instructions exist; automated 24-hour recovery guarantees are not implemented. |

## Demo flow

1. Start the app and load demo data into the empty database.
2. Explain that the three records and two intervals are examples.
3. Check the total and monthly cost breakdown.
4. Search for a provider or filter by service date.
5. Add an oil-change record at the vehicle's current mileage. Confirm and save it; the reminder recalculates.
6. Edit a cost and check that the summary changes.
7. Ask the fixed oil-change question and show its source record ID.
8. Export CSV and restart the app to show data persistence.

## API overview

| Method | Path | Purpose |
| --- | --- | --- |
| GET / POST | `/api/vehicles` | List / create vehicles |
| PUT | `/api/vehicles/{id}` | Update vehicle name and odometer |
| GET | `/api/dashboard?vehicle_id={id}` | Records, reminders and cost summary |
| POST | `/api/records` | Confirm and save a record |
| PUT / DELETE | `/api/records/{id}` | Edit / delete a record |
| POST | `/api/reminders` | Configure or replace a service interval |
| DELETE | `/api/reminders/{id}` | Remove an interval |
| GET | `/api/export?vehicle_id={id}` | Export full confirmed history |
| GET | `/api/answer?vehicle_id={id}&question=oil` | Last recorded oil change |
| GET | `/api/answer?vehicle_id={id}&question=total` | Total recorded cost |
| POST | `/api/demo` | Explicitly load sample data into an empty database |

JSON requests use `Content-Type: application/json`. Distances are whole kilometers, costs are USD with at most two decimal places, and service dates cannot be in the future. Unknown record IDs return 404; invalid data returns 400.
