# CarCareLog

Cornell SYSEN 5151 - Team 18

Lian Chen, Ruitong Geng, Zhihao Chen, Yunyi Zhao, Zeyu Zhang

## About the project

CarCareLog helps vehicle owners keep their maintenance and repair history in one place. Owners can record completed work, check spending and see when a configured service is due. The project addresses a common problem: receipts and service details are scattered across paper copies, emails and personal notes.

Our Innoslate model also includes receipt-assisted entry and questions answered from vehicle records or manual information. This repository contains the first local prototype. It currently supports manual entry and two predefined history questions. Receipt processing and external AI calls are still to be added.

## System boundary

The system of interest is the CarCareLog application. The model places the Web Interface, Application Service, Vehicle Record Store, Reminder Engine, Analytics Dashboard and AI Assistant inside its boundary. In this prototype, the frontend provides the interface and dashboard, while the Python backend handles storage, reminders and history lookup. These model elements are not all separate software modules yet.

The owner supplies vehicle details, current mileage, service costs and maintenance intervals. CarCareLog stores and uses that information; it does not read mileage from the vehicle or estimate repair prices. Mechanical diagnosis, repair work and booking appointments are outside the project scope. Repair-shop and buyer portals are also outside the initial scope.

## External actors and systems

The following names match the system context model:

| Model entity | Interaction with CarCareLog |
| --- | --- |
| Vehicle Owner | Enters and confirms records, updates mileage, reviews reminders and expenses, asks questions and exports history. |
| Service Provider | Supplies service receipts and information. In the initial workflow, the owner brings this information into CarCareLog; the provider does not need a CarCareLog account or a direct software connection. |
| AI Model Runtime | Planned external service for proposing receipt fields and answering questions from supplied records or manual information. This prototype makes no requests to it and needs no API key. |

The application operator and development team are support stakeholders. The AI service provider representative is a stakeholder associated with the external runtime, rather than the runtime itself.

## Use cases and current coverage

These are the four use cases in our model:

| Use case | Current prototype |
| --- | --- |
| UC.1 Manage Maintenance Records | Add, edit, delete and search confirmed records for a selected vehicle; export history to CSV. Receipt upload and AI field proposals are pending. |
| UC.2 Review Maintenance Reminders | Set mileage or month intervals with a manual reference, then review the calculated status. Changes to mileage or service history update the reminders. |
| UC.3 Review Maintenance Expenses | Review total recorded costs and monthly spending by Maintenance or Repair category. Costs come from saved records. |
| UC.4 Ask Questions About Vehicle Records | Look up the last recorded oil change or total recorded cost, with source record IDs. Free-text AI questions and manual-based answers are pending. |

The working path is: select a vehicle, enter and confirm a service record, save it, then review the updated history, expenses and reminders. This covers the manual-entry part of UC.1. The modeled receipt-to-AI-to-owner-confirmation path is not implemented yet.

Requirement IDs and remaining work are recorded in [MVP scope](docs/MVP_SCOPE.md). For example, EN01 leads to SR01 and SR02, which concern record management and retrieval under UC.1. The forms and API operations in this repository exercise that part of the model. Full requirement acceptance has not been established by this prototype.

## Run the application

You need Python 3.10 or later and a web browser. No extra Python packages are required.

1. Download the project ZIP and extract it, or clone the repository branch containing this prototype.
2. Open the extracted project folder. You should see `backend`, `frontend` and `README.md`.
3. Open a terminal in that folder and run the command for your computer.

**Windows**

In File Explorer, press Alt+D, type `cmd` and press Enter. In the command window, run:

```bat
py backend/app.py
```

If `py` is unavailable but Python is on your PATH, use:

```bat
python backend/app.py
```

**macOS or Linux**

```bash
python3 backend/app.py
```

4. Keep the terminal open and visit [http://127.0.0.1:8000](http://127.0.0.1:8000).
5. Click **Add vehicle** to enter your own vehicle, or **Load demo data** to try the example records in an empty database.

Press Ctrl+C in the terminal to stop the application. Saved records remain available when you start it again. The address is local to the computer running the backend; another computer must start its own copy to use that address.

## Data and prototype limits

Data is stored in `data/carcare.db` using SQLite. This file is excluded from Git. To back up the data, stop the application and copy the database file. Keep it when moving the project to another folder. CSV export includes confirmed service records, but is not a full database backup.

Mileage is currently entered in kilometers and costs in USD. The owner enters the interval and its vehicle-manual reference; the application does not retrieve or verify the manual. Demo intervals are examples. Reminders appear on the page, with no email or phone notifications.

The current upcoming-service window is 30 days or 1,000 km. The requirements document specifies 30 days or 500 miles, so the distance window needs to be reconciled before SR08 acceptance testing.

The server listens on `127.0.0.1` and is intended for one local user. Owner login and access control, receipt processing, external AI integration and automatic recovery are future work. Availability and usability targets still need validation.

Optional settings are `CARCARE_PORT` (default: `8000`) and `CARCARE_DB` (database path).

## Repository files

| File | Purpose |
| --- | --- |
| `backend/app.py` | HTTP API, SQLite storage, reminder calculations and history lookup |
| `frontend/index.html` | Page structure |
| `frontend/styles.css` | Page styling |
| `frontend/app.js` | Forms, API calls and dashboard updates |
| `tests/test_app.py` | Backend and API checks |
| `docs/MVP_SCOPE.md` | Requirement coverage and remaining work |

## Run the checks

From the project folder, run:

**Windows**

```bat
py -m unittest discover -s tests -v
```

**macOS or Linux**

```bash
python3 -m unittest discover -s tests -v
```

The checks use a temporary database and do not change your saved vehicle records.
