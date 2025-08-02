def to_dict(obj) -> dict:
        # Convert SQLAlchemy ORM model to plain dict
    if not obj:
        return {}
    return {c.key: getattr(obj, c.key) for c in obj.__table__.columns}