# Operator Knowledge Sources

## Status

Partially implemented. The current phase 1 assistant uses document retrieval over `docs/` and `notes/` plus selected structured live context. Uploaded-file indexing, vector retrieval, and write-capable actions are still planned.

## Purpose

This document explains where an operator-facing assistant should get its answers.

It exists to prevent a common failure mode: assuming that a language model can safely infer restaurant truth directly from backend source code.

## Short Version

Not all assistant answers need documents.

But the assistant also should not rely on raw business-logic code as its primary operator-facing knowledge source.

The correct model is:

- live operational questions -> structured retrieval from services and database-backed outputs
- procedural questions -> document retrieval
- mixed questions -> blended retrieval with timestamps and caveats

## Knowledge Source Categories

### 1. Live Structured Restaurant Data

Best for questions such as:

- What is my current stock of an ingredient?
- What are my open purchase orders?
- What is tomorrow's forecast?
- What are my active alerts?

These answers should come from tenant-scoped backend retrieval through service or repository-backed context builders.

Good sources include:

- sales and forecast outputs
- inventory state
- purchase order state
- recipe and prep data
- alerts and diagnostics

### 2. Procedural And Onboarding Documents

Best for questions such as:

- How do I connect a POS provider?
- How do I set up recipes?
- What should I do if inventory counts look wrong?
- How does approval work for purchase orders?

These answers should come from written technical and operational docs.

### 3. Backend Code

Backend code is useful for builders, not as the assistant's primary production context.

Code should be used to:

- identify source-of-truth systems
- design retrieval adapters
- understand business rules and fallback behavior
- validate terminology and output shape

Code should not be used as the main runtime answer source for operators.

## Why Raw Code Is Not Enough

Using raw service code as the assistant's main context creates predictable problems:

- business rules are spread across services, repositories, DTOs, and helper utilities
- code often reflects implementation details rather than operator-facing language
- partially outdated code paths or fallback logic can be misread by the model
- a model may produce answers that sound plausible but are not tied to current tenant data

## Preferred Answer Strategy

### Structured Retrieval First

For live restaurant operations:

- assemble normalized context from known services
- keep tenant scoping explicit
- return timestamps, status fields, and caveats
- expose freshness for forecast and purchasing answers

### Document Retrieval Where It Fits

For procedures and explanations:

- retrieve from vetted docs
- keep documents focused and current
- separate operator guidance from low-level implementation notes

### Blended Answers

Some questions need both sources.

Example:

- What should I order tomorrow, and why?

That may require:

- live PO suggestion and forecast state
- documented explanation of review and approval workflow

## Highest-Value Document Types

The assistant benefits most from documents covering:

- onboarding and setup
- POS and integration configuration
- inventory troubleshooting
- forecast interpretation and caveats
- recipe and prep workflow guidance
- purchasing and approval workflows

## Reliability Rules

The assistant should:

- prefer structured tenant-scoped retrieval for live state
- cite documents for procedural answers
- expose stale or degraded state when known
- avoid pretending uncertain or missing data is definitive
