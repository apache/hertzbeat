---
id: future-platform-governance
title: Platform governance
sidebar_label: Platform governance
roadmap_status: proposed
---

This is a **proposed direction**, not an available feature or a delivery commitment. No release date is assigned.

## Operator problem

Administrators need to understand who can change shared operational assets and how changes are recovered.

## Current alpha boundary

Existing roles govern shared assets. Dashboard revisions reject stale writes; saved queries follow their existing shared-asset semantics. This does not establish a separate tenant system. See the [current operator guide](../help/security_model.md).

## Proposed capability

Explore ownership and change-history views using the existing authorization and persistence boundaries.

## Evidence required

Verify role denials, concurrent edits, import/export limits and restart/native-backup recovery before broadening governance promises.

## Non-goals

No second permission system, unverified tenant isolation or compliance certification.

## Contribution entry

Bring a concrete workflow and a reproducible failure to the [contribution process](../community/contribution.md). Agree the smallest contract and acceptance evidence before implementation. [Return to the roadmap](./index.md).
