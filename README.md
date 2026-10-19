# Friend Note Vault

## Backend

From the repository root, create and activate a Python virtual environment, then install dependencies:

```sh
python -m venv .venv
source .venv/bin/activate
python -m pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --host 0.0.0.0 --port 8000
```

The API uses SQLite by default and creates `notes.db` in the repository root. Set `DATABASE_URL` to use another SQLAlchemy async database URL. For PostgreSQL, install `asyncpg` and set a URL such as `postgresql+asyncpg://user:password@localhost:5432/dbname`.

API documentation is available at `http://127.0.0.1:8000/docs`.

## Frontend

In another terminal:

```sh
cd frontend
npm install
npm run dev -- --host 0.0.0.0 --port 3000
```

Open `http://localhost:3000`. Vite proxies `/api` requests to the backend on port 8000.