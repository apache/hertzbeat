---
id: rabbitmq  
title: Monitoring RabbitMQ
sidebar_label: RabbitMQ Monitor   
keywords: [open source monitoring tool, open source rabbitmq monitoring tool, monitoring rabbitmq metrics]
---

> Monitoring the running status of RabbitMQ message middleware, nodes, topics and other related metrics.

### Pre-monitoring Operations

> HertzBeat uses RabbitMQ Management's Rest Api to collect RabbitMQ metric data.
> Therefore, you need to enable the Management plug-in in your RabbitMQ environment

1. Open the Management plugin, or use the self-opening version

    ```shell
    rabbitmq-plugins enable rabbitmq_management
    ```

2. Access <http://ip:15672/> with a browser, and the default account password is `guest/guest`. Successful login means that it is successfully opened.

3. Just add the corresponding RabbitMQ monitoring in HertzBeat, the parameters use the IP port of Management, and the default account password.

### Configuration parameters

|    Parameter name    |                                                                           Parameter help description                                                                           |
|----------------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Monitoring Host      | The peer IPV4, IPV6 or domain name to be monitored. Note ⚠️Without protocol header (eg: https://, http://).                                                                    |
| Monitoring name      | The name that identifies this monitoring, and the name needs to be unique.                                                                                                     |
| Port                 | The HTTP port provided by RabbitMQ Management, the default is 15672.                                                                                                           |
| Username             | Username used for interface Basic authentication                                                                                                                               |
| Password             | The password used for interface Basic authentication                                                                                                                           |
| Timeout              | HTTP request query timeout                                                                                                                                                     |
| Acquisition Interval | Interval time for monitoring periodic data collection, in seconds, the minimum interval that can be set is 30 seconds                                                          |
| Whether to detect    | Whether to detect and check the availability of monitoring before adding monitoring, and the operation of adding and modifying will continue after the detection is successful |
| Description Remarks  | More remark information to identify and describe this monitoring, users can remark information here                                                                            |

### Collect Metrics

#### metrics: overview

|    Metric Name     | Metric Unit |         Metric Description         |
|--------------------|-------------|------------------------------------|
| product_version    | None        | Product Version                    |
| product_name       | None        | Product name                       |
| rabbitmq_version   | none        | rabbitmq version                   |
| management_version | None        | rabbitmq management plugin version |
| erlang_version     | None        | erlang version                     |
| cluster_name       | None        | Cluster name                       |
| rates_mode         | None        | rates mode                         |

#### metrics: object_totals

| Metric Name | Metric Unit |     Metric Description      |
|-------------|-------------|-----------------------------|
| channels    | none        | total number of channels    |
| connections | none        | total number of connections |
| consumers   | none        | total number of consumers   |
| exchanges   | none        | total number of exchanges   |
| queues      | none        | total number of queues      |

#### metrics: nodes

|    Metric Name     | Metric Unit |                    Metric Description                     |
|--------------------|-------------|-----------------------------------------------------------|
| name               | None        | The node name                                             |
| type               | None        | The node type                                             |
| running            | None        | Running state                                             |
| os_pid             | None        | Pid in OS                                                 |
| mem_limit          | MB          | Memory usage high watermark                               |
| mem_used           | MB          | Total amount of memory used                               |
| fd_total           | None        | File descriptors available                                |
| fd_used            | None        | File descriptors used                                     |
| sockets_total      | None        | Sockets available                                         |
| sockets_used       | None        | Sockets used                                              |
| proc_total         | None        | Erlang process limit                                      |
| proc_used          | None        | Erlang processes used                                     |
| disk_free_limit    | GB          | Free disk space low watermark                             |
| disk_free          | GB          | Free disk space                                           |
| gc_num             | None        | GC runs                                                   |
| gc_bytes_reclaimed | MB          | Bytes reclaimed by GC                                     |
| context_switches   | None        | Context_switches num                                      |
| io_read_count      | None        | Total number of read operations                           |
| io_read_bytes      | KB          | Total data size read into disk                            |
| io_read_avg_time   | ms          | Average read operation time in milliseconds               |
| io_write_count     | None        | Total disk write operations                               |
| io_write_bytes     | KB          | Total amount of data written to disk                      |
| io_write_avg_time  | ms          | Average time of each disk write operation in milliseconds |
| io_seek_count      | None        | total seek operation                                      |
| io_seek_avg_time   | ms          | average seek operation time, in milliseconds              |
| io_sync_count      | None        | total amount of fsync operations                          |
| io_sync_avg_time   | ms          | Average time of fsync operation in milliseconds           |
| connection_created | None        | connection created num                                    |
| connection_closed  | None        | connection closed num                                     |
| channel_created    | None        | channel created num                                       |
| channel_closed     | None        | channel closed num                                        |
| queue_declared     | None        | queue declared num                                        |
| queue_created      | None        | queue created num                                         |
| queue_deleted      | None        | queue deleted num                                         |
| connection_closed  | None        | connection closed num                                     |

#### metrics: queues

|         Metric Name          | Metric Unit |                                                          Metric Description                                                          |
|------------------------------|-------------|--------------------------------------------------------------------------------------------------------------------------------------|
| name                         | None        | The name of the queue with non-ASCII characters escaped as in C.                                                                     |
| node                         | None        | The queue on the node name                                                                                                           |
| state                        | None        | The state of the queue. Normally "running", but may be "{syncing, message_count}" if the queue is synchronising.                     |
| type                         | None        | Queue type, one of: quorum, stream, classic.                                                                                         |
| vhost                        | None        | vhost path                                                                                                                           |
| auto_delete                  | None        | Whether the queue will be deleted automatically when no longer used                                                                  |
| policy                       | None        | Effective policy name for the queue.                                                                                                 |
| consumers                    | None        | Number of consumers.                                                                                                                 |
| memory                       | B           | Bytes of memory allocated by the runtime for the queue, including stack, heap and internal structures.                               |
| messages_ready               | None        | Number of messages ready to be delivered to clients                                                                                  |
| messages_unacknowledged      | None        | Number of messages delivered to clients but not yet acknowledged                                                                     |
| messages                     | None        | Sum of ready and unacknowledged messages (queue depth)                                                                               |
| messages_ready_ram           | None        | Number of messages from messages_ready which are resident in ram                                                                     |
| messages_persistent          | None        | Total number of persistent messages in the queue (will always be 0 for transient queues)                                             |
| message_bytes                | B           | Sum of the size of all message bodies in the queue. This does not include the message properties (including headers) or any overhead |
| message_bytes_ready          | B           | Like message_bytes but counting only those messages ready to be delivered to clients                                                 |
| message_bytes_unacknowledged | B           | Like message_bytes but counting only those messages delivered to clients but not yet acknowledged                                    |
| message_bytes_ram            | B           | Like message_bytes but counting only those messages which are currently held in RAM                                                  |
| message_bytes_persistent     | B           | Like message_bytes but counting only those messages which are persistent                                                             |
