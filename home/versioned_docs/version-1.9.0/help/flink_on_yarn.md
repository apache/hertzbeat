# Flink On Yarn Monitoring

> Measurement and monitoring of general metrics for Flink stream engine in Yarn running mode.

## Configuration Parameters

|   Parameter Name    |                                             Parameter Help Description                                              |
|---------------------|---------------------------------------------------------------------------------------------------------------------|
| Monitoring Host     | The monitored peer's IPV4, IPV6, or domain name. Note ⚠️ do not include protocol headers (e.g., https://, http://). |
| Task Name           | The name identifying this monitoring task. The name must be unique.                                                 |
| Yarn Port           | The Yarn port, corresponding to the port in `yarn.resourcemanager.webapp.address`.                                  |
| Query Timeout       | The timeout for JVM connections, in milliseconds, default is 3000 ms.                                               |
| Enable SSL          | Whether to enable SSL                                                                                               |
| Username            | Connection username                                                                                                 |
| Password            | Connection password                                                                                                 |
| Monitoring Interval | Interval for periodic data collection, in seconds, minimum interval is 30 seconds.                                  |
| Tags                | Used for categorizing and managing monitoring resources.                                                            |
| Description         | Additional notes and descriptions for this monitoring task. Users can add notes here.                               |

### Collected Metrics

#### Metrics Set: JobManager Metrics

|                      Metric Name                      | Metric Unit |              Metric Help Description               |
|-------------------------------------------------------|-------------|----------------------------------------------------|
| Status.JVM.Memory.NonHeap.Committed                   | Bytes       | Non-heap memory committed                          |
| Status.JVM.Memory.Mapped.TotalCapacity                | Bytes       | Total capacity of mapped memory                    |
| Status.JVM.Memory.NonHeap.Used                        | Bytes       | Non-heap memory used                               |
| Status.JVM.Memory.Metaspace.Max                       | Bytes       | Maximum capacity of metaspace                      |
| Status.JVM.GarbageCollector.G1_Old_Generation.Count   | Count       | Count of old generation garbage collections        |
| Status.JVM.Memory.Direct.MemoryUsed                   | Bytes       | Direct memory used                                 |
| Status.JVM.Memory.Mapped.MemoryUsed                   | Bytes       | Mapped memory used                                 |
| Status.JVM.GarbageCollector.G1_Young_Generation.Count | Count       | Count of young generation garbage collections      |
| Status.JVM.Memory.Direct.TotalCapacity                | Bytes       | Total capacity of direct memory                    |
| Status.JVM.GarbageCollector.G1_Old_Generation.Time    | ms          | Time spent on old generation garbage collections   |
| Status.JVM.Memory.Heap.Committed                      | Bytes       | Heap memory committed                              |
| Status.JVM.Memory.Mapped.Count                        | Count       | Count of mapped memory                             |
| Status.JVM.Memory.Metaspace.Used                      | Bytes       | Metaspace memory used                              |
| Status.JVM.Memory.Direct.Count                        | Count       | Count of direct memory                             |
| Status.JVM.Memory.Heap.Used                           | Bytes       | Heap memory used                                   |
| Status.JVM.Memory.Heap.Max                            | Bytes       | Maximum capacity of heap memory                    |
| Status.JVM.GarbageCollector.G1_Young_Generation.Time  | ms          | Time spent on young generation garbage collections |
| Status.JVM.Memory.NonHeap.Max                         | Bytes       | Maximum capacity of non-heap memory                |

#### Metrics Set: JobManager Config

|                Metric Name                 | Metric Unit |              Metric Help Description               |
|--------------------------------------------|-------------|----------------------------------------------------|
| internal.jobgraph-path                     | -           | Internal job graph path                            |
| env.java.home                              | -           | Java environment path                              |
| classloader.check-leaked-classloader       | -           | Whether to check for leaked class loaders          |
| env.java.opts                              | -           | Java options                                       |
| high-availability.cluster-id               | -           | High availability cluster ID                       |
| jobmanager.rpc.address                     | -           | JobManager's RPC address                           |
| jobmanager.memory.jvm-overhead.min         | Bytes       | Minimum JVM overhead for JobManager                |
| jobmanager.web.port                        | Port        | JobManager's Web port                              |
| webclient.port                             | Port        | Web client port                                    |
| execution.savepoint.ignore-unclaimed-state | -           | Whether to ignore unclaimed state                  |
| io.tmp.dirs                                | Path        | Temporary file directories                         |
| parallelism.default                        | -           | Default parallelism                                |
| taskmanager.memory.fraction                | -           | TaskManager memory fraction                        |
| taskmanager.numberOfTaskSlots              | -           | Number of task slots for TaskManager               |
| yarn.application.name                      | -           | Yarn application name                              |
| taskmanager.heap.mb                        | MB          | Heap memory size for TaskManager                   |
| taskmanager.memory.process.size            | GB          | Process memory size for TaskManager                |
| web.port                                   | Port        | Web port                                           |
| classloader.resolve-order                  | -           | Class loader resolve order                         |
| jobmanager.heap.mb                         | MB          | Heap memory size for JobManager                    |
| jobmanager.memory.off-heap.size            | Bytes       | Off-heap memory size for JobManager                |
| state.backend.incremental                  | -           | Whether the state backend is incremental           |
| execution.target                           | -           | Execution target                                   |
| jobmanager.memory.process.size             | GB          | Process memory size for JobManager                 |
| web.tmpdir                                 | Path        | Web temporary directory                            |
| yarn.ship-files                            | Path        | Yarn shipped files                                 |
| jobmanager.rpc.port                        | Port        | JobManager's RPC port                              |
| internal.io.tmpdirs.use-local-default      | -           | Whether to use local default temporary directories |
| execution.checkpointing.interval           | ms          | Checkpointing interval                             |
| execution.attached                         | -           | Whether to execute attached                        |
| internal.cluster.execution-mode            | -           | Internal cluster execution mode                    |
| execution.shutdown-on-attached-exit        | -           | Whether to shutdown on attached exit               |
| pipeline.jars                              | Path        | Pipeline JAR files                                 |
| rest.address                               | -           | REST address                                       |
| state.backend                              | -           | State backend type                                 |
| jobmanager.memory.jvm-metaspace.size       | Bytes       | JVM metaspace size for JobManager                  |
| $internal.deployment.config-dir            | Path        | Internal deployment configuration directory        |
| $internal.yarn.log-config-file             | Path        | Internal Yarn log configuration file path          |
| jobmanager.memory.heap.size                | Bytes       | Heap memory size for JobManager                    |
| state.checkpoints.dir                      | Path        | State checkpoints directory                        |
| jobmanager.memory.jvm-overhead.max         | Bytes       | Maximum JVM overhead for JobManager                |

#### TaskManager Metrics

|              Metric Name              | Metric Unit |              Metric Help Description              |
|---------------------------------------|-------------|---------------------------------------------------|
| Container ID                          | -           | Container ID for uniquely identifying a container |
| Path                                  | -           | Container path                                    |
| Data Port                             | Port        | Data transmission port                            |
| JMX Port                              | Port        | JMX (Java Management Extensions) port             |
| Last Heartbeat                        | Timestamp   | Last heartbeat time                               |
| All Slots                             | Count       | Total number of task slots in the container       |
| Free Slots                            | Count       | Number of free task slots in the container        |
| totalResourceCpuCores                 | Cores       | Total number of CPU cores in the container        |
| totalResourceTaskHeapMemory           | MB          | Total task heap memory size in the container      |
| totalResourceManagedMemory            | MB          | Total managed memory size in the container        |
| totalResourceNetworkMemory            | MB          | Total network memory size in the container        |
| freeResourceCpuCores                  | Cores       | Number of free CPU cores in the container         |
| freeResourceTaskHeapMemory            | MB          | Free task heap memory size in the container       |
| freeResourceTaskOffHeapMemory         | MB          | Free task off-heap memory size in the container   |
| freeResourceManagedMemory             | MB          | Free managed memory size in the container         |
| freeResourceNetworkMemory             | MB          | Free network memory size in the container         |
| CPU Cores                             | Cores       | Number of CPU cores                               |
| Physical MEM                          | MB          | Size of physical memory                           |
| JVM Heap Size                         | MB          | Size of JVM heap memory                           |
| Flink Managed MEM                     | MB          | Size of Flink managed memory                      |
| Framework Heap                        | MB          | Size of framework heap memory                     |
| Task Heap                             | MB          | Size of task heap memory                          |
| Framework Off-Heap                    | MB          | Size of framework off-heap memory                 |
| memoryConfigurationTaskOffHeap        | Bytes       | Task off-heap memory configuration                |
| Network                               | MB          | Network memory configuration                      |
| Managed Memory                        | MB          | Managed memory configuration                      |
| JVM Metaspace                         | MB          | Size of JVM metaspace                             |
| JVM Overhead                          | MB          | JVM overhead                                      |
| memoryConfigurationTotalFlinkMemory   | Bytes       | Total Flink memory configuration                  |
| memoryConfigurationTotalProcessMemory | Bytes       | Total process memory configuration                |

#### TaskManager Status Metrics

|            Metric Name            | Metric Unit |      Metric Help Description       |
|-----------------------------------|-------------|------------------------------------|
| Status.Shuffle.Netty.TotalMemory  | MB          | Total memory used by Netty Shuffle |
| Status.Flink.Memory.Managed.Used  | MB          | Managed memory used by Flink       |
| Status.JVM.Memory.Metaspace.Used  | MB          | Used JVM metaspace memory          |
| Status.JVM.Memory.Metaspace.Max   | MB          | Maximum JVM metaspace memory       |
| Status.JVM.Memory.Heap.Used       | MB          | Used JVM heap memory               |
| Status.JVM.Memory.Heap.Max        | MB          | Maximum JVM heap memory            |
| Status.Flink.Memory.Managed.Total | MB          | Total managed memory by Flink      |
| Status.Shuffle.Netty.UsedMemory   | MB          | Used memory by Netty Shuffle       |
