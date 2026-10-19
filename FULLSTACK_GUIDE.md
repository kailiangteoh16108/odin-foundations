# Full-Stack Development Guide: Friend Note Vault

This guide teaches the main ideas behind a full-stack web app by following this repository's note-saving app from the browser all the way to the database. It assumes you are new to full-stack development, but it also gives you a repeatable process for building your next feature.

## 1. What "full stack" means

A web app usually has three parts:

- **Frontend:** the code running in the user's browser. It displays the interface, responds to clicks, and sends requests. This project uses React, TypeScript, and Vite.
- **Backend:** the server-side code. It receives requests, checks data, applies application rules, and talks to the database. This project uses FastAPI and Python.
- **Database:** persistent storage. It keeps data after a browser refresh or server restart. This project uses SQLite through SQLAlchemy.

The browser and server are separate programs. They communicate using HTTP, most often sending and receiving JSON.

## 2. The project layout

```text
.
├── backend/
│   ├── database.py       # Database engine, sessions, and shared ORM base
│   ├── main.py           # FastAPI app and HTTP endpoints
│   ├── models.py         # SQLAlchemy database table definitions
│   └── requirements.txt  # Python dependencies
├── frontend/
│   ├── index.html        # Browser document shell
│   ├── package.json      # JavaScript dependencies and npm scripts
│   ├── package-lock.json # Exact dependency resolution for npm
│   ├── vite.config.ts    # Vite development server and API proxy
│   └── src/
│       ├── App.tsx       # Note form, state, and note list
│       ├── index.css     # App styles
│       └── main.tsx      # React entry point
└── README.md             # Short setup and run instructions
```

The root directory does not contain a `package.json`. npm commands for the frontend must run from `frontend/`. This is why running `npm run dev` from the project root reports that it cannot find `package.json`.

## 3. Run the app locally

The backend and frontend are separate servers. Run them in two terminals, leaving both running while you use the app.

### Terminal 1: backend

From the repository root:

```sh
python -m venv .venv
source .venv/bin/activate
python -m pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

The virtual environment commands are needed the first time. Later, activate it and start Uvicorn:

```sh
source .venv/bin/activate
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

`uvicorn backend.main:app` means: load the `app` object from the `backend.main` Python module. Run that command from the repository root so Python can find the `backend` package.

### Terminal 2: frontend

From the repository root:

```sh
cd frontend
npm install
npm run dev -- --host 0.0.0.0 --port 3000
```

`npm install` reads `frontend/package.json` and installs dependencies. `npm run dev` runs the `dev` script defined there. Open the URL Vite prints, normally `http://localhost:3000`.

For phone or emulator access, `--host 0.0.0.0` lets Vite listen beyond the loopback interface. It does not make the app safe to expose publicly.

### Useful URLs

- Frontend: `http://localhost:3000`
- Backend API docs: `http://127.0.0.1:8000/docs`
- Notes endpoint: `http://127.0.0.1:8000/api/notes`

### Build the frontend

Run this from `frontend/`, not the project root:

```sh
npm run build
```

This runs TypeScript checking and creates a production bundle in `frontend/dist/`. A successful build checks the frontend code and bundling; it does not prove that the backend or database works.

## 4. Follow one note through the whole app

When you save a note, the data takes this path:

```text
User fills form
    ↓
React state in frontend/src/App.tsx
    ↓ POST /api/notes (JSON over HTTP)
Vite forwards /api to FastAPI on port 8000
    ↓
FastAPI validates the request and creates a SQLAlchemy Note
    ↓
SQLite stores the row in notes.db
    ↓ JSON response returns to the browser
React reloads the note list and renders it
```

This flow is the central full-stack idea: each layer has a specific responsibility, and they agree on the request URL and data shape.

### Frontend: interface and HTTP requests

In [`frontend/src/App.tsx`](frontend/src/App.tsx), the `App` component owns the note form and list. React state such as `title`, `content`, and `notes` controls what the user sees.

The app sends requests to:

```ts
const API_URL = '/api/notes';
```

When the form is submitted, the frontend sends a JSON body similar to:

```json
{
  "title": "A useful idea",
  "content": "Details to remember"
}
```

The browser's `fetch` function sends the request. `method: 'POST'` means the client is asking the server to create something. The `Content-Type: application/json` header tells the server how to interpret the body. When the request succeeds, the frontend clears the form and fetches the list again.

The `Note` TypeScript interface describes the data the frontend expects to receive:

```ts
interface Note {
  id: number;
  title: string;
  content: string;
  created_at: string;
}
```

This helps catch frontend mistakes during the build. It does not validate data sent over the network; server-side validation is still required.

### Vite: local development and proxy

In [`frontend/vite.config.ts`](frontend/vite.config.ts), Vite forwards requests beginning with `/api` to `http://127.0.0.1:8000`.

That means the browser requests `/api/notes` from the frontend origin, and Vite relays it to FastAPI during development. This avoids hardcoding a different backend URL throughout the UI and avoids many local cross-origin issues.

The proxy only runs in Vite's development server. A production deployment needs a web server or hosting configuration that routes `/api` to the backend.

### Backend: API endpoints and validation

In [`backend/main.py`](backend/main.py), FastAPI defines two endpoints:

- `GET /api/notes` returns the saved notes.
- `POST /api/notes` validates the submitted title and content, saves a note, and returns it.

The `NoteCreate` Pydantic model describes valid incoming data. FastAPI parses the JSON body and returns a validation error for a request with the wrong shape. The `NoteResponse` model describes the response, including the generated ID and timestamp.

`GET` is used to read data. `POST` is used here to create data. Other common methods are `PUT` or `PATCH` for updating and `DELETE` for removing data.

The `get_db` dependency supplies a database session to an endpoint. The endpoint uses that session instead of opening a separate connection itself. FastAPI dependencies are a way to share setup and cleanup logic.

### Database: model, session, and persistence

[`backend/models.py`](backend/models.py) defines the `Note` SQLAlchemy model. It describes a `notes` table with an integer ID, title, content, and creation time.

[`backend/database.py`](backend/database.py) creates the async database engine and session factory. The default URL is:

```text
sqlite+aiosqlite:///./notes.db
```

The SQLite file is created relative to the directory where Uvicorn is started. Start Uvicorn from the repository root to keep the database at the project root as documented. The FastAPI startup lifespan creates missing tables from the models.

SQLite is a good simple default for learning and local development. For production or multiple concurrent app instances, a managed database such as PostgreSQL is usually a better fit.

## 5. Understand the important configuration files

### `package.json` and `package-lock.json`

`frontend/package.json` lists frontend dependencies and scripts. The lockfile records the resolved dependency tree so installs are reproducible. The lockfile does not define npm scripts and cannot replace `package.json`.

Useful scripts in this project:

- `npm run dev`: start the Vite development server.
- `npm run build`: type-check and bundle the frontend.
- `npm run preview`: locally preview a built frontend.

### `requirements.txt`

`backend/requirements.txt` lists Python packages. Install them in the active virtual environment with:

```sh
python -m pip install -r backend/requirements.txt
```

If an import such as `aiosqlite` is missing, this is the normal fix. Be sure the virtual environment is activated before installing and running the backend.

### `.gitignore`

Generated or local-only items such as `node_modules/`, `frontend/dist/`, virtual environments, and local database files should not normally be committed. The source files and dependency manifests should be committed.

## 6. A reliable feature-building workflow

Use this sequence whenever you add a feature:

1. **Describe the behavior.** Example: “A user can delete one saved note after confirming.” Decide what should happen on success and failure.
2. **Define the data contract.** Decide the endpoint, HTTP method, request fields, response, and error cases. For deletion, a reasonable endpoint is `DELETE /api/notes/{note_id}`.
3. **Change the backend.** Add validation or a request model if needed, implement the endpoint, and use the database session. Handle missing IDs with a clear `404 Not Found` response.
4. **Change the frontend.** Add a button or form, call the endpoint with `fetch`, check `response.ok`, and update or reload React state.
5. **Check both layers.** Use the API docs or an HTTP request to test the backend. Run `npm run build` in `frontend/` to catch TypeScript and bundling errors.
6. **Test the full flow.** Start both servers, use the UI, refresh the browser, and confirm the data behaves as expected.
7. **Review the change.** Check error states, empty states, input validation, mobile layout, and whether any generated files or secrets were accidentally added.

For a new field, update all relevant layers together: the SQLAlchemy model, request/response schema, frontend TypeScript type, form, and display. Updating only the UI type does not add a database column.

## 7. Test and debug

### Test the API manually

With the backend running, open `http://127.0.0.1:8000/docs`. FastAPI's interactive docs let you inspect and try each endpoint.

You can also use `curl`:

```sh
curl http://127.0.0.1:8000/api/notes
```

Create a note:

```sh
curl -X POST http://127.0.0.1:8000/api/notes \
  -H 'Content-Type: application/json' \
  -d '{"title":"Test note","content":"Hello from the API"}'
```

Then request the list again. The new note should still exist after a browser refresh because the backend stored it in SQLite.

### Use the error to find the failing layer

- **npm says it cannot find `package.json`:** check your current directory. Use `cd frontend` before npm commands.
- **Vite loads but notes fail:** check that Uvicorn is running on port 8000, then inspect the browser Network panel and the backend terminal.
- **The browser shows a proxy error:** check `frontend/vite.config.ts` and confirm the backend URL and port match the running server.
- **Python says a module is missing:** activate the intended virtual environment and install `backend/requirements.txt`.
- **The backend cannot import `backend.main`:** run Uvicorn from the repository root using `uvicorn backend.main:app ...`.
- **A request returns `422`:** FastAPI rejected the request body; compare its JSON fields and types with the Pydantic model and the validation detail in the response.
- **A request returns `500`:** inspect the backend terminal traceback. The browser usually only sees the HTTP failure, while the server log shows the underlying exception.
- **The TypeScript build fails:** run `npm run build` from `frontend/` and read the first compiler error; its file and line usually identify the mismatch.

When debugging, first reproduce the issue, identify whether it is in the browser, network, server, or database, and change one small thing at a time.

## 8. What this app does not do yet

The current app can create and list notes. It does not currently provide:

- Editing or deleting notes.
- User accounts, login, or per-user access control.
- Encryption or protection for sensitive note contents.
- Database migrations for changing an existing schema.
- A production deployment configuration.

The name “Friend Note Vault” does not mean the notes are private or secure. Anyone who can access the running API may be able to read or create notes. Keep it local while learning; do not put secrets or sensitive personal data in it, and do not expose the development servers to the public internet.

For a real multi-user app, plan authentication and authorization, input and rate limits, HTTPS, secure secret management, database backups, and a production deployment. For schema changes after you have real data, learn database migrations (commonly Alembic for SQLAlchemy) instead of relying only on `create_all`.

## 9. A learning path

Try these in order so each step builds on concepts already used here:

1. Change the form labels and empty state in `frontend/src/App.tsx`; adjust the styles in `frontend/src/index.css`.
2. Add a character counter using React state derived from the note content.
3. Add a title-length limit in both the frontend and a Pydantic backend validator. Frontend checks improve usability; backend checks are authoritative.
4. Add `DELETE /api/notes/{note_id}` and a delete button. Handle missing IDs and reload the list after success.
5. Add note editing with a `PATCH` endpoint and a small edit form.
6. Add search. Start with filtering the notes already loaded in the browser, then consider a query parameter such as `GET /api/notes?q=...` for server-side search.
7. Add automated tests for API success and error cases, then add frontend interaction tests.
8. Learn Alembic migrations, PostgreSQL, authentication, and deployment after the local app's request flow feels comfortable.

## 10. The mental model to keep

A full-stack feature is complete when the browser, API, and data layer agree:

- The **frontend** presents a usable interaction and handles loading, success, and error states.
- The **API** defines a clear HTTP contract and validates untrusted input.
- The **database layer** persists valid data and handles the app's data model.
- The **development setup** lets you run and verify all layers independently and together.

When something breaks, follow the data path one hop at a time: UI event → HTTP request → API endpoint → database session → response → UI state. That turns “the app is broken” into a much smaller question you can investigate and fix.
