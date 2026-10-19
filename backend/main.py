from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from . import models
from .database import Base, engine, get_db


@asynccontextmanager
async def lifespan(_app: FastAPI):
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    yield
    await engine.dispose()


app = FastAPI(title="Friend Note Vault API", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class NoteCreate(BaseModel):
    title: str
    content: str


class NoteResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    title: str
    content: str
    created_at: datetime


@app.post("/api/notes", response_model=NoteResponse)
async def create_note(
    note_data: NoteCreate,
    db: AsyncSession = Depends(get_db),
):
    note = models.Note(title=note_data.title, content=note_data.content)
    db.add(note)
    await db.commit()
    await db.refresh(note)
    return note


@app.get("/api/notes", response_model=list[NoteResponse])
async def read_notes(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(models.Note).order_by(models.Note.id.desc()))
    return result.scalars().all()