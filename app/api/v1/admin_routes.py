# app/routes/admin_routes.py
from fastapi import APIRouter, Depends, HTTPException, Query, status, Body, Path
from app.schemas.admin_dto import (TenantInfoResponse, TenantInfoUpdateRequest, 
                                   ActivityLogResponse,EndOfDayCheckResponse,
                                     PermissionOut, RoleWithPermissionsDTO,
                                      CreateEmployeeDTO, UpdateEmployeeDTO,EmployeeOutDTO, RoleOutDTO, 
                                      RolesSyncRequestDTO, DeleteRoleResponseDTO )

from app.services.admin_service import AdminService
from app.api.dependencies import get_admin_service, check_permissions
from typing import List
from datetime import date
from app.utils.logger_helpers import log_route


router = APIRouter(prefix="/admin", tags=["Admin"])

@router.get("/tenant_info", response_model=TenantInfoResponse,
            dependencies=[Depends(check_permissions(["tenant_info"]))])
@log_route("Get Tenant Info")
async def get_tenant_info(service: AdminService = Depends(get_admin_service)):
    data = await service.get_tenant_info()
    if data is None:
        raise HTTPException(status_code=404, detail="Tenant not found")
    return data


@router.put("/tenant_info", response_model=TenantInfoResponse,
            dependencies=[Depends(check_permissions(["tenant_info"]))])
@log_route("Update Tenant Info")
async def update_tenant_info(
    payload: TenantInfoUpdateRequest,
    service: AdminService = Depends(get_admin_service)
):
    try:
        await service.update_tenant_info(payload)
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to update tenant info")

    tenant_info = await service.get_tenant_info()
    return tenant_info

@router.get("/activity_logs", response_model=List[ActivityLogResponse],
            dependencies=[Depends(check_permissions(["activity_logs"]))])
@log_route("Get Activity Logs")
async def get_activity_logs(
    skip: int = 0,
    limit: int = 0,
    service: AdminService = Depends(get_admin_service)
):
    return await service.get_activity_logs(skip=skip, limit=limit)

@router.post("/run_sales_data_check",
             dependencies=[Depends(check_permissions(["system_check"]))])
@log_route("Run sales data check")
async def run_sales_data_check(
    service: AdminService = Depends(get_admin_service)
):
    try:
        alerts = await service.check_sales_data_quality()
        if alerts is None:
            alerts = []  # fallback safeguard
        return {"status": "success", "alerts_created": len(alerts)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
@router.get("/check_end_of_day_writes", response_model=EndOfDayCheckResponse,
            dependencies=[Depends(check_permissions(["system_check"]))])
@log_route("Check End-of-Day Writes")
async def check_end_of_day_writes(
    check_date: date = Query(..., description="Date to check end-of-day writes for"),
    service: AdminService = Depends(get_admin_service)
):
    try:
        results = await service.check_end_of_day_writes(check_date)
        return results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    


@router.get("/roles-with-permissions", response_model=List[RoleWithPermissionsDTO])
@log_route("List Roles with Permissions")
async def list_roles_with_permissions(
    service: AdminService = Depends(get_admin_service)
):
    return await service.get_all_roles_with_permissions()

# List all permissions
@router.get("/permissions", response_model=List[PermissionOut])
@log_route("List All Permissions")
async def list_all_permissions(
    service: AdminService = Depends(get_admin_service)
):
    return await service.list_all_permissions()

@router.put("/roles/sync", dependencies=[Depends(check_permissions(["roles"]))])
@log_route("Sync Roles")
async def sync_roles(
    dto: RolesSyncRequestDTO,
    service: AdminService = Depends(get_admin_service)
):
    return await service.sync_roles_and_permissions(dto.roles, dto.deleted_roles)


@router.post("/employees",dependencies=[Depends(check_permissions(["employees"]))])
@log_route("Create Employees")
async def create_employee(dto: CreateEmployeeDTO, service: AdminService = Depends(get_admin_service)):
    return await service.create_employee(dto)

@router.patch("/employees/{employee_id}",dependencies=[Depends(check_permissions(["employees"]))])
@log_route("Update Employee")
async def update_employee(
    employee_id: int,
    dto: UpdateEmployeeDTO = Body(...),
    svc: AdminService = Depends(get_admin_service)
):
    return await svc.update_employee(employee_id, dto)

@router.delete("/employees/{employee_id}",dependencies=[Depends(check_permissions(["employees"]))])
@log_route("Disable Employee")
async def disable_employee(employee_id: int, svc: AdminService = Depends(get_admin_service)):
    return await svc.disable_employee(employee_id)

@router.get("/employees", response_model=List[EmployeeOutDTO],dependencies=[Depends(check_permissions(["employees"]))])
@log_route("List All Employees")
async def list_employees(service: AdminService = Depends(get_admin_service)):
    return await service.get_all_employees()

@router.get("/roles", response_model=List[RoleOutDTO],
            dependencies=[Depends(check_permissions(["roles"]))])
@log_route("List Roles")
async def list_roles(service: AdminService = Depends(get_admin_service)):
    return await service.get_roles()

@router.delete("/roles/{role_id}",
               dependencies=[Depends(check_permissions(["roles"]))],
               response_model=DeleteRoleResponseDTO)
@log_route("Delete Role Cleanup")
async def delete_role_cleanup(
    role_id: int = Path(..., description="ID of the role to delete"),
    svc: AdminService = Depends(get_admin_service)
):
    return await svc.delete_role_cleanup(role_id)
