---
id: future-data-observability
title: Data observability
sidebar_label: Data observability
roadmap_status: proposed
---

This is a **proposed direction**, not an available feature or a delivery commitment. No release date is assigned.

## Operator problem

A database can be reachable while business data is stale or incomplete. Operators need to distinguish those states.

## Current alpha boundary

Database monitor templates collect configured operational metrics. They do not automatically establish data quality, lineage or business freshness. See the [current operator guide](../help/mysql.md).

## Proposed capability

Study explicitly configured freshness, volume and schema-change observations for a declared dataset.

## Evidence required

Start with least-privilege reads and show missing data, ingestion delay, schema changes and rule uncertainty without synthetic zeroes.

## Non-goals

No arbitrary database queries, automatic enterprise lineage or correctness guarantees for business data.

## Contribution entry

Bring a concrete workflow and a reproducible failure to the [contribution process](../community/contribution.md). Agree the smallest contract and acceptance evidence before implementation. [Return to the roadmap](./index.md).
