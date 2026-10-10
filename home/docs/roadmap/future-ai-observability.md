---
id: future-ai-observability
title: AI observability
sidebar_label: AI observability
roadmap_status: proposed
---

This is a **proposed direction**, not an available feature or a delivery commitment. No release date is assigned.

## Operator problem

Operators need to separate model/provider failures from query-tool failures and missing evidence.

## Current alpha boundary

The alpha Gateway supports controlled read-only investigation, stored conversation replay and explicit failure/cancellation states. LM Studio/Ollama monitor templates inspect model-service metadata, not model quality. See the [current operator guide](../help/ai_agent.md).

## Proposed capability

Explore declared model-request telemetry and evaluation references without exposing prompts or credentials by default.

## Evidence required

Use real protocol success/refusal/timeout/cancel paths, secret redaction and independent request isolation; keep model-quality evaluation separate.

## Non-goals

No universal LLM tracing, automatic quality score, external MCP activation or model-performance benchmark claim.

## Contribution entry

Bring a concrete workflow and a reproducible failure to the [contribution process](../community/contribution.md). Agree the smallest contract and acceptance evidence before implementation. [Return to the roadmap](./index.md).
