---
id: milvus
title: Monitoring Milvus
sidebar_label: Milvus Vector DB
keywords: [ open source monitoring tool, open source Milvus monitoring tool, monitoring Milvus metrics ]
---

> Collect and monitor general performance metrics of Milvus vector database.

**Protocol Used: milvus**

Milvus exposes a Prometheus-compatible metrics endpoint. HertzBeat scrapes this endpoint directly — no SDK or agent required.

**Default endpoint:** `http://<host>:9091/metrics`

Ensure the Milvus metrics port (default `9091`) is accessible from the HertzBeat collector. You can verify it manually:

```bash
curl http://<milvus-host>:9091/metrics
```

If Milvus is deployed via Helm on Kubernetes, the metrics port is exposed by default. For standalone deployments it is enabled out of the box.

**Reference:** [https://milvus.io/docs/monitor.md](https://milvus.io/docs/monitor.md)

## Configuration Parameters

| Parameter Name      | Description                                                                                                                                                              |
|---------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Monitoring Host     | Monitored IPv4, IPv6 or domain name. Note ⚠️ Do not include protocol headers (e.g. https://, http://)                                                                   |
| Monitoring Name     | Identifies this monitoring instance. Must be unique.                                                                                                                     |
| Port                | Milvus metrics port. Default: `9091`                                                                                                                                     |
| HTTPS               | Whether to connect over HTTPS. Default: false                                                                                                                            |
| Timeout             | Connection and read timeout in milliseconds. Default: `6000`                                                                                                             |
| Collection Interval | Interval for periodic data collection, unit: second. Minimum: 30 seconds                                                                                                |
| Whether to Detect   | Whether to test availability before saving. The monitor is only saved if the availability check passes.                                                                  |
| Description         | Additional notes or remarks for this monitoring instance.                                                                                                                |

## Collected Metrics

### Metric Group: milvus_proxy_req_count

*Priority 0 — collected first to determine availability.*

| Metric Name | Unit | Description |
|---|---|---|
| function_name | | Name of the RPC function called on the proxy |
| status | | Request result status (e.g. `OK`, `fail`) |
| value | | Number of requests |

### Metric Group: milvus_proxy_slow_query_count

*Priority 1*

| Metric Name | Unit | Description |
|---|---|---|
| function_name | | Name of the slow query RPC function |
| value | | Number of slow queries recorded |

### Metric Group: milvus_proxy_search_vectors_count

*Priority 2*

| Metric Name | Unit | Description |
|---|---|---|
| value | | Cumulative number of vectors searched |

### Metric Group: milvus_proxy_insert_vectors_count

*Priority 3*

| Metric Name | Unit | Description |
|---|---|---|
| value | | Cumulative number of vectors inserted |

### Metric Group: milvus_proxy_sq_latency_bucket

*Priority 4 — search/query request latency histogram buckets.*

| Metric Name | Unit | Description |
|---|---|---|
| le | | Histogram bucket upper bound (e.g. `1`, `5`, `+Inf`) |
| value | ms | Number of requests whose latency falls within this bucket |

### Metric Group: milvus_proxy_mutation_latency_bucket

*Priority 5 — insert/delete request latency histogram buckets.*

| Metric Name | Unit | Description |
|---|---|---|
| le | | Histogram bucket upper bound |
| value | ms | Number of mutation requests whose latency falls within this bucket |

### Metric Group: milvus_querynode_collection_num

*Priority 6*

| Metric Name | Unit | Description |
|---|---|---|
| node_id | | QueryNode instance identifier |
| value | | Number of collections currently loaded on this node |

### Metric Group: milvus_querynode_entity_num

*Priority 7*

| Metric Name | Unit | Description |
|---|---|---|
| node_id | | QueryNode instance identifier |
| value | | Number of entities currently loaded on this node |

### Metric Group: milvus_rootcoord_collection_num

*Priority 8*

| Metric Name | Unit | Description |
|---|---|---|
| value | | Total number of collections managed by RootCoord |

### Metric Group: milvus_rootcoord_partition_num

*Priority 9*

| Metric Name | Unit | Description |
|---|---|---|
| value | | Total number of partitions managed by RootCoord |

### Metric Group: milvus_rootcoord_dml_req_count

*Priority 10*

| Metric Name | Unit | Description |
|---|---|---|
| status | | DML request result status |
| value | | Total DML (insert/delete) request count |

### Metric Group: milvus_rootcoord_ddl_req_count

*Priority 11*

| Metric Name | Unit | Description |
|---|---|---|
| status | | DDL request result status |
| value | | Total DDL (schema/collection) request count |
