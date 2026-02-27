---
id: shenyu  
title: Monitoring：Apache ShenYu API Gateway      
sidebar_label: Apache ShenYu  
keywords: [open source monitoring tool, open source apache shenyu monitoring tool, monitoring apache shenyu metrics]
---

> monitor ShenYu running status(JVM-related), include request response and other related metrics.

## Pre-monitoring operations

Enable `metrics` plugin in ShenYu, expose it's prometheus metrics endpoint。

Refer [ShenYu Document](https://shenyu.apache.org/docs/plugin-center/observability/metrics-plugin)

Two Steps Mainly:

1. add metrics plugin dependency in gateway's pom.xml.

    ```xml
    <dependency>
        <groupId>org.apache.shenyu</groupId>
        <artifactId>shenyu-spring-boot-starter-plugin-metrics</artifactId>
        <version>${project.version}</version>
    </dependency>
    ```

2. modify this config in shenyu gateway yaml.

    ```yaml
    shenyu:
      metrics:
        enabled: false #false is close, true is open
        name : prometheus 
        host: 127.0.0.1 
        port: 8090 
        jmxConfig: 
        props:
          jvm_enabled: true #enable jvm monitoring
    ```

Finally, restart the access gateway metrics endpoint `http://ip:8090` to respond to prometheus format data.

### Configuration parameters

| Parameter name | Parameter help description |
|--------|----------------------------------------- --------------|
| Monitoring Host | The peer IPV4, IPV6 or domain name to be monitored. Note ⚠️Without protocol header (eg: https://, http://). |
| Monitoring name | The name that identifies this monitoring, and the name needs to be unique. |
| Port | The port provided by the gateway Metric interface, the default is 8090. |
| Timeout | HTTP request response timeout |
| Acquisition Interval | Interval time for monitoring periodic data collection, in seconds, the minimum interval that can be set is 30 seconds |
| Whether to detect | Whether to detect and check the availability of monitoring before adding monitoring, and the operation of adding and modifying will continue after the detection is successful |
| Description Remarks | More remark information to identify and describe this monitoring, users can remark information here |

### Collect metrics

#### Index collection: shenyu_request_total

| Metric Name | Metric Unit |         Metric Help Description          |
|-------------|-------------|------------------------------------------|
| value       | None        | Collect all requests from ShenYu gateway |

#### Metric collection: shenyu_request_throw_created

| Metric Name | Metric Unit |                   Metric Help Description                   |
|-------------|-------------|-------------------------------------------------------------|
| value       | None        | Collect the number of abnormal requests from ShenYu Gateway |

#### Metric collection: process_cpu_seconds_total

| Metric Name | Metric Unit |          Metric Help Description          |
|-------------|-------------|-------------------------------------------|
| value       | none        | total user and system CPU elapsed seconds |

#### Metric collection: process_open_fds

| Metric Name | Metric Unit |     Metric Help Description     |
|-------------|-------------|---------------------------------|
| value       | none        | number of open file descriptors |

#### Metric collection: process_max_fds

| Metric Name | Metric Unit |         Metric Help Description         |
|-------------|-------------|-----------------------------------------|
| value       | none        | maximum number of open file descriptors |

#### Metric collection: jvm_info

| Metric Name | Metric Unit | Metric Help Description |
|-------------|-------------|-------------------------|
| runtime     | none        | JVM version information |
| vendor      | none        | JVM version information |
| version     | None        | JVM version information |

#### Metric collection: jvm_memory_bytes_used

| Metric Name | Metric Unit |         Metric Help Description          |
|-------------|-------------|------------------------------------------|
| area        | None        | JVM memory area                          |
| value       | MB          | used size of the given JVM memory region |

#### Metric collection: jvm_memory_pool_bytes_used

| Metric Name | Metric Unit |        Metric Help Description         |
|-------------|-------------|----------------------------------------|
| pool        | None        | JVM memory pool                        |
| value       | MB          | used size of the given JVM memory pool |

#### Metric collection: jvm_memory_pool_bytes_committed

| Metric Name | Metric Unit |             Metric Help Description             |
|-------------|-------------|-------------------------------------------------|
| pool        | None        | JVM memory pool                                 |
| value       | MB          | The committed size of the given JVM memory pool |

#### Metric collection: jvm_memory_pool_bytes_max

| Metric Name | Metric Unit |                Metric Help Description                |
|-------------|-------------|-------------------------------------------------------|
| pool        | None        | JVM memory pool                                       |
| value       | MB          | The maximum size of the memory pool for the given JVM |

#### Metric collection: jvm_threads_state

| Metric Name | Metric Unit |                 Metric Help Description                 |
|-------------|-------------|---------------------------------------------------------|
| state       | none        | thread state                                            |
| value       | None        | The number of threads corresponding to the thread state |
