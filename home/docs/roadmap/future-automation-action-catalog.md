---
id: future-automation-action-catalog
title: Automation action catalog
sidebar_label: Automation action catalog
roadmap_status: proposed
---

This is a **proposed direction**, not an available feature or a delivery commitment. No release date is assigned.

## Operator problem

Operators need to see the exact intended change and its approval boundary before automation acts.

## Current alpha boundary

The alpha AI Gateway uses controlled read-only investigation tools. The separately retained experimental MCP code is not a supported remote action system. See the [current operator guide](../help/ai_agent.md).

## Proposed capability

If write actions are proposed, begin with one narrowly scoped, reviewable action and an explicit permission contract.

## Evidence required

Prove dry-run versus execution, user cancellation, idempotency, stale-state rejection, audit history and rollback where feasible.

## Non-goals

No arbitrary shell/SQL, unattended privilege expansion or default autonomous remediation.

## Contribution entry

Bring a concrete workflow and a reproducible failure to the [contribution process](../community/contribution.md). Agree the smallest contract and acceptance evidence before implementation. [Return to the roadmap](./index.md).
