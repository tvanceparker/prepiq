from fastapi import HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.repositories.restaurants_repo import RestaurantRepository
from app.repositories.permissions_repo import PermissionRepository
from app.repositories.role_permissions_repo import RolePermissionRepository
from app.repositories.roles_repo import RoleRepository
from app.services.utils.permissions import (
    DEFAULT_PERMISSIONS_BASIC, DEFAULT_ROLE_PERMISSIONS_BASIC,
    DEFAULT_PERMISSIONS_PRO, DEFAULT_ROLE_PERMISSIONS_PRO,
    DEFAULT_PERMISSIONS_MASTER, DEFAULT_ROLE_PERMISSIONS_MASTER,
    DEFAULT_ROLES_BASIC, DEFAULT_ROLES_PRO, DEFAULT_ROLES_MASTER
)

class PermissionUtil:
    @staticmethod
    async def update_permissions_for_all_restaurants(db: AsyncSession):
        restaurant_repo = RestaurantRepository(db, restaurant_id=None)

        # Tier-specific permissions and roles
        tier_permissions = {
            "basic": DEFAULT_PERMISSIONS_BASIC,
            "pro": DEFAULT_PERMISSIONS_PRO,
            "master": DEFAULT_PERMISSIONS_MASTER,
        }

        tier_roles_permissions = {
            "basic": DEFAULT_ROLE_PERMISSIONS_BASIC,
            "pro": DEFAULT_ROLE_PERMISSIONS_PRO,
            "master": DEFAULT_ROLE_PERMISSIONS_MASTER,
        }

        # Fetch all restaurants
        all_restaurants = await restaurant_repo.get_all_restaurants()

        for restaurant in all_restaurants:
            tier = restaurant.subscription_tier.lower()
            restaurant_id = restaurant.restaurant_id

            if tier not in tier_permissions:
                continue

            # Initialize repositories
            rest_perm_repo = PermissionRepository(db, restaurant_id=restaurant_id)
            role_repo = RoleRepository(db, restaurant_id=restaurant_id)

            # Fetch existing roles for the restaurant
            existing_roles = await role_repo.get_all()
            existing_roles_map = {r.name: r for r in existing_roles}

            # Create or update roles with descriptions based on tier
            default_roles_map = {
                "basic": DEFAULT_ROLES_BASIC,
                "pro": DEFAULT_ROLES_PRO,
                "master": DEFAULT_ROLES_MASTER,
            }

            # Create roles for the current tier if not exist
            for role_data in default_roles_map[tier]:
                role = existing_roles_map.get(role_data["name"])
                if not role:
                    await role_repo.create({
                        "name": role_data["name"],
                        "description": role_data.get("description", ""),
                        "restaurant_id": restaurant_id,
                    })
                else:
                    if not role.description or role.description != role_data.get("description", ""):
                        await role_repo.update(role.role_id, {"description": role_data.get("description", "")})

            # Proceed with syncing permissions for the current tier
            expected_perms = tier_permissions[tier]
            expected_names = [perm["name"] for perm in expected_perms]

            # Fetch existing permissions
            existing_perms = await rest_perm_repo.get_all()
            existing_map = {p.name: p for p in existing_perms}
            existing_names = list(existing_map.keys())

            # Add missing permissions or update description if changed
            for perm in expected_perms:
                if perm["name"] not in existing_names:
                    await rest_perm_repo.create({
                        "name": perm["name"],
                        "description": perm.get("description", ""),
                        "restaurant_id": restaurant_id,
                    })
                else:
                    existing_perm = existing_map[perm["name"]]
                    if existing_perm.description != perm.get("description", ""):
                        await rest_perm_repo.update(
                            existing_perm.permission_id,
                            {"description": perm.get("description", "")},
                        )

            # Remove permissions no longer valid for this tier
            to_remove = [name for name in existing_names if name not in expected_names]
            for name in to_remove:
                await rest_perm_repo.remove_permission_by_name(name)

            # Sync role-permissions for the current tier
            role_perm_repo = RolePermissionRepository(db, restaurant_id=restaurant_id)
            role_mappings = await role_repo.get_all()
            role_name_to_id = {r.name: r.role_id for r in role_mappings}
            expected_role_perms = tier_roles_permissions[tier]

            # Re-fetch permissions to ensure updated state after add/update
            existing_perms = await rest_perm_repo.get_all()
            existing_map = {p.name: p for p in existing_perms}

            for role_name, perm_names in expected_role_perms.items():
                role_id = role_name_to_id.get(role_name)
                if not role_id:
                    continue

                # Delete existing role-permission mappings and recreate
                await role_perm_repo.delete_all_for_role(role_id)

                for perm_name in perm_names:
                    perm = existing_map.get(perm_name)
                    if perm:
                        await role_perm_repo.create({
                            "role_id": role_id,
                            "permission_id": perm.permission_id,
                            "restaurant_id": restaurant_id
                        })

        return {"detail": f"Permissions synced for {len(all_restaurants)} restaurants."}
