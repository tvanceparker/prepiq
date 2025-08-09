---
mode: agent
tools: ['codebase', 'usages', 'vscodeAPI', 'problems', 'changes', 'testFailure', 'terminalSelection', 'terminalLastCommand', 'openSimpleBrowser', 'findTestFiles', 'searchResults', 'githubRepo', 'extensions', 'runTests', 'editFiles', 'runNotebooks', 'search', 'new', 'runCommands', 'runTasks']
---

# Copilot Agent Prompt: Standardize Dev Environment and Tasks across Arch, Windows (WSL2), and Codespaces

Objective
- Make development seamless across Arch Linux, Windows (via WSL2), and GitHub Codespaces by defining the environment and common tasks in-repo.
- Provide consistent commands for running the API (uvicorn main:app) and the web app (npm start).
- Prefer a project-local Python virtual environment (.venv) and install Node dependencies deterministically.
- Add a reproducible, consistent MySQL developer database that works the same on Arch, Windows (WSL2), and Codespaces.
- Add instructions on my end on what i have to install on arch linux and windows and codespaces
- Ensure the dev environment is easy to set up and use, with minimal manual configuration needed.
- This prompt was generated outside of workspace so please look over code template in this prompt to ensure it works for my codebase
- The mysql schema with the data is in notes/schema_with_data.sql, please update however the app/db/sessions is going to work with all three platforms
- Ensure easy hopping from all 3, and tell me how to do it
- Test it all to ensure everything works, and I want my extensions and vscode specific settings to persist in all 3 workspaces (or 1 workspace but 3 platforms?)
- Look over dockerfile,playwrite.config,setup_github.sh and either edit or get rid of if we don't need them with this new setup, and in my settings.json edit that a little to show the .vscode and other things i should be seeing instead of hiding. 
- You can use playwright or something once everything is done and use testuser2 password password to login in to verify everything works right, please keep iterating until this happens.
- Edit copilot-instructions.md for instruction on copilot on how this works, also edit copilot-instructions if anything is wrong.
- Make a .vscode/settings.json that they will all use, I'm not sure it will be workspace,codespace, or what settings though

Key Outcomes (Deliverables)
- Add or update these repository files (idempotently):
  - .devcontainer/devcontainer.json
  - .devcontainer/docker-compose.yml          # compose-based service for MySQL
  -the schema with data is in notes/schema_with_data.sql for db.
  - .vscode/tasks.json
  - .vscode/settings.json
  - look at every python import and please add to requirements.txt and delete any ones in there that aren't being used
  - package.json (create if missing; only add minimal scripts if already exists)
  - .gitignore (ensure sensible defaults)
  - .env.example (provide required variables; never commit .env)
- Create a pull request with a clear summary, validation steps, and screenshots/logs if applicable.

Repository Parameters (edit if needed)
- python_version: 3.12
- node_version: 20
- api_path: "."               # path containing the Python API (e.g., ".", "backend")
- app_module: "main:app"      # uvicorn app import path
- api_port: 8000
- web_path: "."               # path containing package.json (e.g., ".", "frontend")
- web_start_script: "start"   # npm script name to start the dev server
- use_uv: false               # if true, use uv for Python venv/deps; otherwise pip/requirements.txt
- mysql_version: "8.4"        # Oracle MySQL LTS
- mysql_port: 3306            # forwarded to localhost
- mysql_database: "appdb"
- mysql_user: "appuser"
- mysql_password: "apppass"
- mysql_root_password: "rootpass"
- mysql_volume: "mysql-data"  # named volume for local dev container data
- mysql_init_dir: ".devcontainer/mysql/initdb.d"  # SQL scripts auto-run at first boot

Assumptions
- Windows development uses WSL2 for best performance. Codespaces and Dev Containers are Linux-based.
- Tasks should work primarily inside the Dev Container or Codespace. Provide a “local (non-container)” fallback if simple.
- Do not overwrite a user’s existing config; merge carefully and preserve custom settings.
- I generated this outside my codebase so make sure it’s all correct and paths exist or are created.
- Include instructions to keep local VS Code and Codespaces work in sync (Settings Sync and Continue Working On…).

Non-Goals
- Do not introduce framework-specific scaffolding beyond what’s needed for FastAPI + Node dev ergonomics.
- Do not add CI/CD in this PR (can be a follow-up).

Implementation Plan

1) Detect Project Layout
- Identify Python API root:
  - If api_path is ".", look for files like main.py or app.py that contain `FastAPI(` or `uvicorn` usage.
  - Otherwise use api_path as the working directory for Python tasks.
  - If requirements.txt is missing, create it with minimal deps if FastAPI is detected.
- Identify Web root:
  - If web_path has a package.json, use it; otherwise, if none exists, create a minimal package.json with a dev server script (vite).
  - If package.json exists but lacks a "start" (or web_start_script) script, add one (non-destructive merge).

2) Dev Container (without DB)
- Create/merge .devcontainer/devcontainer.json to pin Python and Node versions and to bootstrap dependencies.
- Use pip with a local .venv by default; if use_uv is true, switch to uv.
- Include a small set of recommended VS Code extensions and settings.

Template for .devcontainer/devcontainer.json (pip + .venv):
```json
{
  "name": "polyglot-webapp",
  "features": {
    "ghcr.io/devcontainers/features/python:1": { "version": "3.12" },
    "ghcr.io/devcontainers/features/node:1": { "version": "20" }
  },
  "postCreateCommand": "python -m venv .venv && ./.venv/bin/python -m pip install -U pip && if [ -f requirements.txt ]; then ./.venv/bin/pip install -r requirements.txt; fi && corepack enable && if [ -f package-lock.json ] || [ -f npm-shrinkwrap.json ]; then npm ci; elif [ -f package.json ]; then npm install; fi",
  "customizations": {
    "vscode": {
      "extensions": [
        "ms-python.python",
        "ms-python.vscode-pylance",
        "ms-azuretools.vscode-docker",
        "github.vscode-pull-request-github"
      ],
      "settings": {
        "python.defaultInterpreterPath": "${workspaceFolder}/.venv/bin/python",
        "terminal.integrated.defaultProfile.linux": "bash"
      }
    }
  }
}
```

Template for .devcontainer/devcontainer.json (uv):
```json
{
  "name": "polyglot-webapp",
  "features": {
    "ghcr.io/devcontainers/features/python:1": { "version": "3.12" },
    "ghcr.io/devcontainers/features/node:1": { "version": "20" }
  },
  "postCreateCommand": "pip install uv && uv venv && ./.venv/bin/python -m pip install -U pip && if [ -f pyproject.toml ]; then uv sync; fi && corepack enable && if [ -f package-lock.json ] || [ -f npm-shrinkwrap.json ]; then npm ci; elif [ -f package.json ]; then npm install; fi",
  "customizations": {
    "vscode": {
      "extensions": [
        "ms-python.python",
        "ms-python.vscode-pylance",
        "ms-azuretools.vscode-docker",
        "github.vscode-pull-request-github"
      ],
      "settings": {
        "python.defaultInterpreterPath": "${workspaceFolder}/.venv/bin/python",
        "terminal.integrated.defaultProfile.linux": "bash"
      }
    }
  }
}
```

2a) Database: MySQL service for Arch/WSL/Codespaces (recommended)
- Use a MySQL service container via Docker Compose so all platforms run the same DB version and schema.
- Persist dev data locally with a named volume (not shared between machines) and rely on migrations/seed scripts to recreate a known state anywhere.
- Expose port 3306 and let VS Code/Codespaces forward to localhost.

Template for .devcontainer/docker-compose.yml:
```yaml
version: "3.8"

services:
  app:
    image: mcr.microsoft.com/devcontainers/base:jammy
    # The Dev Container will apply "features" and settings from devcontainer.json to this service.
    volumes:
      - ..:/workspaces/${localWorkspaceFolderBasename}
    networks:
      - devnet
    # Keep container alive; devcontainer will override with its entrypoint
    command: sleep infinity

  mysql:
    image: mysql:8.4
    restart: unless-stopped
    environment:
      MYSQL_DATABASE: ${MYSQL_DATABASE:-appdb}
      MYSQL_USER: ${MYSQL_USER:-appuser}
      MYSQL_PASSWORD: ${MYSQL_PASSWORD:-apppass}
      MYSQL_ROOT_PASSWORD: ${MYSQL_ROOT_PASSWORD:-rootpass}
    ports:
      - "${MYSQL_PORT:-3306}:3306"
    volumes:
      - ${MYSQL_VOLUME:-mysql-data}:/var/lib/mysql
      - ../.devcontainer/mysql/initdb.d:/docker-entrypoint-initdb.d:ro
    healthcheck:
      test: ["CMD", "mysqladmin", "ping", "-h", "127.0.0.1", "-u", "root", "-prootpass"]
      interval: 5s
      timeout: 5s
      retries: 20
    networks:
      - devnet

networks:
  devnet:

volumes:
  mysql-data:
    name: ${MYSQL_VOLUME:-mysql-data}
```

Template for .devcontainer/devcontainer.json (compose + MySQL):
```json
{
  "name": "polyglot-webapp",
  "dockerComposeFile": ["./docker-compose.yml"],
  "service": "app",
  "runServices": ["app", "mysql"],
  "workspaceFolder": "/workspaces/${localWorkspaceFolderBasename}",
  "features": {
    "ghcr.io/devcontainers/features/python:1": { "version": "3.12" },
    "ghcr.io/devcontainers/features/node:1": { "version": "20" },
    "ghcr.io/devcontainers/features/mysql-client:1": {}
  },
  "forwardPorts": [3306],
  "portsAttributes": {
    "3306": { "label": "MySQL", "onAutoForward": "notify" }
  },
  "postCreateCommand": "python -m venv .venv && ./.venv/bin/python -m pip install -U pip && if [ -f requirements.txt ]; then ./.venv/bin/pip install -r requirements.txt; fi && corepack enable && if [ -f package-lock.json ] || [ -f npm-shrinkwrap.json ]; then npm ci; elif [ -f package.json ]; then npm install; fi",
  "customizations": {
    "vscode": {
      "extensions": [
        "ms-python.python",
        "ms-python.vscode-pylance",
        "ms-azuretools.vscode-docker",
        "github.vscode-pull-request-github",
        "cweijan.vscode-mysql-client2"
      ],
      "settings": {
        "python.defaultInterpreterPath": "${workspaceFolder}/.venv/bin/python",
        "terminal.integrated.defaultProfile.linux": "bash"
      }
    }
  }
}
```

Notes:
- Place a .env at the repo root (git-ignored) or use Codespaces secrets. Compose reads `${VARS}` from your shell; you can also use `env_file`.
- The `initdb.d` SQL files run only when the MySQL data directory is empty (first run). Provide idempotent seed scripts or add dedicated “seed” tasks.

3) VS Code Tasks
- Provide tasks to run API and Web individually and together.
- Primary tasks target the Linux container paths (/.venv/bin/python). Also add a “local (non-container)” API task that uses Windows paths (`.venv\\Scripts\\python.exe`) for users choosing not to use containers.
- Add DB tasks for wait/seed/dump.

Template for .vscode/tasks.json (adjust api_path and web_path via cwd):
```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Start: API",
      "type": "process",
      "command": "${workspaceFolder}/.venv/bin/python",
      "args": ["-m", "uvicorn", "main:app", "--reload", "--host", "0.0.0.0", "--port", "8000"],
      "options": { "cwd": "${workspaceFolder}" },
      "problemMatcher": []
    },
    {
      "label": "Start: API (local non-container)",
      "type": "process",
      "windows": { "command": "${workspaceFolder}\\\\.venv\\\\Scripts\\\\python.exe" },
      "osx": { "command": "${workspaceFolder}/.venv/bin/python" },
      "linux": { "command": "${workspaceFolder}/.venv/bin/python" },
      "command": "${workspaceFolder}/.venv/bin/python",
      "args": ["-m", "uvicorn", "main:app", "--reload", "--port", "8000"],
      "options": { "cwd": "${workspaceFolder}" },
      "problemMatcher": []
    },
    {
      "label": "Start: Web",
      "type": "npm",
      "script": "start",
      "options": { "cwd": "${workspaceFolder}" },
      "problemMatcher": []
    },
    {
      "label": "DB: Wait (healthcheck)",
      "type": "shell",
      "command": "until mysqladmin ping -h 127.0.0.1 -u root -p${env:MYSQL_ROOT_PASSWORD} --silent; do sleep 1; done",
      "problemMatcher": [],
      "options": { "env": { "MYSQL_ROOT_PASSWORD": "${config:mysql.rootPassword}" } }
    },
    {
      "label": "DB: Seed (re-run .sql)",
      "type": "shell",
      "command": "for f in $(ls .devcontainer/mysql/initdb.d/*.sql 2>/dev/null); do echo Running $f; mysql -h 127.0.0.1 -u ${env:MYSQL_USER} -p${env:MYSQL_PASSWORD} ${env:MYSQL_DATABASE} < $f; done",
      "problemMatcher": [],
      "options": {
        "cwd": "${workspaceFolder}",
        "env": {
          "MYSQL_DATABASE": "${config:mysql.database}",
          "MYSQL_USER": "${config:mysql.user}",
          "MYSQL_PASSWORD": "${config:mysql.password}"
        }
      },
      "dependsOn": ["DB: Wait (healthcheck)"]
    },
    {
      "label": "DB: Dump",
      "type": "shell",
      "command": "mkdir -p db/dumps && mysqldump -h 127.0.0.1 -u ${env:MYSQL_USER} -p${env:MYSQL_PASSWORD} ${env:MYSQL_DATABASE} > db/dumps/dev_latest.sql",
      "problemMatcher": [],
      "options": {
        "cwd": "${workspaceFolder}",
        "env": {
          "MYSQL_DATABASE": "${config:mysql.database}",
          "MYSQL_USER": "${config:mysql.user}",
          "MYSQL_PASSWORD": "${config:mysql.password}"
        }
      },
      "dependsOn": ["DB: Wait (healthcheck)"]
    },
    {
      "label": "Start: All",
      "dependsOrder": "parallel",
      "dependsOn": ["Start: API", "Start: Web"],
      "problemMatcher": []
    }
  ]
}
```

Notes:
- The DB tasks expect mysql client tools (added via `mysql-client` feature) and configuration values (see settings.json below).
- In Codespaces and Dev Containers, port 3306 is forwarded to localhost automatically.

4) VS Code Settings
- Point Python tools to the repo-local .venv and enable pytest by default.
- Provide default MySQL config keys used by tasks (users can override in Settings).
- Optionally set Files: Associations for .env.

Template for .vscode/settings.json:
```json
{
  "python.defaultInterpreterPath": "${workspaceFolder}/.venv/bin/python",
  "python.testing.pytestEnabled": true,

  // MySQL defaults used by tasks (override in user/workspace settings if needed)
  "mysql.database": "appdb",
  "mysql.user": "appuser",
  "mysql.password": "apppass",
  "mysql.rootPassword": "rootpass"
}
```

5) Python Deps
- If requirements.txt is missing, create it with FastAPI + Uvicorn.
- If present, do not remove existing deps; add only if missing.
- If you will connect to MySQL from Python, ensure driver and ORM are present (optional).

Template for requirements.txt (minimal):
```txt
fastapi
uvicorn[standard]
# Optional DB stack
sqlalchemy
pymysql
alembic
```

6) Node App
- If package.json is missing, create a minimal one with a vite-powered dev server.
- If present, ensure there is a "start" (or web_start_script) entry; add "start": "npm run dev" if safe.
- Never remove user scripts; merge conservatively.
- If Node connects to MySQL, consider adding `mysql2` and use env vars.

Template for package.json (minimal):
```json
{
  "name": "webapp",
  "private": true,
  "scripts": {
    "start": "npm run dev",
    "dev": "vite"
  },
  "devDependencies": {
    "vite": "^5.0.0"
  }
}
```

7) .gitignore
- Ensure the following are ignored (append if file exists):
```gitignore
.venv/
node_modules/
.env
.env.*
.DS_Store
.vscode/.ropeproject
db/dumps/
```

8) .env.example
- Include keys that the app expects without real values. Users copy to `.env` locally.
- For Codespaces, set secrets in repository/environment/organization secrets and map them to env vars via `devcontainer.json` (optional).

Template for .env.example:
```dotenv
# App
PORT=8000

# MySQL
MYSQL_PORT=3306
MYSQL_DATABASE=appdb
MYSQL_USER=appuser
MYSQL_PASSWORD=apppass
MYSQL_ROOT_PASSWORD=rootpass

# Python app DB URL examples
DATABASE_URL=mysql+pymysql://appuser:apppass@127.0.0.1:3306/appdb

# Node app DB URL examples
MYSQL_URL=mysql://appuser:apppass@127.0.0.1:3306/appdb
```

9) Validation (the agent must execute these checks)
- Build the Dev Container or open in Codespaces:
  - Verify .venv exists and pip is upgraded.
  - Verify Python deps installed if requirements.txt exists.
  - Verify Node deps installed (npm ci or npm install).
  - Verify MySQL service is healthy (docker-compose healthcheck passes).
  - Verify port 3306 is forwarded to localhost.
- Run tasks:
  - “Start: API” starts uvicorn serving app_module on api_port.
  - “Start: Web” starts the dev server.
  - “DB: Seed” applies SQL files successfully and is idempotent.
  - “DB: Dump” writes db/dumps/dev_latest.sql.
  - “Start: All” can run API and Web in parallel.
- If local non-container dev is attempted:
  - Create .venv with `python -m venv .venv` and run `pip install -r requirements.txt`.
  - Run “Start: API (local non-container)” successfully on Windows (WSL or native), Linux, and macOS paths.
  - For MySQL outside containers, either:
    - Use Docker Compose from the repo root: `docker compose -f .devcontainer/docker-compose.yml up -d mysql`
    - Or install MySQL locally and set env vars to match .env.example.

10) Pull Request
- Create a new branch chore/dev-env-standardization.
- Commit changes with conventional message:
  - chore(dev): standardize environment with devcontainer + tasks + mysql service
- PR Title:
  - Standardize dev environment and tasks across Arch/WSL/Codespaces (incl. MySQL)
- PR Body (include these sections):
  - Summary: What was added and why.
  - Instructions: How to open in Dev Container / Codespaces.
  - DB: How the MySQL service works, where seed scripts live, how to connect.
  - Tasks: How to run “Start: API”, “Start: Web”, “DB: Seed”, “DB: Dump”, “Start: All”.
  - Local fallback: Using “Start: API (local non-container)” and starting MySQL via compose.
  - Validation: What the agent verified.
  - Notes: How to adjust api_path, web_path, app_module, ports, and Node/Python/MySQL versions.
- Assign to the repository owner or leave unassigned if unknown. Add appropriate labels if available (e.g., chore, devcontainer, tooling).

11) VS Code + Codespaces Sync Instructions (include in PR body)
- Make VS Code feel the same everywhere:
  - Turn on Settings Sync: VS Code → Accounts (bottom-left) → Turn on Settings Sync → Sign in with GitHub → choose Settings, Keybindings, Extensions, Snippets, UI State.
  - Repeat inside Codespaces or any other machine.
- Work on the same code with no manual sync:
  - Use GitHub Codespaces and open it in VS Code desktop. Every save edits the cloud workspace; commit/push from there.
- Move uncommitted work between local and Codespaces:
  - Command Palette → “Continue Working On…” → choose “In Codespace” or “On Local.” VS Code moves your pending changes.
- Traditional Git flow between environments:
  - Commit + push on one, pull on the other. Optional: set “Git: Post Commit Command” to “push” for auto-push after commits.
- Where servers run:
  - Local or WSL: on your machine at http://localhost:PORT.
  - Dev Container (Arch/WSL): inside containers on your machine; ports forwarded to localhost.
  - Codespaces: in the cloud; ports forwarded to a preview URL or localhost via VS Code.

Heuristics and Safety
- Idempotent writes: if a file exists, merge JSON; do not drop keys. Keep user customizations.
- Paths:
  - In-container: use ${workspaceFolder}/.venv/bin/python.
  - Windows local fallback: ${workspaceFolder}\\.venv\\Scripts\\python.exe.
- Do not commit secrets. If a .env exists, ensure it’s ignored.
- If both backend/ and frontend/ are detected:
  - Put .venv at repo root by default.
  - Set tasks’ cwd to backend/ and frontend/ respectively.
  - Optionally add separate tasks: “Start: API (backend/)”, “Start: Web (frontend/)”.
- Database data “sync” strategy:
  - Treat the DB as ephemeral and reproducible. Use migrations and seed scripts under version control.
  - For a shared team dataset, store a sanitized dump in db/dumps/ via Git LFS and provide a “DB: Restore” task to load it.
  - If you truly need a single shared live DB, use a managed MySQL (e.g., PlanetScale) and set DATABASE_URL via secrets; local containers still connect over the network.

User Adjustment Tips (to include in PR body)
- Change Python/Node/MySQL versions by editing devcontainer features and compose image tags.
- If using uv instead of pip, switch to the uv devcontainer template and add a pyproject.toml.
- If the API module isn’t main:app, update tasks.json args accordingly.
- If ports conflict, change api_port or mysql_port and document.
- To reset the MySQL data volume locally, run `Dev Containers: Rebuild Container` after removing the named volume (or `docker compose -f .devcontainer/docker-compose.yml down -v` outside of Codespaces). In Codespaces, use “Rebuild Container” which recreates service containers.

End of prompt.