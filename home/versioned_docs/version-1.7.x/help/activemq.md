---
id: activemq  
title: Monitoring Apache ActiveMQ      
sidebar_label: Apache ActiveMQ   
keywords: [open source monitoring tool, monitoring Apache ActiveMQ metrics]
---

> Monitoring the running status of Apache ActiveMQ message middleware, nodes, topics and other related metrics.

**Use Protocol: JMX**

### Pre-monitoring Operations

> You need to enable the `JMX` service on ActiveMQ, HertzBeat uses the JMX protocol to collect metrics from ActiveMQ.

1. Modify the `conf/activemq.xml` file in the installation directory to enable JMX

    > Add `userJmx="true"` attribute in `broker` tag

    ```xml
    <broker xmlns="http://activemq.apache.org/schema/core" brokerName="localhost" dataDirectory="${activemq.data}" useJmx="true">
        <!-- others -->
    </broker>
    ```

2. Modify the `bin/env` file in the installation directory, configure the JMX port IP, etc.

    The original configuration information will be as follows

    ```text
    # ACTIVEMQ_SUNJMX_START="$ACTIVEMQ_SUNJMX_START -Dcom.sun.management.jmxremote.port=11099"
    # ACTIVEMQ_SUNJMX_START="$ACTIVEMQ_SUNJMX_START -Dcom.sun.management.jmxremote.password.file=${ACTIVEMQ_CONF}/jmx.password"
    # ACTIVEMQ_SUNJMX_START="$ACTIVEMQ_SUNJMX_START -Dcom.sun.management.jmxremote.access.file=${ACTIVEMQ_CONF}/jmx.access"
    # ACTIVEMQ_SUNJMX_START="$ACTIVEMQ_SUNJMX_START -Dcom.sun.management.jmxremote.ssl=false"
     
    ACTIVEMQ_SUNJMX_START="$ACTIVEMQ_SUNJMX_START -Dcom.sun.management.jmxremote"
    ```

    Update to the following configuration, ⚠️ pay attention to modify `local external IP`

    ```text
    # ACTIVEMQ_SUNJMX_START="$ACTIVEMQ_SUNJMX_START -Dcom.sun.management.jmxremote.password.file=${ACTIVEMQ_CONF}/jmx.password"
    # ACTIVEMQ_SUNJMX_START="$ACTIVEMQ_SUNJMX_START -Dcom.sun.management.jmxremote.access.file=${ACTIVEMQ_CONF}/jmx.access"
    
    ACTIVEMQ_SUNJMX_START="$ACTIVEMQ_SUNJMX_START -Dcom.sun.management.jmxremote.port=11099"
    ACTIVEMQ_SUNJMX_START="$ACTIVEMQ_SUNJMX_START -Dcom.sun.management.jmxremote.ssl=false"
    ACTIVEMQ_SUNJMX_START="$ACTIVEMQ_SUNJMX_START -Dcom.sun.management.jmxremote.authenticate=false" 
    ACTIVEMQ_SUNJMX_START="$ACTIVEMQ_SUNJMX_START -Djava.rmi.server.hostname=本机对外IP"
    
    ACTIVEMQ_SUNJMX_START="$ACTIVEMQ_SUNJMX_START -Dcom.sun.management.jmxremote"
    ```

3. Restart the ACTIVEMQ service, and add the corresponding ActiveMQ monitoring in HertzBeat. The parameters use the IP port configured by JMX.

### Configuration parameters

|    Parameter name    |                                                                           Parameter help description                                                                           |
|----------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Monitoring Host      | The peer IPV4, IPV6 or domain name to be monitored. Note ⚠️Without protocol header (eg: https://, http://).                                                                    |
| Monitoring name      | The name that identifies this monitoring, and the name needs to be unique.                                                                                                     |
| JMX port             | The HTTP port provided by JMX, the default is 11099.                                                                                                                           |
| JMX URL              | Optional, customize the JMX URL connection                                                                                                                                     |
| Username             | Username used for authentication                                                                                                                                               |
| password             | password used for authentication                                                                                                                                               |
| Acquisition Interval | Interval time for monitoring periodic data collection, in seconds, the minimum interval that can be set is 30 seconds                                                          |
| Whether to detect    | Whether to detect and check the availability of monitoring before adding monitoring, and the operation of adding and modifying will continue after the detection is successful |
| Description Remarks  | More remark information to identify and describe this monitoring, users can remark information here                                                                            |

### Collect Metrics

#### metrics: broker

|       Metric Name       | Unit |                              Description                              |
|-------------------------|------|-----------------------------------------------------------------------|
| BrokerName              | None | The name of the broker.                                               |
| BrokerVersion           | None | The version of the broker.                                            |
| Uptime                  | None | Uptime of the broker.                                                 |
| UptimeMillis            | ms   | Uptime of the broker in milliseconds.                                 |
| Persistent              | None | Messages are synchronized to disk.                                    |
| MemoryPercentUsage      | %    | Percent of memory limit used.                                         |
| StorePercentUsage       | %    | Percent of store limit used.                                          |
| TempPercentUsage        | %    | Percent of temp limit used.                                           |
| CurrentConnectionsCount | None | Attribute exposed for management                                      |
| TotalConnectionsCount   | None | Attribute exposed for management                                      |
| TotalEnqueueCount       | None | Number of messages that have been sent to the broker.                 |
| TotalDequeueCount       | None | Number of messages that have been acknowledged on the broker.         |
| TotalConsumerCount      | None | Number of message consumers subscribed to destinations on the broker. |
| TotalProducerCount      | None | Number of message producers active on destinations on the broker.     |
| TotalMessageCount       | None | Number of unacknowledged messages on the broker.                      |
| AverageMessageSize      | None | Average message size on this broker                                   |
| MaxMessageSize          | None | Max message size on this broker                                       |
| MinMessageSize          | None | Min message size on this broker                                       |

#### metrics: topic

|    Metric Name     | Unit |                                        Description                                        |
|--------------------|------|-------------------------------------------------------------------------------------------|
| Name               | None | Name of this destination.                                                                 |
| MemoryLimit        | MB   | Memory limit, in bytes, used by undelivered messages before paging to temporary storage.  |
| MemoryPercentUsage | None | The percentage of the memory limit used                                                   |
| ProducerCount      | None | Number of producers attached to this destination                                          |
| ConsumerCount      | None | Number of consumers subscribed to this destination.                                       |
| EnqueueCount       | None | Number of messages that have been sent to the destination.                                |
| DequeueCount       | None | Number of messages that has been acknowledged (and removed) from the destination.         |
| ForwardCount       | None | Number of messages that have been forwarded (to a networked broker) from the destination. |
| InFlightCount      | None | Number of messages that have been dispatched to, but not acknowledged by, consumers.      |
| DispatchCount      | None | Number of messages that has been delivered to consumers, including those not acknowledged |
| ExpiredCount       | None | Number of messages that have been expired.                                                |
| StoreMessageSize   | B    | The memory size of all messages in this destination's store.                              |
| AverageEnqueueTime | ms   | Average time a message was held on this destination.                                      |
| MaxEnqueueTime     | ms   | The longest time a message was held on this destination                                   |
| MinEnqueueTime     | ms   | The shortest time a message was held on this destination                                  |
| TotalBlockedTime   | ms   | Total time (ms) messages have been blocked by flow control                                |
| AverageMessageSize | B    | Average message size on this destination                                                  |
| MaxMessageSize     | B    | Max message size on this destination                                                      |
| MinMessageSize     | B    | Min message size on this destination                                                      |

#### metrics: memory_pool

| Metric Name | Unit | Description  |
|-------------|------|--------------|
| name        |      | metrics name |
| committed   | kb   | total size   |
| init        | kb   | init size    |
| max         | kb   | max size     |
| used        | kb   | used size    |

#### metrics: class_loading

|      Metric Name      | Unit |       Description        |
|-----------------------|------|--------------------------|
| LoadedClassCount      |      | Loaded Class Count       |
| TotalLoadedClassCount |      | Total Loaded Class Count |
| UnloadedClassCount    |      | Unloaded Class Count     |

#### metrics: thread

|       Metric Name       | Unit |        Description         |
|-------------------------|------|----------------------------|
| TotalStartedThreadCount |      | Total Started Thread Count |
| ThreadCount             |      | Thread Count               |
| PeakThreadCount         |      | Peak Thread Count          |
| DaemonThreadCount       |      | Daemon Thread Count        |
| CurrentThreadUserTime   | ms   | Current Thread User Time   |
| CurrentThreadCpuTime    | ms   | Current Thread Cpu Time    |
