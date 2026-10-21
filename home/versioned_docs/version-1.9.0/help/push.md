---
id: push
title: Monitoring：Push Style Monitor
sidebar_label: Push Style Monitor
keywords: [open source monitoring tool, open source push monitoring tool, monitoring push metrics]
---

> HertzBeat actively collects metrics from targets on a schedule. Push Style Monitor reverses that model — your application pushes Prometheus-format metrics to HertzBeat, which is useful for short-lived jobs, batch processes, or services behind firewalls.

## How It Works

1. HertzBeat exposes a Prometheus-compatible push endpoint.
2. Your application POSTs metrics in **Prometheus text exposition format** to that endpoint using a `job` name and an `instance` name.
3. On the first push for a new `job`/`instance` pair, HertzBeat automatically creates a monitor for it.
4. Subsequent pushes update the metrics stored under that monitor.

## Push Endpoint

```http
POST http://{hertzbeat-host}:{port}/api/push/prometheus/job/{job}/instance/{instance}
Content-Type: text/plain
```

| Path segment | Description | Example |
|---|---|---|
| `{hertzbeat-host}` | Address of the HertzBeat server | `127.0.0.1` |
| `{port}` | HertzBeat HTTP port (default `1157`) | `1157` |
| `{job}` | Logical name for the application (alphanumeric and `_` only) | `my_app` |
| `{instance}` | Instance identifier within that job (alphanumeric and `_` only) | `server_1` |

## Metrics Format

The request body must follow the **Prometheus text exposition format**. Each non-comment, non-empty line defines one sample:

```promtail
# HELP http_requests_total Total HTTP requests handled
# TYPE http_requests_total counter
http_requests_total{method="GET",status="200"} 1234
http_requests_total{method="POST",status="200"} 56

# HELP cpu_usage_percent Current CPU utilization
# TYPE cpu_usage_percent gauge
cpu_usage_percent 72.5

# HELP memory_used_bytes Memory currently in use
# TYPE memory_used_bytes gauge
memory_used_bytes 536870912
```

## Configuration Parameters

| Parameter | Description |
|---|---|
| Push Module Host | Address of the HertzBeat server your application will push to. Default: `127.0.0.1` |
| Port | HertzBeat HTTP port. Default: `1157` |
| Metrics Fields | Define the metric field names and their types (Number / String) that HertzBeat should expect |

## Example: Shell (curl)

```bash
curl -X POST \
  http://localhost:1157/api/push/prometheus/job/my_app/instance/server_1 \
  -H 'Content-Type: text/plain' \
  --data-binary @- << 'EOF'
# HELP cpu_usage_percent Current CPU utilization
# TYPE cpu_usage_percent gauge
cpu_usage_percent{core="0"} 45.2
cpu_usage_percent{core="1"} 38.7

# HELP memory_used_bytes Memory currently in use
# TYPE memory_used_bytes gauge
memory_used_bytes 1073741824
EOF
```

## Example: Python

```python
import requests

def push_metrics(host: str, port: int, job: str, instance: str, body: str) -> None:
    url = f"http://{host}:{port}/api/push/prometheus/job/{job}/instance/{instance}"
    response = requests.post(url, data=body, headers={"Content-Type": "text/plain"})
    response.raise_for_status()

metrics_body = """\
# HELP request_duration_seconds Request latency
# TYPE request_duration_seconds gauge
request_duration_seconds{endpoint="/api/v1/users"} 0.023
"""

push_metrics("localhost", 1157, "my_app", "server_1", metrics_body)
```

## Example: Java

```java
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

String body = """
        # HELP jvm_memory_used_bytes JVM heap memory currently in use
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

## Common Problems

1. **`Request not matched` response**  
   The `{job}` and `{instance}` path segments only accept alphanumeric characters and underscores (`[a-zA-Z0-9_]`). Hyphens, dots, and slashes are not accepted.

2. **Metrics not appearing in the dashboard**  
   Metric field names in the HertzBeat monitor configuration must match the metric names (or label names) in the body you are pushing exactly, including case.

3. **Push rejected with no monitor created**  
   HertzBeat caps the number of push monitors it will auto-create (default: 10,000). If the cap is reached, pushes from unknown `job`/`instance` pairs are rejected. Existing monitors continue to receive data normally.

4. **Body too large**  
   Single push requests are limited to 5 MB and 10,000 samples by default. Split large payloads across multiple requests.
