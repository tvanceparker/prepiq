from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import relationship

from app.db.session import Base


class AssistantDocument(Base):
    __tablename__ = "assistant_documents"

    document_id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.restaurant_id"), nullable=False, index=True)
    source_type = Column(String(24), nullable=False, index=True)
    display_name = Column(String(255), nullable=False)
    source_path = Column(Text, nullable=True)
    storage_path = Column(Text, nullable=True)
    content_type = Column(String(120), nullable=True)
    content_hash = Column(String(64), nullable=False, index=True)
    metadata_json = Column(JSON, default=dict)
    is_uploaded = Column(Boolean, default=False)
    index_status = Column(String(24), nullable=False, default="pending")
    last_error = Column(Text, nullable=True)
    indexed_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    chunks = relationship(
        "AssistantDocumentChunk",
        back_populates="document",
        cascade="all, delete-orphan",
    )
