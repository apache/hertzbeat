---
id: ollama
title: Ollama 监控
sidebar_label: Ollama 监控
---

本页说明已有的 **Agentless Ollama 监控模板**。它读取服务及模型元数据，与 OTel 应用插桩和 AI Gateway 供应商配置相互独立。

## 配置监控

在新建监控目录选择 Ollama，填写被选择采集器可访问的主机、端口（模板默认 `11434`）及对应的 TLS 设置。如果目标接口或访问代理要求 Bearer 凭据，可选的 **API Key** 字段会提供该凭据；此字段不会为原本未认证的服务建立认证机制。

保存前先执行检测，然后在一个已配置采集周期后检查新的当前样本。采集器容器无法通过自己的回环地址访问其他容器。请按部署需要限制网络访问，并避免将密钥放入公开诊断信息。

## 源码对应的采集契约

模板 `hertzbeat-manager/src/main/resources/define/app-ollama.yml` 发出三类 GET 请求：

| 指标组 | 接口 | 证据含义 |
|---|---|---|
| `version_info` | `/api/version` | 服务版本；优先级零的可用性检查 |
| `models` | `/api/tags` | 已安装模型的名称、大小和描述元数据 |
| `running_models` | `/api/ps` | 当前已加载模型行、大小/显存字段和过期时间 |

模型列表和运行中模型的上游契约见官方 [tags](https://docs.ollama.com/api/tags) 与 [ps](https://docs.ollama.com/api/ps) 文档。HertzBeat 仅读取这些行，不加载或下载模型。模板大小字段由字节转换为 MB。运行中模型为空不代表服务失败，缺失字段也不代表测得零值。

## 排查结果缺失

版本采集必须先成功，才会执行后续指标组。请区分连接/TLS 失败、认证失败、响应结构不兼容和合法空列表，并针对实际服务版本对照模板检查字段。这些指标组不衡量推理错误率、请求延迟、模型质量或完整内存利用率。

本轮 alpha 的 MySQL/Java 接入验收没有包含真实 Ollama 部署。本页记录已实现模板和期望的上游结构，不是已验证版本矩阵。请为自己的部署保留实际检测及当前样本。若需要配置模型供应商，请使用独立的 [AI Gateway 指南](./ai_agent.md)。
