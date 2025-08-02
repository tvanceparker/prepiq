DEFAULT_PERMISSIONS_BASIC = [
    {"name": "manage_employees", "description": "Can manage employees"},
    {"name": "upload_sales", "description": "Can upload sales data"},
    {"name": "alerts", "description": "Can resolve & fix alerts"},
    {"name": "edit_menu", "description": "Can edit & create menu items"},
    {"name": "tenant_info", "description": "Can edit tenant info"},
    {"name": "activity_logs", "description": "Can view activity logs"},
    {"name": "system_check", "description": "Can run Sales data check"},
    {"name": "employees", "description": "Can create & edit employee info"},
    {"name": "roles", "description": "Can edit roles & permissions"},
    {"name": "restaurant_settings", "description": "Can edit restaurant settings"},
    {"name": "sales", "description": "Can create/edit sale info."}
]

DEFAULT_ROLES_BASIC = [
    {"name": "Admin", "description": "Admin access"},
    {"name": "Manager", "description": "Full access"},
    {"name": "Cook", "description": "Can view and edit orders"},
    {"name": "Waiter", "description": "Can view orders only"},
]

DEFAULT_ROLES_PRO = DEFAULT_ROLES_BASIC
DEFAULT_ROLES_MASTER = DEFAULT_ROLES_PRO

DEFAULT_ROLE_PERMISSIONS_BASIC = {
    "Admin": [permission['name'] for permission in DEFAULT_PERMISSIONS_BASIC],
    "Manager": [
        "manage_employees",
        "upload_sales",
        "alerts",
        "edit_menu",
        "tenant_info",
        "activity_logs",
        "system_check",
        "employees",
        "restaurant_settings",
        "sales"
    ],
    "Cook": [
        "upload_sales",
        "edit_menu",
    ],
    "Waiter": [
        "activity_logs",
    ],
}

DEFAULT_PERMISSIONS_PRO = DEFAULT_PERMISSIONS_BASIC + [
    {"name": "add_recipe", "description": "Can add recipes"},
    {"name": "edit_recipe", "description": "Can edit recipes"},
    {"name": "delete_recipe", "description": "Can delete recipes"},
    {"name": "add_prep", "description": "Can add prep items"},
    {"name": "batch_create_recipe", "description": "Can batch create recipes"},
    {"name": "batch_edit_recipe", "description": "Can batch edit recipes"},
    {"name": "batch_delete_recipe", "description": "Can batch delete recipes"},
]

DEFAULT_ROLE_PERMISSIONS_PRO = {
    **DEFAULT_ROLE_PERMISSIONS_BASIC,
    "Manager": DEFAULT_ROLE_PERMISSIONS_BASIC["Manager"] + [
        "add_recipe",
        "edit_recipe",
        "delete_recipe",
        "add_prep",
        "batch_create_recipe",
        "batch_edit_recipe",
        "batch_delete_recipe",
    ],
}

DEFAULT_PERMISSIONS_MASTER = DEFAULT_PERMISSIONS_PRO + [
    {"name": "view_analytics", "description": "Can view detailed analytics"},
    {"name": "generate_ordering", "description": "Can generate ordering recommendations"},
]

DEFAULT_ROLE_PERMISSIONS_MASTER = {
    **DEFAULT_ROLE_PERMISSIONS_PRO,
    "Manager": DEFAULT_ROLE_PERMISSIONS_PRO["Manager"] + [
        "view_analytics",
        "generate_ordering",
    ],
}
