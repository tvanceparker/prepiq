# PrepIQ

![Python](https://img.shields.io/badge/python-v3.13-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.104.1-green.svg)
![React](https://img.shields.io/badge/React-18.2.0-blue.svg)
![React Native](https://img.shields.io/badge/React_Native-mobile-61dafb.svg)
![Status](https://img.shields.io/badge/status-private-red.svg)

PrepIQ is a restaurant planning platform built to turn raw sales into confident operating decisions.

Instead of trying to replace a restaurant's entire tech stack, PrepIQ is designed to sit on top of the systems restaurants already use. It pulls in sales from an existing POS or from manual uploads, preserves the real menu structure the restaurant actually sells, and turns that data into forecasting, prep guidance, inventory visibility, reorder planning, and purchasing workflows.

The result is a product that helps operators answer the questions that matter every day: what are we likely to sell, what should we prep, what ingredients are at risk, what needs to be reordered, and what should be purchased next.

## Why PrepIQ

- Connect existing sales data instead of forcing restaurants onto a new POS.
- Keep the restaurant's real menu item names and identity intact when mapping data.
- Move from historical reporting into actual planning decisions.
- Support both lighter menu-level planning and fuller ingredient-aware operations.
- Give teams the same product direction across web and mobile.

## How It Works

1. Connect an external POS provider or import sales manually.
2. Map provider items to the restaurant's real menu items.
3. Turn sales history into forecasts, prep guidance, and operational recommendations.
4. Extend those predictions into recipes, batches, inventory, reorder, and purchasing when the restaurant needs the full workflow.

## Feature Highlights

### Sales Ingest That Fits Real Restaurants

PrepIQ is built around external sales intake, not an all-new checkout flow. Restaurants can connect to an existing POS provider, starting with Square, or fall back to manual and CSV-style sales ingestion. That keeps adoption practical while still creating a strong planning foundation.

- External POS integration flow for connected sales intake
- Manual sales import fallback for restaurants not ready for direct sync
- Sales history collection that feeds forecasting and operational planning
- End-of-day processing that turns incoming sales into next-step recommendations

### Menu Mapping That Preserves Real Item Identity

PrepIQ does not flatten everything into generic labels. Menu mapping is meant to preserve the actual menu items the restaurant sells so forecasting, prep, and downstream planning stay tied to the real business.

- Map provider items to restaurant-specific menu items
- Keep real item naming and identity intact
- Support menu-driven reporting, forecasting, and prep workflows
- Create a clean bridge from sales data into recipes and ingredient usage

### Forecasting That Drives Action

PrepIQ is built to go beyond dashboards. Forecasting is a core operating system for what happens next, from menu-level demand signals to deeper ingredient-aware planning.

- Forecast upcoming demand from historical sales patterns
- Support a lighter menu-item planning path and a deeper operational forecasting path
- Use an end-of-day canonical forecast flow with on-demand refresh potential
- Feed forecast results into prep, reorder, and purchasing decisions
- Surface forecast outputs through dedicated planning and analytics views

### Prep Guidance Teams Can Actually Use

On the lighter end of the product, PrepIQ helps restaurants decide what to make and when to make it based on expected demand. This keeps the system useful even before a restaurant fully adopts recipe and inventory workflows.

- Menu-item-level prep guidance
- Production direction based on forecasted demand
- Visibility into what needs attention next instead of only what happened yesterday
- A bridge from sales insight into daily kitchen planning

### Recipes and Batch Production for Deeper Operational Control

When a restaurant moves beyond menu-only planning, PrepIQ expands into the production model behind the menu. Recipes, nested components, and batch structures create the foundation for ingredient-aware decisions.

- Recipe composition for menu items
- Batch recipes for prepped components and reusable production units
- Menu-to-recipe and batch usage relationships
- Costing and usage logic that supports downstream inventory and forecast breakdowns

### Inventory Visibility With Operational Context

PrepIQ is not just a stock counter. The inventory model is meant to reflect what is on hand, what is being consumed, and what that means for the next few days of service.

- Ingredient-level inventory tracking
- Lot-aware inventory structures in the backend
- Visibility into stock state tied to planning workflows
- Inventory services that support deduction, waste, and downstream reorder decisions

### Ingredient-Aware Forecasting and Reorder Planning

Full workflow restaurants need more than menu-level forecasts. PrepIQ is designed to break expected demand down into ingredient requirements and use that to drive smarter replenishment.

- Forecast breakdown from menu demand into ingredient need
- Reorder suggestions based on expected usage and available stock
- Planning flows that connect forecast output to replenishment actions
- A path from projected demand to concrete purchasing decisions

### Supplier and Purchasing Workflows

Once the restaurant is operating with recipes and inventory, PrepIQ extends into procurement support. The goal is not to over-automate supplier relationships, but to make purchasing clearer and faster.

- Supplier catalog and relationship support
- Ingredient-to-supplier pricing references
- Purchase order workflows
- Purchasing views driven by forecast and reorder context

### Admin, Settings, and Integration Setup

PrepIQ keeps configuration close to the workflows it powers. Restaurant settings, account settings, and external integration setup live alongside the planning product rather than behind an oversized admin surface.

- Restaurant configuration and account settings
- Integration settings for external provider setup
- Simple multi-user access model for v1
- Tenant information and core admin visibility

### Built for Web and Mobile

PrepIQ is being shaped as a product that works across both web and mobile surfaces. The web app supports deeper operational workflows, while the mobile app is part of the same product direction rather than an afterthought.

- React web client for the main planning and operational experience
- React Native mobile app aligned to the same product model
- Shared focus on sales visibility, planning, settings, and day-to-day operating workflows
- A product direction that treats web and mobile as complementary operating surfaces

## Basic vs Full

PrepIQ is being shaped around two launch tiers.

### Basic

Basic is for restaurants that want a stronger planning layer without taking on full ingredient operations yet.

- External POS integration or manual sales ingest
- Restaurant-specific menu mapping
- Menu-item sales visibility and trend analysis
- Menu-item-level forecasting
- Menu-item-level prep guidance
- Product insight that helps operators plan what to sell and what to prep next

### Full

Full extends PrepIQ into the operational model behind the menu.

- Everything in Basic
- Recipe and batch management
- Ingredient-level inventory visibility
- Ingredient-aware forecasting
- Reorder planning
- Supplier and purchasing workflows
- Deeper planning from expected sales all the way through what needs to be stocked and bought

## Product Direction

PrepIQ v1 is intentionally focused. The product direction is external-POS-first, with manual sales ingestion as a fallback, and a planning-first workflow that grows from menu insight into deeper inventory and purchasing operations.

That also means some things are intentionally not positioned as core v1 pillars:

- PrepIQ is not trying to be the restaurant's primary POS in v1.
- PrepIQ is not centered on workforce management or team scheduling in v1.
- PrepIQ is not treating kitchen device flows, cash-drawer workflows, or terminal operations as launch-defining product surfaces.

Some older internal and experimental surfaces still exist in the repository while cleanup work continues, but the intended product direction is the one described above.

## Stack

- Backend: FastAPI, SQLAlchemy async, aiomysql, APScheduler, JWT auth
- Web: React 18, TanStack Query, Zustand, MUI
- Mobile: React Native, React Native Paper, React Navigation
- Database: MySQL or MariaDB-compatible deployment

## Quick Start

### Requirements

- Python 3.13+
- Node.js
- MySQL or MariaDB

### Backend

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Web

```bash
cd frontend
npm install
npm start
```

### Mobile

```bash
cd mobile
npm install
npm start -- --clear
```

### API Docs

When the backend is running, FastAPI docs are available at `http://localhost:8000/docs`.

## Testing

```bash
pytest tests/
cd frontend && npm test
npx playwright test
```

## Repository Layout

```text
prepiq/
├── app/          # FastAPI backend, services, repositories, schemas, integrations
├── frontend/     # React web client
├── mobile/       # React Native mobile client
├── tests/        # Automated backend and end-to-end coverage
├── scripts/      # Seeders, patches, and migration helpers
├── docs/         # Product and technical documentation
└── models/       # Forecasting and model-related assets
```

## Status

This repository is private and under active development. The product direction in this README reflects the intended v1 shape of PrepIQ as current cleanup and alignment work continues across the codebase.

## Usage

This software is proprietary and confidential. All rights reserved.
