import os
from datetime import datetime
from typing import Optional
from urllib.parse import quote_plus

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from sqlalchemy import Boolean, DateTime, Integer, String, create_engine, select
from sqlalchemy.orm import DeclarativeBase, Mapped, Session, mapped_column

load_dotenv()

server = os.getenv("DB_SERVER", r"localhost\SQLEXPRESS")
database = os.getenv("DB_NAME", "TodoDB")
trust_cert = os.getenv("DB_TRUST_CERT", "yes")
connection_string = (
    "DRIVER={ODBC Driver 18 for SQL Server};"
    f"SERVER={server};DATABASE={database};Trusted_Connection=yes;"
    f"Encrypt=yes;TrustServerCertificate={trust_cert};"
)
database_url = os.getenv("DATABASE_URL")

if database_url:
    # Use Neon PostgreSQL when DATABASE_URL is configured
    if database_url.startswith("postgresql://"):
        database_url = database_url.replace(
            "postgresql://",
            "postgresql+psycopg://",
            1
        )

    engine = create_engine(
        database_url,
        pool_pre_ping=True,
    )

else:
    # Continue using local Microsoft SQL Server
    engine = create_engine(
        "mssql+pyodbc:///?odbc_connect=" + quote_plus(connection_string),
        pool_pre_ping=True,
    )


class Base(DeclarativeBase):
    pass


class Todo(Base):
    __tablename__ = "todos"
    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str] = mapped_column(String(1000), default="", nullable=False)
    completed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.now, nullable=False)


class TodoCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = Field(default="", max_length=1000)


class TodoUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    description: Optional[str] = Field(default=None, max_length=1000)
    completed: Optional[bool] = None


class TodoOut(BaseModel):
    id: int
    title: str
    description: str
    completed: bool
    created_at: datetime
    model_config = {"from_attributes": True}


app = FastAPI(title="Todo API")
origins = [x.strip() for x in os.getenv("CORS_ORIGINS", "http://localhost:5173").split(",") if x.strip()]
app.add_middleware(CORSMiddleware, allow_origins=origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])


@app.on_event("startup")
def initialize_database():
    Base.metadata.create_all(bind=engine)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/todos", response_model=list[TodoOut])
def get_todos():
    with Session(engine) as session:
        return session.scalars(select(Todo).order_by(Todo.id.desc())).all()


@app.post("/todos", response_model=TodoOut, status_code=201)
def add_todo(payload: TodoCreate):
    title = payload.title.strip()
    if not title:
        raise HTTPException(422, "Task title cannot be empty")
    with Session(engine) as session:
        todo = Todo(title=title, description=payload.description.strip())
        session.add(todo)
        session.commit()
        session.refresh(todo)
        return todo


@app.patch("/todos/{todo_id}", response_model=TodoOut)
def update_todo(todo_id: int, payload: TodoUpdate):
    with Session(engine) as session:
        todo = session.get(Todo, todo_id)
        if todo is None:
            raise HTTPException(404, "Task not found")
        updates = payload.model_dump(exclude_unset=True)
        if "title" in updates:
            if updates["title"] is None or not updates["title"].strip():
                raise HTTPException(422, "Task title cannot be empty")
            updates["title"] = updates["title"].strip()
        if "description" in updates:
            updates["description"] = (updates["description"] or "").strip()
        if "completed" in updates and updates["completed"] is None:
            raise HTTPException(422, "Completed must be true or false")
        for key, value in updates.items():
            setattr(todo, key, value)
        session.commit()
        session.refresh(todo)
        return todo


@app.delete("/todos/{todo_id}", status_code=204)
def delete_todo(todo_id: int):
    with Session(engine) as session:
        todo = session.get(Todo, todo_id)
        if todo is None:
            raise HTTPException(404, "Task not found")
        session.delete(todo)
        session.commit()
