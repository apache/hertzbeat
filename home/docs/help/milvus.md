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

### Metric Group: availability

*Priority 0 — collected first. All other groups only run if this succeeds.*

| Metric Name  | Unit | Description                                |
|--------------|------|--------------------------------------------|
| responseTime | ms   | Time taken to receive a response from Milvus |

### Metric Group: proxy_metrics

*Covers the Milvus Proxy layer, which handles all inbound client requests.*

| Metric Name                      | Unit | Description                                              |
|----------------------------------|------|----------------------------------------------------------|
| milvus_proxy_req_count           |      | Total number of requests received by the proxy           |
| milvus_proxy_slow_query_count    |      | Number of slow queries recorded                          |
| milvus_proxy_search_vectors_count|      | Cumulative number of vectors searched                    |
| milvus_proxy_insert_vectors_count|      | Cumulative number of vectors inserted                    |
| milvus_proxy_sq_latency_sum      | ms   | Total search/query request latency                       |
| milvus_proxy_sq_latency_count    |      | Total number of search/query requests                    |
| milvus_proxy_mutation_latency_sum| ms   | Total latency of insert/delete (mutation) requests       |
| milvus_proxy_receive_bytes_count | B    | Bytes received for insert/delete operations              |
| milvus_proxy_send_bytes_count    | B    | Bytes sent back to clients (query results)               |

### Metric Group: querynode_metrics

*Covers the QueryNode component, which executes searches against loaded segments.*

| Metric Name                            | Unit | Description                                    |
|----------------------------------------|------|------------------------------------------------|
| milvus_querynode_collection_num        |      | Number of collections currently loaded         |
| milvus_querynode_entity_num            |      | Number of entities currently loaded            |
| milvus_querynode_search_req_latency_sum| ms   | Total latency of search requests on this node  |
| milvus_querynode_search_group_nq_sum   |      | Total NQ (number of query vectors) in batches  |
| milvus_querynode_evicted_memory_size   | B    | Memory evicted from the node                   |

### Metric Group: rootcoord_metrics

*Covers the RootCoord component, which manages metadata and DDL/DML coordination.*

| Metric Name                      | Unit | Description                            |
|----------------------------------|------|----------------------------------------|
| milvus_rootcoord_collection_num  |      | Total number of collections            |
| milvus_rootcoord_partition_num   |      | Total number of partitions             |
| milvus_rootcoord_dml_req_count   |      | Total DML (insert/delete) request count |
| milvus_rootcoord_ddl_req_count   |      | Total DDL (schema/collection) request count |
