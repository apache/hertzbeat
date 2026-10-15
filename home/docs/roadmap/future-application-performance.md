---
id: future-application-performance
title: Application performance
sidebar_label: Application performance
roadmap_status: proposed
---

This is a **proposed direction**, not an available feature or a delivery commitment. No release date is assigned.

## Operator problem

Operators want to move from a service symptom to a trace while understanding sampling and incomplete roots.

## Current alpha boundary

The alpha provides service RED from observed SERVER spans, root-operation groups and sorted, bounded Trace queries. Missing durations remain missing; these observations are not a complete latency census. See the [current operator guide](../help/service_observability.md).

## Proposed capability

Explore richer latency investigation and optional profiling after defining their coverage and query cost.

## Evidence required

Use real application traces with errors, sampling, partial roots and stable fixed windows. Compare every chart with its declared backend population.

## Non-goals

No universal agent coverage, exact population P95, automatic root cause or SLO guarantee.

## Contribution entry

Bring a concrete workflow and a reproducible failure to the [contribution process](../community/contribution.md). Agree the smallest contract and acceptance evidence before implementation. [Return to the roadmap](./index.md).
