---
id: future-observability-pipelines
title: Observability pipelines
sidebar_label: Observability pipelines
roadmap_status: proposed
---

This is a **proposed direction**, not an available feature or a delivery commitment. No release date is assigned.

## Operator problem

Operators need to know where telemetry was accepted, rejected or delayed before changing an application.

## Current alpha boundary

The alpha has controlled OTLP intake and bounded signal queries. Intake audit counts are not business request RED, and the current UI is not a general transformation editor. See the [current operator guide](../help/explore_saved_queries.md).

## Proposed capability

Explore source-to-destination inspection, validated transformations and explicit delivery state, starting with an existing intake path.

## Evidence required

Prove malformed input, quota rejection, queue pressure and recovery while retaining source identity and authorization. Reuse existing intake evidence before adding a second pipeline model.

## Non-goals

No arbitrary SQL, plugin marketplace, unlimited retention or lossless-delivery guarantee.

## Contribution entry

Bring a concrete workflow and a reproducible failure to the [contribution process](../community/contribution.md). Agree the smallest contract and acceptance evidence before implementation. [Return to the roadmap](./index.md).
