import importlib.util
import json
import tempfile
import threading
import unittest
from datetime import date, timedelta
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

spec = importlib.util.spec_from_file_location("app", Path(__file__).resolve().parents[1] / "backend" / "app.py")
app = importlib.util.module_from_spec(spec)
spec.loader.exec_module(app)


class QuietHandler(app.Handler):
    def log_message(self, *args):
        pass


class AppTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        app.DB_PATH = Path(self.temp.name) / "test.db"
        app.init_db()
        self.server = app.ThreadingHTTPServer(("127.0.0.1", 0), QuietHandler)
        self.thread = threading.Thread(target=self.server.serve_forever, daemon=True)
        self.thread.start()
        self.base = f"http://127.0.0.1:{self.server.server_port}"

    def tearDown(self):
        self.server.shutdown()
        self.server.server_close()
        self.thread.join()
        self.temp.cleanup()

    def call(self, path, method="GET", body=None, headers=None):
        headers = headers or {}
        if body is not None:
            headers["Content-Type"] = "application/json"
        request = Request(self.base + path, json.dumps(body).encode() if body is not None else None, headers, method=method)
        try:
            response = urlopen(request, timeout=5)
        except HTTPError as exc:
            response = exc
        with response:
            payload = response.read()
            return response.status, json.loads(payload) if "application/json" in response.headers["Content-Type"] else payload

    def car(self, name="Test car", mileage=12000):
        status, car = self.call("/api/vehicles", "POST", {"name": name, "mileage": mileage})
        self.assertEqual(status, 201)
        return car["id"]

    def record(self, car, **changes):
        body = dict(vehicle_id=car, service_date=date.today().isoformat(), service_item="Oil change",
                    category="Maintenance", mileage=10000, cost="80.25", provider="Garage", notes="")
        body.update(changes)
        return self.call("/api/records", "POST", body)

    def dashboard(self, car):
        status, data = self.call(f"/api/dashboard?vehicle_id={car}")
        self.assertEqual(status, 200)
        return data

    def rule(self, car, km=5000, months=6, service="Oil change"):
        return self.call("/api/reminders", "POST", dict(vehicle_id=car, service_item=service,
                         interval_km=km, interval_months=months, reference="Test owner's manual, p. 12"))

    def test_record_lifecycle_and_exact_costs(self):
        car = self.car()
        _, row = self.record(car, cost="0.10")
        self.record(car, cost="0.20", category="Repair")
        data = self.dashboard(car)
        self.assertEqual(data["total_cents"], 30)
        self.assertEqual(data["monthly"][0]["Maintenance"], 10)
        self.assertEqual(data["monthly"][0]["Repair"], 20)
        original = data["records"][-1]
        body = {**original, "cost": "12.34", "notes": "Updated"}
        self.assertEqual(self.call(f'/api/records/{row["id"]}', "PUT", body)[0], 200)
        self.assertEqual(self.dashboard(car)["total_cents"], 1254)
        self.assertEqual(self.call(f'/api/records/{row["id"]}', "DELETE")[0], 200)
        self.assertEqual(self.dashboard(car)["total_cents"], 20)
        app.init_db()
        self.assertEqual(len(self.dashboard(car)["records"]), 1)

    def test_invalid_data_is_not_saved(self):
        car = self.car()
        for changes in [dict(cost="NaN"), dict(cost="-1"), dict(cost="1.001"),
                        dict(mileage="1.5"), dict(service_date="2026-02-30"),
                        dict(service_date=(date.today()+timedelta(days=1)).isoformat()), dict(service_item="Unknown")]:
            self.assertEqual(self.record(car, **changes)[0], 400, changes)
        self.assertEqual(self.dashboard(car)["records"], [])

    def test_mileage_update_and_reminder_recalculation(self):
        car = self.car(mileage=14000)
        self.record(car, mileage=10000)
        self.rule(car)
        self.assertEqual(self.dashboard(car)["reminders"][0]["status"], "Upcoming")
        self.call(f"/api/vehicles/{car}", "PUT", dict(name="Test car", mileage=15000))
        self.assertEqual(self.dashboard(car)["reminders"][0]["status"], "Due / overdue")
        self.record(car, mileage=16000)
        data = self.dashboard(car)
        self.assertEqual(data["vehicle"]["mileage"], 16000)
        self.assertEqual(data["reminders"][0]["status"], "Scheduled")
        self.assertEqual(data["reminders"][0]["due_mileage"], 21000)
        self.assertEqual(self.call(f"/api/vehicles/{car}", "PUT", dict(name="Test car", mileage=100))[0], 400)

    def test_date_interval_and_deletion_recalculate(self):
        car = self.car()
        self.record(car, service_date=(date.today()-timedelta(days=200)).isoformat())
        self.rule(car, km=0, months=6)
        self.assertEqual(self.dashboard(car)["reminders"][0]["status"], "Due / overdue")
        _, newest = self.record(car)
        self.assertEqual(self.dashboard(car)["reminders"][0]["status"], "Scheduled")
        self.call(f'/api/records/{newest["id"]}', "DELETE")
        self.assertEqual(self.dashboard(car)["reminders"][0]["status"], "Due / overdue")

    def test_missing_history_and_month_end(self):
        car = self.car()
        self.rule(car)
        self.assertEqual(self.dashboard(car)["reminders"][0]["status"], "Needs service history")
        self.assertEqual(app.add_months(date(2024, 1, 31), 1), date(2024, 2, 29))
        self.assertEqual(app.add_months(date(2025, 1, 31), 1), date(2025, 2, 28))
        self.assertEqual(self.rule(car, km=0, months=0)[0], 400)

    def test_vehicle_selection_limits_dashboard_and_export(self):
        first, second = self.car(), self.car("Second car")
        self.record(first, provider="FirstGarage")
        self.record(second, provider="SecondGarage")
        self.assertEqual(len(self.dashboard(first)["records"]), 1)
        _, csv = self.call(f"/api/export?vehicle_id={first}")
        self.assertIn(b"FirstGarage", csv)
        self.assertNotIn(b"SecondGarage", csv)

    def test_csv_unicode_and_formula_escaping(self):
        car = self.car()
        self.record(car, provider="=1+1", notes="保养记录", line\nnext")
        status, csv = self.call(f"/api/export?vehicle_id={car}")
        self.assertEqual(status, 200)
        self.assertIn("'=1+1", csv.decode("utf-8-sig"))
        self.assertIn("保养记录", csv.decode("utf-8-sig"))

    def test_grounded_answers_and_insufficient_evidence(self):
        car = self.car()
        _, answer = self.call(f"/api/answer?vehicle_id={car}&question=oil")
        self.assertIn("Insufficient evidence", answer["answer"])
        self.assertEqual(answer["record_ids"], [])
        _, record = self.record(car)
        _, answer = self.call(f"/api/answer?vehicle_id={car}&question=oil")
        self.assertEqual(answer["record_ids"], [record["id"]])

    def test_local_origin_and_no_database_download(self):
        self.assertEqual(self.call("/api/vehicles", "POST", dict(name="Blocked", mileage=0), {"Origin": "https://example.com"})[0], 403)
        self.assertEqual(self.call("/api/vehicles", headers={"Host": "example.com"})[0], 403)
        self.assertEqual(self.call("/data/carcare.db")[0], 404)
        self.assertEqual(self.call("/api/vehicles")[1], [])

    def test_demo_is_opt_in_and_does_not_duplicate(self):
        self.assertEqual(self.call("/api/vehicles")[1], [])
        status, result = self.call("/api/demo", "POST", {})
        self.assertEqual(status, 201)
        self.assertEqual(len(self.dashboard(result["vehicle_id"])["records"]), 3)
        self.assertEqual(self.call("/api/demo", "POST", {})[0], 400)


if __name__ == "__main__":
    unittest.main()
