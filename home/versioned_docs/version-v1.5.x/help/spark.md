---
id: spark
title: Monitoring Spark
sidebar_label: Spark Monitor
keywords: [open source monitoring tool, open source java spark monitoring tool, monitoring spark metrics]
---

> Collect and monitor the general performance Metrics of Spark.

**Protocol Use：JMX**

### Spark App Enable JMX Protocol

1. Add Spark `VM options` When Start Server ⚠️ customIP

Refer: <https://spark.apache.org/docs/latest/spark-standalone.html>

**Monitoring configuration spark can be monitored by Master, Worker, driver, and executor. The Master and Worker can be monitored when the spark cluster is running, while the Driver and Excutor need to be monitored for an app.**
**If you want to monitor them, perform the following steps to configure them**

## First step

**Modify $SPARK_HOME/conf/spark-env.sh to add the following statement:**

```shell
# JMX Port to use
SPARK_DAEMON_JAVA_OPTS="-Dcom.sun.management.jmxremote -Dcom.sun.management.jmxremote.authenticate=false -Dcom.sun.management.jmxremote.ssl=false" 

# export SPARK_DAEMON_JAVA_OPTS="$SPARK_DAEMON_JAVA_OPTS -Dcom.sun.management.jmxremote.port=$JMX_PORT "
export SPARK_DAEMON_JAVA_OPTS="-Dcom.sun.management.jmxremote -Dcom.sun.management.jmxremote.authenticate=false -Dcom.sun.management.jmxremote.ssl=false -Dcom.sun.management.jmxremote.port=8712 "
```

The statement contains $JMX_PORT, the value of which can be customized, or a random number can be obtained as the port number.
If the port is customized to a specific value, and the spark Master and one of the workers are on the same machine, a port conflict will occur.

## The second step

**vim $SPARK_HOME/conf/metrics.properties to add the following statement:**

```shell
*.sink.jmx.class=org.apache.spark.metrics.sink.JmxSink
master.source.jvm.class=org.apache.spark.metrics.source.JvmSource
worker.source.jvm.class=org.apache.spark.metrics.source.JvmSource
driver.source.jvm.class=org.apache.spark.metrics.source.JvmSource
executor.source.jvm.class=org.apache.spark.metrics.source.JvmSource
```

## The third step

**vim $SPARK_HOME/conf/spark-defaults.conf, add the following items to set the monitoring port for the driver and executor. This port will be opened when programs are running.**

```shell
spark.metrics.conf /opt/bigdata/spark/conf/metrics.properties
spark.driver.extraJavaOptions -XX:+PrintGCDetails -Dcom.sun.management.jmxremote -Dcom.sun.management.jmxremote.authenticate=false -Dcom.sun.management.jmxremote.ssl=false -Dcom.sun.mana
gement.jmxremote.port=8712

spark.executor.extraJavaOptions -XX:+PrintGCDetails -Dcom.sun.management.jmxremote -Dcom.sun.management.jmxremote.ssl=false -Dcom.sun.management.jmxremote.authenticate=false -Dcom.sun.mana
gement.jmxremote.port=8711
```

With spark's Master and Worker running properly and spark-Submit submitting a program, the port number can be queried from linux.

### Configuration parameter

|   Parameter name    |                                                                        Parameter help description                                                                         |
|---------------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Monitoring Host     | Monitored IPV4, IPV6 or domain name. Note⚠️Without protocol header (eg: https://, http://)                                                                                |
| Monitoring name     | Identify the name of this monitoring. The name needs to be unique                                                                                                         |
| Port                | Port provided by JMX                                                                                                                                                      |
| Username            | JMX connection user name, optional                                                                                                                                        |
| Password            | JMX connection password, optional                                                                                                                                         |
| Collection interval | Interval time of monitor periodic data collection, unit: second, and the minimum interval that can be set is 30 seconds                                                   |
| Whether to detect   | Whether to detect and check the availability of monitoring before adding monitoring. Adding and modifying operations will continue only after the detection is successful |
| Description remarks | For more information about identifying and describing this monitoring, users can note information here                                                                    |

### Collection Metrics

#### Metrics Set：memory_pool

| Metric name | Metric unit | Metric help description |
|-------------|-------------|-------------------------|
| name        |             | metrics name            |
| committed   | kb          | total size              |
| init        | kb          | init size               |
| max         | kb          | max size                |
| used        | kb          | used size               |

#### Metrics Set：code_cache (Only Support JDK8)

| Metric name | Metric unit | Metric help description |
|-------------|-------------|-------------------------|
| committed   | kb          | total size              |
| init        | kb          | init size               |
| max         | kb          | max size                |
| used        | kb          | used size               |

#### Metrics Set：class_loading

|      Metric name      | Metric unit | Metric help description  |
|-----------------------|-------------|--------------------------|
| LoadedClassCount      |             | Loaded Class Count       |
| TotalLoadedClassCount |             | Total Loaded Class Count |
| UnloadedClassCount    |             | Unloaded Class Count     |

#### Metrics Set：thread

|       Metric name       | Metric unit |  Metric help description   |
|-------------------------|-------------|----------------------------|
| TotalStartedThreadCount |             | Total Started Thread Count |
| ThreadCount             |             | Thread Count               |
| PeakThreadCount         |             | Peak Thread Count          |
| DaemonThreadCount       |             | Daemon Thread Count        |
| CurrentThreadUserTime   | ms          | Current Thread User Time   |
| CurrentThreadCpuTime    | ms          | Current Thread Cpu Time    |
