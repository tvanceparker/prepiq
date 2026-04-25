from fastapi import APIRouter, Depends, File, UploadFile

from app.api.dependencies import get_assistant_service, oauth2_scheme
from app.schemas.assistant_dto import (
    AssistantDocumentDTO,
    AssistantDocumentUploadResponseDTO,
    AssistantQueryRequestDTO,
    AssistantQueryResponseDTO,
    AssistantReindexResponseDTO,
)
from app.services.assistant_service import AssistantService
from app.utils.logger_helpers import log_route


router = APIRouter(prefix="/assistant", tags=["Assistant"])


@router.post("/query", response_model=AssistantQueryResponseDTO)
@log_route("Assistant Query")
async def query_assistant(
    payload: AssistantQueryRequestDTO,
    token: str = Depends(oauth2_scheme),
    assistant_service: AssistantService = Depends(get_assistant_service),
):
    return await assistant_service.query(payload, raw_token=token)


@router.get("/documents", response_model=list[AssistantDocumentDTO])
@log_route("Assistant List Documents")
async def list_assistant_documents(
    assistant_service: AssistantService = Depends(get_assistant_service),
):
    return await assistant_service.list_uploaded_documents()


@router.post("/documents/upload", response_model=AssistantDocumentUploadResponseDTO)
@log_route("Assistant Upload Document")
async def upload_assistant_document(
    file: UploadFile = File(...),
    assistant_service: AssistantService = Depends(get_assistant_service),
):
    return await assistant_service.upload_document(file)


@router.post("/reindex", response_model=AssistantReindexResponseDTO)
@log_route("Assistant Reindex")
async def reindex_assistant_documents(
    assistant_service: AssistantService = Depends(get_assistant_service),
):
    return await assistant_service.reindex_documents()