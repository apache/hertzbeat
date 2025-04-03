---
id: pulsar  
title: Monitoring Pulsar Monitoring  
sidebar_label: Apache Pulsar
keywords: [open-source monitoring system, open-source database monitoring, HbaseMaster monitoring]
---

> Collecting and monitoring general performance metrics of Pulsar

**Protocol Used: HTTP**

## Configuration Parameters

|   Parameter Name    |                                                        Description                                                         |
|---------------------|----------------------------------------------------------------------------------------------------------------------------|
| Target Host         | The monitored endpoint's IPV4, IPV6, or domain name. Note⚠️: Do not include the protocol header (e.g., https://, http://). |
| Port                | The webServicePort value of Pulsar, default is 8080.                                                                       |
| Task Name           | The name identifying this monitoring task, must be unique.                                                                 |
| Query Timeout       | Set the connection timeout in milliseconds, default is 3000 milliseconds.                                                  |
| Monitoring Interval | Interval time for periodic data collection, in seconds, minimum interval is 30 seconds.                                    |
| Binding Tags        | Used for categorizing monitoring resources.                                                                                |
| Description/Remarks | Additional notes and descriptions for this monitoring task. Users can add more information here.                           |

### Collected Metrics

#### Metric Set: Version Information

| Metric Name  | Unit |     Description     |
|--------------|------|---------------------|
| Version Info | NONE | Version Information |

#### Metric Set: process_start_time_seconds

|    Metric Name     | Unit |    Description     |
|--------------------|------|--------------------|
| Process Start Time | NONE | Process Start Time |

#### Metric Set: process_open_fds

|      Metric Name      | Unit |           Description           |
|-----------------------|------|---------------------------------|
| Open File Descriptors | NONE | Number of Open File Descriptors |

#### Metric Set: process_max_fds

|     Metric Name      | Unit |            Description             |
|----------------------|------|------------------------------------|
| Max File Descriptors | NONE | Maximum Number of File Descriptors |

#### Metric Set: jvm_memory_pool_allocated_bytes

Number of bytes of memory allocated in a specific memory pool in the Java Virtual Machine (JVM). In Pulsar, this typically refers to the amount of memory allocated for various purposes in the JVM (such as heap memory, non-heap memory, etc.).

#### Metric Set: jvm_memory_pool_used_bytes

Unlike allocated_bytes, this metric shows the actual used memory, not just the allocated memory.

#### Metric Set: jvm_memory_pool_committed_bytes

Number of bytes of memory committed in a specific memory pool in the JVM. In the JVM, committed memory is the amount of memory guaranteed to be available for the application to use. This portion of memory is typically locked by the operating system to reduce swapping or garbage collection.

#### Metric Set: jvm_memory_pool_max_bytes

Maximum number of bytes of memory that can be allocated in a specific memory pool in the JVM. This is the upper limit on memory usage for that memory pool and helps in setting the memory usage cap.

#### Metric Set: pulsar_broker_publish_latency

Message publishing latency on the broker side.

#### Metric Set: pulsar_metadata_store_ops_latency_ms

Latency of metadata store operations on the broker side.
