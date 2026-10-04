---
id: push
title: 监控：推送方式监控
sidebar_label: 推送方式监控
keywords: [开源监控系统, 开源推送监控, 推送方式指标监控]
---

> HertzBeat 默认以主动采集方式定时拉取目标指标。推送方式监控反转了这一模型——由您的应用将 Prometheus 格式的指标推送至 HertzBeat，适用于短生命周期任务、批处理作业或位于防火墙内部的服务。

## 工作原理

1. HertzBeat 暴露一个兼容 Prometheus Pushgateway 协议的推送端点。
2. 您的应用以 **Prometheus 文本格式** 将指标 POST 到该端点，需指定 `job` 名称和 `instance` 名称。
3. 对于首次推送的新 `job`/`instance` 组合，HertzBeat 将自动为其创建一个监控实例。
4. 后续推送将持续更新该监控实例下存储的指标数据。

## 推送端点

```http
POST http://{hertzbeat-host}:{port}/api/push/prometheus/job/{job}/instance/{instance}
Content-Type: text/plain
```

| 路径参数 | 说明 | 示例 |
|---|---|---|
| `{hertzbeat-host}` | HertzBeat 服务器地址 | `127.0.0.1` |
| `{port}` | HertzBeat HTTP 端口（默认 `1157`） | `1157` |
| `{job}` | 应用逻辑名称（仅允许字母、数字和下划线 `_`） | `my_app` |
| `{instance}` | 该 job 下的实例标识（仅允许字母、数字和下划线 `_`） | `server_1` |

## 指标格式

请求体须遵循 **Prometheus 文本格式**，每行（非注释、非空行）定义一个采样点：

```promtail
# HELP http_requests_total 处理的 HTTP 请求总数
# TYPE http_requests_total counter
http_requests_total{method="GET",status="200"} 1234
http_requests_total{method="POST",status="200"} 56

# HELP cpu_usage_percent 当前 CPU 使用率
# TYPE cpu_usage_percent gauge
cpu_usage_percent 72.5

# HELP memory_used_bytes 当前内存使用量
# TYPE memory_used_bytes gauge
memory_used_bytes 536870912
```

## 配置参数

| 参数名称 | 参数帮助描述 |
|---|---|
| 推送模块 Host | 您的应用将指标推送到的 HertzBeat 服务器地址，默认：`127.0.0.1` |
| 端口 | HertzBeat HTTP 端口，默认：`1157` |
| 监控数据字段 | 定义 HertzBeat 需要接收的指标字段名及其类型（数值 / 字符串） |

## 示例：Shell（curl）

```bash
curl -X POST \
  http://localhost:1157/api/push/prometheus/job/my_app/instance/server_1 \
  -H 'Content-Type: text/plain' \
  --data-binary @- << 'EOF'
# HELP cpu_usage_percent 当前 CPU 使用率
# TYPE cpu_usage_percent gauge
cpu_usage_percent{core="0"} 45.2
cpu_usage_percent{core="1"} 38.7

# HELP memory_used_bytes 当前内存使用量
# TYPE memory_used_bytes gauge
memory_used_bytes 1073741824
EOF
```

## 示例：Python

```python
import requests

def push_metrics(host: str, port: int, job: str, instance: str, body: str) -> None:
    url = f"http://{host}:{port}/api/push/prometheus/job/{job}/instance/{instance}"
    response = requests.post(url, data=body, headers={"Content-Type": "text/plain"})
    response.raise_for_status()

metrics_body = """\
# HELP request_duration_seconds 请求耗时
# TYPE request_duration_seconds gauge
request_duration_seconds{endpoint="/api/v1/users"} 0.023
"""

push_metrics("localhost", 1157, "my_app", "server_1", metrics_body)
```

## 示例：Java

```java
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

String body = """
        # HELP jvm_memory_used_bytes JVM 堆内存当前使用量
        # TYPE jvm_memory_used_bytes gauge
        jvm_memory_used_bytes 134217728
        """;

HttpRequest request = HttpRequest.newBuilder()
        .uri(URI.create("http://localhost:1157/api/push/prometheus/job/my_app/instance/server_1"))
        .header("Content-Type", "text/plain")
        .POST(HttpRequest.BodyPublishers.ofString(body))
        .build();

HttpClient.newHttpClient().send(request, HttpResponse.BodyHandlers.ofString());
```

## 常见问题

1. **响应提示 `Request not matched`**  
   `{job}` 和 `{instance}` 路径参数仅允许字母、数字和下划线（`[a-zA-Z0-9_]`），不支持连字符、点号或斜杠。

2. **指标推送成功但仪表盘未显示数据**  
   HertzBeat 监控实例中配置的字段名称须与推送体中的指标名称或标签名称完全一致（区分大小写）。

3. **推送被拒绝且未自动创建监控**  
   HertzBeat 对可自动创建的推送监控数量有上限（默认 10,000 个）。达到上限后，来自未知 `job`/`instance` 组合的推送将被拒绝，但已存在的监控可正常接收数据。

4. **请求体过大**  
   单次推送请求默认限制为 5 MB 且最多 10,000 个采样点，请将较大的数据载荷拆分为多次请求发送。
