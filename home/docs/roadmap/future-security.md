---
id: future-security
title: Security observability
sidebar_label: Security observability
roadmap_status: proposed
---

This is a **proposed direction**, not an available feature or a delivery commitment. No release date is assigned.

## Operator problem

Operators need trustworthy evidence when access is denied or a credential-bearing output is redacted.

## Current alpha boundary

Application authorization, controlled queries and AI-output redaction are current boundaries. They are not a SIEM, vulnerability scanner or incident-detection product. See the [current operator guide](../help/security_model.md).

## Proposed capability

Consider scoped security-event investigation using clear data sources and retention controls.

## Evidence required

Test sensitive-field handling, denied access, false positives and evidence export with a declared threat model.

## Non-goals

No compliance badge, complete threat detection or proof that every external integration is safe.

## Contribution entry

Bring a concrete workflow and a reproducible failure to the [contribution process](../community/contribution.md). Agree the smallest contract and acceptance evidence before implementation. [Return to the roadmap](./index.md).
