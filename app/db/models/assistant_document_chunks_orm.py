from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, JSON, String, Text
from sqlalchemy.orm import relationship

from app.db.session import Base


class AssistantDocumentChunk(Base):
    __tablename__ = "assistant_document_chunks"

    chunk_id = Column(Integer, primary_key=True, index=True)
    restaurant_id = Column(Integer, ForeignKey("restaurants.restaurant_id"), nullable=False, index=True)
    document_id = Column(Integer, ForeignKey("assistant_documents.document_id"), nullable=False, index=True)
    chunk_index = Column(Integer, nullable=False)
    heading_trail = Column(JSON, default=list)
    chunk_checksum = Column(String(64), nullable=False, index=True)
    text = Column(Text, nullable=False)
    token_count = Column(Integer, nullable=False, default=0)
    embedding = Column(JSON, nullable=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    document = relationship("AssistantDocument", back_populates="chunks")
