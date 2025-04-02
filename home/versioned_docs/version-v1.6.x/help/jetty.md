---
id: jetty  
title: Monitoring Jetty Web Server      
sidebar_label: Jetty Web Server
keywords: [open source monitoring tool, open source jetty web server monitoring tool, monitoring jetty metrics]
---

> Collect and monitor general performance metrics of Jetty application server

**Usage protocol: JMX**

### Pre-monitoring Operations

> You need to enable the `JMX` service in the JVM application. HertzBeat uses the JMX protocol to collect metrics for the JVM.

#### Jetty application server opens JMX protocol steps

[Refer to official documentation](https://www.eclipse.org/jetty/documentation/jetty-10/operations-guide/index.html#og-jmx-remote)

1. Start the JMX JMX-REMOTE module in Jetty

    ```shell
    java -jar $JETTY_HOME/start.jar --add-module=jmx
    java -jar $JETTY_HOME/start.jar --add-module=jmx-remote
    ```

    Successful command execution will create `${JETTY_BASE}/start.d/jmx-remote.ini` configuration file

2. Edit the `${JETTY_BASE}/start.d/jmx-remote.ini` configuration file to modify the JMX IP port and other parameters.

    **`localhost` needs to be modified to expose the IP**

    ```text
    ## The host/address to bind the RMI server to.
    # jetty.jmxremote.rmiserverhost=localhost
    
    ## The port the RMI server listens to (0 means a random port is chosen).
    # jetty.jmxremote.rmiserverport=1099
    
    ## The host/address to bind the RMI registry to.
    # jetty.jmxremote.rmiregistryhost=localhost
    
    ## The port the RMI registry listens to.
    # jetty.jmxremote.rmiregistryport=1099
    
    ## The host name exported in the RMI stub.
    -Djava.rmi.server.hostname=localhost
    ```

3. Restart Jetty Server.

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
