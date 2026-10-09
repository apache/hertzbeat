---
id: future-software-delivery
title: Software delivery
sidebar_label: Software delivery
roadmap_status: proposed
---

This is a **proposed direction**, not an available feature or a delivery commitment. No release date is assigned.

## Operator problem

Responders need a reliable deployment reference when evaluating whether a change preceded an incident.

## Current alpha boundary

Operational monitoring and service evidence are available. The alpha is not a complete CI/test visibility, release-management or DORA measurement system. See the [current operator guide](../help/service_observability.md).

## Proposed capability

Consider read-only change annotations tied to immutable source/build references and existing service identities.

## Evidence required

Check late, duplicated and reverted deployments, clock differences, provenance and permission failures using an actual delivery pipeline.

## Non-goals

No deployment execution, invented change causality or organization-wide delivery scores.

## Contribution entry

Bring a concrete workflow and a reproducible failure to the [contribution process](../community/contribution.md). Agree the smallest contract and acceptance evidence before implementation. [Return to the roadmap](./index.md).
