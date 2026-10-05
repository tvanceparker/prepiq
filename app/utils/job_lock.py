"""MySQL connection-owned locks survive stage commits and release on disconnect."""
from contextlib import asynccontextmanager
import asyncio
from contextvars import ContextVar
from functools import wraps
from sqlalchemy import text
from fastapi import HTTPException


_held_locks = ContextVar("prepiq_held_job_locks", default=frozenset())


@asynccontextmanager
async def job_lock(db, restaurant_id, job):
    engine = getattr(db, "bind", None)
    # SQLite is used for isolated regression tests; production uses MySQL.
    if getattr(getattr(engine, 'dialect', None), 'name', None) != 'mysql':
        yield
        return
    name = f'prepiq:{restaurant_id}:planning'
    key = (name, asyncio.current_task())
    if key in _held_locks.get():
        yield
        return
    async with engine.connect() as connection:
        acquired = await connection.scalar(text('SELECT GET_LOCK(:name, 0)'), {'name': name})
        if acquired != 1:
            raise HTTPException(status_code=409, detail=f'{job} is already running for this restaurant')
        token = _held_locks.set(_held_locks.get() | {key})
        try:
            yield
        finally:
            _held_locks.reset(token)
            await connection.execute(text('SELECT RELEASE_LOCK(:name)'), {'name': name})


def serialized_job(job):
    def decorate(method):
        @wraps(method)
        async def wrapped(self, *args, **kwargs):
            async with job_lock(self.db, self.restaurant_id, job):
                return await method(self, *args, **kwargs)
        return wrapped
    return decorate
