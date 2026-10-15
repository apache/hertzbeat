---
id: lmstudio
title: LM Studio 监控
sidebar_label: LM Studio 监控
---

本页说明已有的 LM Studio 模型元数据 **Agentless 监控模板**，不负责将 LM Studio 配置为 AI Gateway 供应商，不为推理请求插桩，也不衡量模型质量或性能。

## 配置监控

1. 启动 LM Studio HTTP 服务，确认**被选择的 HertzBeat 采集器**可以访问它。其他主机或容器内的采集器拥有独立的 `localhost`。
2. 在新建监控目录选择 LM Studio，填写与目标服务一致的 **Host**、**Port**（模板默认 `1234`）和 **HTTPS**。
3. 若目标要求认证，填写监控的 **API Token**；模板使用 Bearer 认证。凭据应保存在受保护配置中，不要出现在截图或诊断导出中。
4. 执行表单检测，检查返回的模型字段后再保存；至少经过一个已配置的采集周期后重新检查当前样本。

源码模板 `hertzbeat-manager/src/main/resources/define/app-lmstudio.yml` 请求 `GET /api/v1/models` 并读取 `models`。对应上游契约见 [LM Studio 模型列表 API](https://lmstudio.ai/docs/developer/rest/list)。其他或旧版接口不会自动兼容此模板。

## 如何理解返回行

模板包含模型标识、显示名称、类型、发布者、架构、量化方式、模型大小、参数描述、最大上下文长度及格式。模型大小由模板从字节转换为 MB。可选或缺失字段不能理解为测得的零值。这是清单响应，不是逐请求延迟、Token 吞吐或 GPU 利用率。

## 排查采集失败

修改凭据前，先检查主机连通性和准确端口/协议。`401`/`403` 需要修正认证或权限，不代表模型列表为空。遇到解析失败时，对照源码模板检查接口和响应字段名。没有可用模型时，空 `models` 数组可能合法，但不能证明推理服务可用。

本次 alpha 验收实际验证的是 Agentless MySQL 与 OTel Java 链路，没有运行真实 LM Studio 实例。此模板及上游 API 已审阅；将其视为已验证来源前，请测试实际 LM Studio 版本并保留结果。供应商配置参见独立的 [AI Gateway 指南](./ai_agent.md)。
