---
id: alert_integration
title: 告警集成
sidebar_label: 告警集成
keywords: [开源监控, 告警集成, 告警管理, 多源告警]
---

> HertzBeat 的告警集成模块旨在实现对来自不同第三方监控与可观测性平台的告警进行统一接收、标准化处理与智能分发。作为一个集中式“告警中心”，HertzBeat 能够高效地接入外部系统的告警信息，并执行灵活的告警管理策略。

### 核心能力

- **多源告警接入**：支持从 Webhook、Prometheus、Alertmanager、SkyWalking、腾讯云等主流平台接收告警消息
- **告警格式标准化**：将来自不同平台的告警数据转换为 HertzBeat 内部统一格式，便于后续处理
- **丰富的告警处理机制**，包括：
  - **分组收敛**：根据标签对告警进行分组管理，对时间段的相同重复告警去重收敛
  - **抑制**：在满足特定条件时自动屏蔽次要告警
  - **静默**：在系统维护或已知异常期间临时关闭告警通知，避免干扰

### 已支持的告警来源

HertzBeat 当前已支持以下第三方监控平台的告警接入：

- **Webhook**：通用接入方式，支持自定义告警格式推送。
- **Prometheus**：可以在 Prometheus Server 的 Alertmanager 配置中直接配置 HertzBeat 的服务地址，使用 HertzBeat 替换 Alertmanager 直接来接收处理 Prometheus Server 的告警信息。
- **Alertmanager**：支持将 Prometheus AlertManager 的告警发送到 HertzBeat 告警平台。
- **SkyWalking**：将 SkyWalking 的告警通过 Webhook 方式发送到 HertzBeat 告警平台。
- **腾讯云监控**：将腾讯云的告警通过 Webhook 方式发送到 HertzBeat 告警平台。
- **更多**：HertzBeat 正在积极扩展其集成支持。如果暂时没有找到你需要的集成，活跃的社区也可以协助你添加。

你可以通过 HertzBeat 的“集成接入”界面查看具体的接入方式和配置示例。

![integration](/img/docs/help/alert_integration_cn.png)
