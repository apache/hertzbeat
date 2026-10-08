---
id: future-application-performance
title: 应用性能诊断
sidebar_label: 应用性能诊断
roadmap_status: proposed
---

本页是**候选方向**，不代表功能已提供，也不构成交付承诺；目前没有发布日期。

## 运维问题

运维人员希望从服务异常下钻到 Trace，同时理解采样和不完整根跨度带来的限制。

## 当前 alpha 边界

当前 alpha 提供基于已观测 SERVER span 的服务 RED、根操作分组以及排序且有上限的 Trace 查询。耗时缺失仍保持缺失，这些观测不是完整的延迟统计。 参见[当前操作指南](../help/service_observability.md)。

## 候选能力

在明确覆盖范围和查询成本后，研究更丰富的延迟调查和可选剖析。

## 所需证据

使用真实应用的错误、采样、不完整根跨度和固定时间窗；逐一核对图表与其声明的后端样本范围。

## 非目标

不承诺所有 Agent 覆盖、全量精确 P95、自动根因判断或 SLO。

## 贡献入口

请通过[贡献流程](../community/contribution.md)提供具体工作流和可复现失败，再约定最小契约与验收证据。[返回路线图](./index.md)。
