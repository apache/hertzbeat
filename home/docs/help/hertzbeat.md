---
id: hertzbeat
title: Monitoring HertzBeat
sidebar_label: HertzBeat
keywords: [open source monitoring tool, HertzBeat monitoring, HertzBeat self-monitoring]
---

> Monitor the status, internal queues, JVM threads, and JVM memory of a HertzBeat server through its HTTP APIs and Actuator endpoints.

## Prerequisites

- The collector assigned to this monitor must be able to access the target HertzBeat server.
- Prepare an account that can access the HertzBeat summary, internal metrics, and Actuator metrics endpoints.
- If HTTPS is enabled on the target server, enable HTTPS in the monitor and use the corresponding HTTPS port.

The monitor collects data from `/api/summary`, `/api/metrics`, and the JVM metrics exposed under `/actuator/metrics`.

## Configuration parameters

| Parameter name      | Parameter description                                                                                                      |
|---------------------|----------------------------------------------------------------------------------------------------------------------------|
| Target Host         | IPv4 address, IPv6 address, or domain name of the HertzBeat server. Do not include `http://` or `https://`.                |
| Monitoring name     | Unique name used to identify this monitor.                                                                                 |
| Port                | Port of the HertzBeat server. The default port is `1157`.                                                                  |
| Enable HTTPS        | Whether to access the target server through HTTPS.                                                                         |
| Timeout             | Maximum time in milliseconds to wait for an HTTP response. The default value is `6000`.                                    |
| Auth Type           | HTTP authentication type. The template supports Basic Auth and Digest Auth.                                                |
| Username            | Username used to access the protected HertzBeat API and Actuator endpoints.                                                |
| Password            | Password used to access the protected HertzBeat API and Actuator endpoints.                                                |
| Collector           | Collector used to schedule data collection for this monitor.                                                              |
| Collection interval | Interval between data collections, in seconds. The minimum interval is 30 seconds.                                         |
| Bind tags           | Tags used to categorize and manage the monitored resource.                                                                |
| Description         | Additional information about the monitor.                                                                                 |

## Collection metrics

### Metric set: Summary

Provides an overview of the monitor types managed by the target HertzBeat server.

| Metric name  | Unit | Description                                      |
|--------------|------|--------------------------------------------------|
| app          | None | Monitor application type.                        |
| category     | None | Monitor category.                                |
| status       | None | Status of the monitor application type.          |
| Size         | None | Total number of monitors for this type.           |
| availableSize | None | Number of available monitors for this type.      |

### Metric set: Inner Queue

Provides the current sizes of HertzBeat internal data queues.

| Metric name                              | Unit | Description                                      |
|------------------------------------------|------|--------------------------------------------------|
| responseTime                             | ms   | Response time of the internal metrics endpoint.  |
| alertDataQueue                           | None | Number of entries in the alert data queue.       |
| metricsDataToAlertQueue                  | None | Metrics waiting to be processed by the alerter.  |
| metricsDataToPersistentStorageQueue      | None | Metrics waiting for persistent storage.          |
| metricsDataToMemoryStorageQueue          | None | Metrics waiting for in-memory storage.           |

### Metric set: Threads

Provides the number of JVM threads in each thread state.

| Metric name | Unit | Description                                  |
|-------------|------|----------------------------------------------|
| state       | None | JVM thread state.                            |
| number      | None | Number of threads in this state.             |

### Metric set: Memory Used

Provides JVM memory usage grouped by memory space.

| Metric name | Unit | Description                                  |
|-------------|------|----------------------------------------------|
| space       | None | JVM memory space name.                       |
| mem_used    | MB   | Memory used in this space.                   |

## Troubleshooting

- If collection returns `401` or `403`, verify the authentication type, username, password, and account permissions.
- If JVM thread or memory metrics cannot be collected, verify that the target server exposes the required Actuator metrics endpoints.
- When using a remote collector, do not use `localhost` unless HertzBeat is running on the same host as that collector.
