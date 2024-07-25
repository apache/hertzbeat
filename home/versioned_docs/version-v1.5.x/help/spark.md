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

Refer: https://spark.apache.org/docs/latest/spark-standalone.html


**监控配置spark的监控主要分为Master、Worker、driver、executor监控。Master和Worker的监控在spark集群运行时即可监控，Driver和Excutor的监控需要针对某一个app来进行监控。**
**如果都要监控，需要根据以下步骤来配置**



## 第一步

**修改$SPARK_HOME/conf/spark-env.sh，添加以下语句：**

```shell
# JMX Port to use
SPARK_DAEMON_JAVA_OPTS="-Dcom.sun.management.jmxremote -Dcom.sun.management.jmxremote.authenticate=false -Dcom.sun.management.jmxremote.ssl=false" 

# export SPARK_DAEMON_JAVA_OPTS="$SPARK_DAEMON_JAVA_OPTS -Dcom.sun.management.jmxremote.port=$JMX_PORT "
export SPARK_DAEMON_JAVA_OPTS="-Dcom.sun.management.jmxremote -Dcom.sun.management.jmxremote.authenticate=false -Dcom.sun.management.jmxremote.ssl=false -Dcom.sun.management.jmxremote.port=8712 "
```

语句中有$JMX_PORT，这个的值可以自定义，也可以获取一个随机数作为端口号。
如果端口自定义为一个具体的值，而 spark 的 Master 和其中之一的 Worker 在同一台机器上，会出现端口冲突的情况。



## 第二步

**vim $SPARK_HOME/conf/metrics.properties 添加如下内容**

```shell
*.sink.jmx.class=org.apache.spark.metrics.sink.JmxSink
master.source.jvm.class=org.apache.spark.metrics.source.JvmSource
worker.source.jvm.class=org.apache.spark.metrics.source.JvmSource
driver.source.jvm.class=org.apache.spark.metrics.source.JvmSource
executor.source.jvm.class=org.apache.spark.metrics.source.JvmSource
```





## 第三步

**vim $SPARK_HOME/conf/spark-defaults.conf，添加以下项为driver和executor设置监控端口，在有程序运行的情况下，此端口会被打开。**

```shell
spark.metrics.conf /opt/bigdata/spark/conf/metrics.properties
spark.driver.extraJavaOptions -XX:+PrintGCDetails -Dcom.sun.management.jmxremote -Dcom.sun.management.jmxremote.authenticate=false -Dcom.sun.management.jmxremote.ssl=false -Dcom.sun.mana
gement.jmxremote.port=8712

spark.executor.extraJavaOptions -XX:+PrintGCDetails -Dcom.sun.management.jmxremote -Dcom.sun.management.jmxremote.ssl=false -Dcom.sun.management.jmxremote.authenticate=false -Dcom.sun.mana
gement.jmxremote.port=8711
```

在spark的Master和Worker正常运行以及spark-submit提交了一个程序的情况下，可以从linux中查询出端口号码。



### Configuration parameter

| Parameter name      | Parameter help description                                                                                                                                                |
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

| Metric name           | Metric unit | Metric help description  |
|-----------------------|-------------|--------------------------|
| LoadedClassCount      |             | Loaded Class Count       |
| TotalLoadedClassCount |             | Total Loaded Class Count |
| UnloadedClassCount    |             | Unloaded Class Count     |


#### Metrics Set：thread

| Metric name             | Metric unit | Metric help description    |
|-------------------------|-------------|----------------------------|
| TotalStartedThreadCount |             | Total Started Thread Count |
| ThreadCount             |             | Thread Count               |
| PeakThreadCount         |             | Peak Thread Count          |
| DaemonThreadCount       |             | Daemon Thread Count        |
| CurrentThreadUserTime   | ms          | Current Thread User Time   |
| CurrentThreadCpuTime    | ms          | Current Thread Cpu Time    |


