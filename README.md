# IQT-FSD-2026 — Full-Stack Task Manager

A responsive task manager built for the IQT Full-Stack Developer assessment.
Users can **add, edit, delete, and mark tasks as completed**; tasks are persisted in **PostgreSQL** through a **REST API**.
The app also integrates a **public weather API (Open-Meteo)** shown in a sidebar widget.

| Layer     | Tech                                   |
|-----------|----------------------------------------|
| Front-end | React 19 + Vite (plain CSS, responsive) |
| Back-end  | Node.js 20 + Express 5                 |
| Database  | PostgreSQL 16 (`pg` driver)            |
| Public API| Open-Meteo geocoding + forecast        |

- **GitHub:** https://github.com/Usama-Akbar/iqt-fsd-2026-task-manager
- **Live demo:** not hosted; run locally in about 2 minutes (see below), or deploy with the included `render.yaml`

![Desktop](docs/screenshots/desktop.png)

---

## Project structure

```
.
├── client/                 React app (Vite)
│   └── src/
│       ├── App.jsx         Task list, add form, filters
│       ├── TaskItem.jsx    Single task: complete / edit / delete
│       ├── WeatherWidget.jsx  Public API integration UI
│       └── api.js          Fetch wrapper for the REST API
├── server/                 Express API
│   ├── db/schema.sql       Database schema (auto-applied on start)
│   └── src/
│       ├── index.js        App setup, security middleware, static hosting
│       ├── db.js           pg connection pool + migration
│       └── routes/
│           ├── tasks.js    CRUD endpoints
│           └── weather.js  Open-Meteo proxy
├── docs/
│   ├── ANSWERS.md          Step 4 — code review & architecture answers
│   └── screenshots/
└── render.yaml             One-click deploy blueprint (Render)
```

## Setup instructions

**Prerequisites:** Node.js ≥ 20.19 and PostgreSQL ≥ 13.

```bash
# 1. Clone
git clone https://github.com/Usama-Akbar/iqt-fsd-2026-task-manager.git && cd iqt-fsd-2026-task-manager

# 2. Create the database
createdb iqt_tasks

# 3. Configure the API
cp server/.env.example server/.env    # edit DATABASE_URL if needed

# 4. Install dependencies
npm run install:all

# 5. Run in development (two terminals)
npm run dev:server    # API on http://localhost:4000 (creates the table automatically)
npm run dev:client    # UI on http://localhost:5173 (proxies /api to :4000)
```

**Production mode** (single process — Express serves the built React app):

```bash
npm run build && npm start            # http://localhost:4000
```

### Environment variables (`server/.env`)

| Variable       | Example                                   | Notes                                      |
|----------------|-------------------------------------------|--------------------------------------------|
| `PORT`         | `4000`                                    |                                            |
| `DATABASE_URL` | `postgres://user:pass@localhost:5432/iqt_tasks` | Any PostgreSQL connection string     |
| `DATABASE_SSL` | `false`                                   | `true` for hosted Postgres (Neon/Render/RDS) |
| `CORS_ORIGIN`  | `https://app.example.com`                 | Optional, comma-separated allow-list       |

## Database schema

```sql
CREATE TABLE IF NOT EXISTS tasks (
  id           SERIAL PRIMARY KEY,
  title        VARCHAR(200) NOT NULL CHECK (char_length(trim(title)) > 0),
  description  TEXT         NOT NULL DEFAULT '',
  completed    BOOLEAN      NOT NULL DEFAULT FALSE,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks (created_at DESC);
```

| Column        | Type          | Description                          |
|---------------|---------------|--------------------------------------|
| `id`          | SERIAL (PK)   | Auto-increment identifier            |
| `title`       | VARCHAR(200)  | Required, non-blank                  |
| `description` | TEXT          | Optional details                     |
| `completed`   | BOOLEAN       | Completion status, default `false`   |
| `created_at`  | TIMESTAMPTZ   | Set on insert                        |
| `updated_at`  | TIMESTAMPTZ   | Refreshed on every update            |

The schema lives in [`server/db/schema.sql`](server/db/schema.sql) and is applied automatically when the server starts.

## REST API

Base URL: `/api`

| Method | Endpoint          | Body                                          | Success        | Errors          |
|--------|-------------------|-----------------------------------------------|----------------|-----------------|
| GET    | `/tasks`          | —                                             | `200` Task[]   |                 |
| POST   | `/tasks`          | `{ title, description?, completed? }`         | `201` Task     | `400`           |
| PUT    | `/tasks/:id`      | any of `{ title, description, completed }`    | `200` Task     | `400`, `404`    |
| DELETE | `/tasks/:id`      | —                                             | `204`          | `400`, `404`    |
| GET    | `/weather?city=`  | —                                             | `200` Weather  | `400`, `404`, `502` |
| GET    | `/health`         | —                                             | `200`          |                 |

```bash
curl -X POST localhost:4000/api/tasks -H 'Content-Type: application/json' \
     -d '{"title":"Buy milk","description":"2 litres"}'
curl -X PUT localhost:4000/api/tasks/1 -H 'Content-Type: application/json' -d '{"completed":true}'
curl -X DELETE localhost:4000/api/tasks/1
```

All queries are parameterised; input is validated (type, required, length) and errors return `{ "error": "..." }`.

## Public API integration (Step 3)

**API used:** [Open-Meteo](https://open-meteo.com) — Geocoding API + Forecast API (free, no API key).

**Implementation:**
1. The React `WeatherWidget` calls our own backend: `GET /api/weather?city=Lahore`.
2. `server/src/routes/weather.js` geocodes the city name to latitude/longitude via
   `geocoding-api.open-meteo.com`, then fetches current conditions from `api.open-meteo.com/v1/forecast`.
3. The backend maps the WMO weather code to readable text, returns a small normalised payload
   (temperature, feels-like, humidity, wind, condition), and caches each city for 10 minutes.
4. Requests time out after 8 s; upstream failures return `502`, unknown cities `404`, and the UI shows the error message.

Proxying through the backend keeps the browser on one origin (strict CSP via Helmet), lets us cache
responses, and means a keyed provider (e.g. OpenWeather) could be swapped in without exposing the key to the client.

![Weather integration](docs/screenshots/api-integration.png)

## Responsive design

The two-column desktop layout collapses to a single column under 760 px (weather card moves to the top,
task actions wrap below the text). Light and dark themes follow the OS setting.

<img src="docs/screenshots/mobile.png" width="300" alt="Mobile view" />

## Step 4 — Code review & architecture

See [docs/ANSWERS.md](docs/ANSWERS.md).
