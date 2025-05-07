---
id: alert_integration
title: Alert Integration
sidebar_label: Alert Integration
keywords:
  [
    open-source monitoring,
    alert integration,
    alert management,
    multi-source alerts,
  ]
---

> The alert integration module of HertzBeat is designed to achieve unified reception, standardized processing, and intelligent dispatching of alerts from various third-party monitoring and observability platforms. As a centralized "Alert Center," HertzBeat efficiently ingests external alert information and applies flexible alert management strategies.

### Core Capabilities

- **Multi-Source Alert Ingestion**: Supports receiving alert messages from major platforms such as Webhook, Prometheus, Alertmanager, SkyWalking, and Tencent Cloud.
- **Alert Format Standardization**: Converts alerts from different platforms into a unified internal format within HertzBeat for easier processing.
- **Comprehensive Alert Processing Mechanisms**, including:
  - **Grouping and Convergence**: Manage alerts by grouping them based on labels and deduplicate repeated alerts within a specific time window.
  - **Inhibition**: Automatically suppresses secondary alerts when specific conditions are met.
  - **Silencing**: Temporarily disables alert notifications during system maintenance or known issues to avoid unnecessary noise.

### Supported Alert Sources

HertzBeat currently supports alert integration from the following third-party monitoring platforms:

- **Webhook**: A generic integration method supporting customized alert format push.
- **Prometheus**: You can configure HertzBeat’s service address directly in the Prometheus Server's Alertmanager configuration, allowing HertzBeat to replace Alertmanager for receiving and handling Prometheus Server alerts.
- **Alertmanager**: Supports forwarding alerts from Prometheus AlertManager to the HertzBeat alert platform.
- **SkyWalking**: Sends SkyWalking alerts to the HertzBeat alert platform via Webhook.
- **Tencent Cloud Monitoring**: Sends Tencent Cloud alerts to the HertzBeat alert platform via Webhook.
- **And more**：HertzBeat is actively expanding its integration support. If the integration you need is not yet available, the community is actively contributing and can assist in adding it.

You can view the detailed integration methods and configuration examples through the "Integration" interface in HertzBeat.

![integration](/img/docs/help/alert_integration_en.png)
