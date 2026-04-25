from enum import Enum
from typing import Any, List, Optional

from pydantic import BaseModel, Field


class AssistantRetrievalMode(str, Enum):
    structured = "structured"
    document = "document"
    blended = "blended"


class AssistantResponseStatus(str, Enum):
    scaffolded = "scaffolded"
    disabled = "disabled"
    not_configured = "not_configured"


class AssistantQueryRequestDTO(BaseModel):
    query: str = Field(..., min_length=1, max_length=2000)
    conversation_id: Optional[str] = Field(default=None, max_length=128)


class AssistantCitationDTO(BaseModel):
    source_type: str
    label: str
    path: Optional[str] = None
    snippet: Optional[str] = None
    timestamp: Optional[str] = None


class AssistantDocumentDTO(BaseModel):
    document_id: int
    source_type: str
    display_name: str
    source_path: Optional[str] = None
    index_status: str
    content_type: Optional[str] = None
    updated_at: Optional[str] = None
    indexed_at: Optional[str] = None


class AssistantDocumentUploadResponseDTO(BaseModel):
    document: AssistantDocumentDTO
    message: str


class AssistantReindexResponseDTO(BaseModel):
    scanned_count: int
    indexed_count: int
    warning_count: int
    warnings: List[str] = Field(default_factory=list)
    source_summary: str


class AssistantPendingActionDTO(BaseModel):
    tool: str
    audit_id: Optional[int] = None
    requires_confirmation: bool = True
    preview: Optional[dict[str, Any]] = None
    expires_at: Optional[str] = None


class AssistantActionResultDTO(BaseModel):
    tool: str
    status: str
    audit_id: Optional[int] = None
    idempotent_replay: bool = False


class AssistantQueryResponseDTO(BaseModel):
    status: AssistantResponseStatus
    retrieval_mode: AssistantRetrievalMode
    answer: str
    warnings: List[str] = Field(default_factory=list)
    citations: List[AssistantCitationDTO] = Field(default_factory=list)
    pending_action: Optional[AssistantPendingActionDTO] = None
    action_result: Optional[AssistantActionResultDTO] = None