---
id: alert_serverchan
title: Server酱通知
sidebar_label: Server酱
---

## 响应兼容要求

从 1.9.1 起，Server酱通知只有在端点返回 HTTP 200，且 JSON 中数值字段 `code` 为 `0` 时才视为成功，例如：

```json
{"code": 0, "message": ""}
```

非零 code、缺少或为空的 code、空响应或解析失败、HTTP 错误及网络失败均视为通知失败。仅 HTTP 200 或仅 `errcode: 0` 而无 `code: 0` 不代表成功。配置兼容端点时也必须满足同一响应约定；本修复不放宽原有端点限制。
