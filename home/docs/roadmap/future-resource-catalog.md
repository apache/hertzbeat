---
id: future-resource-catalog
title: Resource catalog
sidebar_label: Resource catalog
roadmap_status: proposed
---

This is a **proposed direction**, not an available feature or a delivery commitment. No release date is assigned.

## Operator problem

Operators need an inspectable resource identity before joining signals from different sources.

## Current alpha boundary

Entity records and service identities already support scoped evidence. Namespace or environment alone does not identify a service, and unresolved telemetry can remain directly queryable. See the [current operator guide](../help/service_observability.md).

## Proposed capability

Extend provenance, ownership and identity-conflict inspection around existing entities before proposing broader discovery.

## Evidence required

Demonstrate ambiguous matches, service aliases, stale catalog metadata and prospective enrichment without rewriting historical telemetry.

## Non-goals

No new universal identity system or claim that every cloud/resource object is discovered.

## Contribution entry

Bring a concrete workflow and a reproducible failure to the [contribution process](../community/contribution.md). Agree the smallest contract and acceptance evidence before implementation. [Return to the roadmap](./index.md).
