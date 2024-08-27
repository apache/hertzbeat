---
id: iotdb  
title: Monitoring Apache IoTDB Database      
sidebar_label: IoTDB Database    
keywords: [open source monitoring tool, open source database monitoring tool, monitoring IotDB database metrics]
---

> Monitor the running status of the Apache IoTDB Internet of Things time series database (JVM-related), memory task clusters and other related Metrics.

## Operation before monitoring

You need to enable the `metrics` function in IoTDB, which will provide interface data in the form of prometheus metrics.

To enable the `metrics` function, refer to [Official Documentation](https://iotdb.apache.org/UserGuide/V0.13.x/Maintenance-Tools/Metric-Tool.html)

The main steps are as follows:

1. The metric collection is disabled by default, you need to modify the parameters in `conf/iotdb-metric.yml` first, then restart the server

    ```yaml
    # Whether to start the monitoring module, the default is false
    enableMetric: true
    
    # Whether to enable operation delay statistics
    enablePerformanceStat: false
    
    # Data provision method, externally provide metrics data through jmx and prometheus protocol, optional parameters: [JMX, PROMETHEUS, IOTDB], IOTDB is closed by default.
    metricReporterList:
       - JMX
       - PROMETHEUS
    
    # The metric architecture used at the bottom layer, optional parameters: [MICROMETER, DROPWIZARD]
    monitorType: MICROMETER
    
    # Initialize the level of the metric, optional parameters: [CORE, IMPORTANT, NORMAL, ALL]
    metricLevel: IMPORTANT
    
    # Predefined metrics set, optional parameters: [JVM, LOGBACK, FILE, PROCESS, SYSTEM]
    predefinedMetrics:
       - JVM
       - FILE
    ```

2. Restart IoTDB, open a browser or use curl to access http://servier_ip:9091/metrics, and you can see the metric data.

3. Add the corresponding IoTDB monitoring in HertzBeat.

### Configuration parameters

| Parameter name | Parameter help description |
|--------|----------------------------------------- --------------|
| Monitoring Host | The peer IPV4, IPV6 or domain name to be monitored. Note ⚠️Without protocol header (eg: https://, http://). |
| Monitoring name | The name that identifies this monitoring, and the name needs to be unique. |
| Port | The port provided by the IoTDB Metric interface, which is 9091 by default. |
| Timeout | HTTP request query timeout |
| Acquisition Interval | Interval time for monitoring periodic data collection, in seconds, the minimum interval that can be set is 30 seconds |
| Whether to detect | Whether to detect and check the availability of monitoring before adding monitoring, and the operation of adding and modifying will continue after the detection is successful |
| Description Remarks | More remark information to identify and describe this monitoring, users can remark information here |

### Collect metrics

#### Metric collection: cluster_node_status

| Metric Name | Metric Unit |     Metric Help Description     |
|-------------|-------------|---------------------------------|
| name        | None        | Node name IP                    |
| status      | None        | Node status, 1=online 2=offline |

#### Metric collection: jvm_memory_committed_bytes

| Metric Name | Metric Unit |            Metric Help Description             |
|-------------|-------------|------------------------------------------------|
| area        | none        | heap memory or nonheap memory                  |
| id          | none        | memory block                                   |
| value       | MB          | The memory size currently requested by the JVM |

#### Metric collection: jvm_memory_used_bytes

| Metric Name | Metric Unit |    Metric Help Description    |
|-------------|-------------|-------------------------------|
| area        | none        | heap memory or nonheap memory |
| id          | none        | memory block                  |
| value       | MB          | JVM used memory size          |

#### Metric collection: jvm_threads_states_threads

| Metric Name | Metric Unit |                 Metric Help Description                 |
|-------------|-------------|---------------------------------------------------------|
| state       | none        | thread state                                            |
| count       | None        | The number of threads corresponding to the thread state |

#### Index collection: quantity business data

| Metric Name | Metric Unit | Metric Help Description |
|--|------|----------------|
| name | None | Business name timeSeries/storageGroup/device/deviceUsingTemplate |
| type | none | type total/normal/template/template |
| value | None | The current timeSeries/storageGroup/device/The number of devices that have activated the template |

#### Metric collection: cache_hit cache

| Metric Name | Metric Unit | Metric Help Description |
| ----------- |------|------------------------------ ----------------------|
| name | None | Cache name chunk/timeSeriesMeta/bloomFilter |
| value | % | chunk/timeSeriesMeta cache hit rate, bloomFilter interception rate |

#### Metric collection: queue task queue

| Metric Name | Metric Unit | Metric Help Description |
| ----------- |------|------------------------------ ---------------------|
| name | None | Queue name compaction_inner/compaction_cross/flush |
| status | none | status running/waiting |
| value | None | Number of tasks at current time |

#### Metric collection: thrift_connections

| Metric Name | Metric Unit |     Metric Help Description      |
|-------------|-------------|----------------------------------|
| name        | None        | name                             |
| connection  | none        | thrift current connection number |
