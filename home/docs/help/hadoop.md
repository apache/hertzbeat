---
id: hadoop
title: Monitoring Hadoop
sidebar_label: Apache Hadoop 
keywords: [Open Source Monitoring System, Open Source Java Monitoring, Hadoop JVM Monitoring]
---

> Collect and monitor general performance metrics for the JVM virtual machine in Hadoop.

**Protocol used: JMX**

### Pre-monitoring steps

> You need to enable JMX service in the Hadoop application before monitoring. HertzBeat uses the JMX protocol to collect performance metrics from Hadoop's JVM.

### Steps to enable JMX protocol in the Hadoop application

Add JVM parameters when the application starts. ⚠️Note that you can customize the exposed port and external IP.

- 1.Enter the hadoop-env.sh configuration file and enter the following command in the terminal:

```shell
vi $HADOOP_HOME/etc/hadoop/hadoop-env.sh
```

- 2.Add the following parameters, where `port` is the number of the custom-exposed port

```shell
export HADOOP_OPTS= "$HADOOP_OPTS
-Djava.rmi.server.hostname=对外ip地址 
-Dcom.sun.management.jmxremote.port=9999
-Dcom.sun.management.jmxremote.ssl=false
-Dcom.sun.management.jmxremote.authenticate=false "
```

- 3.Save and exit, and then execute "start-all.sh" in the "$HADOOP_HOME/sbin" directory to restart the service.

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
