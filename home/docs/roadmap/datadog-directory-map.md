---
id: datadog-directory-map
title: External directory reference
sidebar_label: External directory reference
roadmap_status: reference
---

The area names below were checked against the [official Datadog documentation directory](https://docs.datadoghq.com/) on 2026-09-06. They are used only to organize research questions. This table makes no equivalence, integration, licensing or availability claim.

| Datadog docs area | HertzBeat current evidence boundary | Roadmap document |
|---|---|---|
| Applications / APM | Service RED and Trace investigation | [Proposal](./future-application-performance.md) |
| Observability Pipelines | Controlled OTLP intake | [Proposal](./future-observability-pipelines.md) |
| Fleet Automation | Collector configuration and intake readiness | [Proposal](./future-collector-fleet-governance.md) |
| Software Catalog | Service entities and existing associations | [Proposal](./future-software-catalog.md) |
| Incident Response | Alert firing, recovery and notifications | [Proposal](./future-incident-response.md) |
| Workflow Automation | Read-only AI Gateway tools | [Proposal](./future-automation-action-catalog.md) |
| Data Observability | Database operational metrics | [Proposal](./future-data-observability.md) |
| Digital Experience | Website/API monitoring | [Proposal](./future-digital-experience.md) |
| Software Delivery | Observed service-investigation evidence | [Proposal](./future-software-delivery.md) |
| Cloud Cost Management | Utilization monitoring, not billing | [Proposal](./future-cloud-cost.md) |
| AI | Controlled AI investigation and model-service monitoring | [Proposal](./future-ai-observability.md) |
| Security | Authorization and redaction boundaries | [Proposal](./future-security.md) |
| Platform Capabilities | Shared assets and existing roles | [Proposal](./future-platform-governance.md) |
| API / Integrations | Controlled queries and application guides | [Proposal](./future-developer-integrations.md) |

## Open-source private deployment note

A similarly named area can require a different data model, authorization boundary and operational budget. HertzBeat's alpha remains a privately deployable application with the documented store and tool dependencies; the directory does not authorize external cloud resources or add a second permissions system. Resource identity and topology proposals remain [separate](./future-resource-catalog.md) [investigations](./future-topology-fault-analysis.md).

Use the [roadmap index](./index.md) to read the non-goals and required evidence. Current features are described in the operator manuals, not inferred from another product's navigation.
