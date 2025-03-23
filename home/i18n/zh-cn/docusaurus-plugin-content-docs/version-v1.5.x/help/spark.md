---
id: spark  
title: 监控 Spark      
sidebar_label: Spark 监控
keywords: [开源监控工具，开源Java spark监控工具，监控spark指标]
---

> 收集和监控Spark的一般性能指标。

**使用协议：JMX**

### Spark App启用JMX协议步骤

1. 应用启动时添加Spark参数 ⚠️注意可自定义暴露端口,对外IP

参考文档: <https://spark.apache.org/docs/latest/spark-standalone.html>

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

### 配置参数

| 参数名称                | 参数帮助描述                                                                                                                                                                  |
|---------------------|-------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| Monitoring Host     | 被监控的对端IPV4，IPV6或域名。注意⚠️不带协议头(eg: https://, http://)。                                                                              |
| Monitoring name     | 标识此监控的名称。名称必须是唯一的                                                                                                                                                         |
| Port                | JMX提供的端口                                                                                                                                                                |
| Username            | JMX连接用户名，可选                                                                                                                                                             |
| Password            | JMX连接密码，可选                                                                                                                                                              |
| Collection interval | 监控周期性采集数据间隔时间，单位秒，可设置的最小间隔为30秒                                                 |
| Whether to detect   | 添加监控前是否检测和检查监控的可用性。检测成功后，添加和修改操作才会继续进行 |
| Description remarks | 有关识别和描述此监视的更多信息，用户可以在这里记录信息                                                                  |

### 采集指标

#### 指标集合：memory_pool

| 指标名称      | 指标单位 | 指标描述  |
|-----------|------|-------|
| name      |      | 指标名称  |
| committed | kb   | 总量    |
| init      | kb   | 初始化大小 |
| max       | kb   | 最大值   |
| used      | kb   | 已使用   |

#### Metrics Set：code_cache (仅支持 JDK8)

| 指标名称 | 指标单位 | 指标描述 |
|-------------|-------------|-------------------------|
| committed   | kb          | 总量              |
| init        | kb          | 初始化大小               |
| max         | kb          | 最大值                |
| used        | kb          | 已使用               |

#### 指标集合：class_loading

|      指标名称      | 指标单位 | 指标描述  |
|-----------------------|-------------|--------------------------|
| LoadedClassCount      |             | 已加载类数量       |
| TotalLoadedClassCount |             | 历史已加载类总量 |
| UnloadedClassCount    |             | 未加载类数量     |

#### 指标集合：thread

|       指标名称       | 指标单位 |  指标描述   |
|-------------------------|-------------|----------------------------|
| TotalStartedThreadCount |             | 已经开始的线程数量 |
| ThreadCount             |             | 线程数               |
| PeakThreadCount         |             | 未加载类数量          |
| DaemonThreadCount       |             | 守护进程数        |
| CurrentThreadUserTime   | ms          | 使用时间   |
| CurrentThreadCpuTime    | ms          | 使用CPU时间    |
