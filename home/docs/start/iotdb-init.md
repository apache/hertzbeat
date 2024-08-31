---
id: iotdb-init  
title: Use Time Series Database IoTDB to Store Metrics Data (Optional)  
sidebar_label: Metrics Store IoTDB
---

Apache HertzBeat (incubating)'s historical data storage relies on the time series database, you can choose one of them to install and initialize, or not to install (note ⚠️ but it is strongly recommended to configure in the production environment)

> It is recommended to use VictoriaMetrics as metrics storage.

Apache IoTDB is a software system that integrates the collection, storage, management and analysis of time series data of the Internet of Things. We use it to store and analyze the historical data of monitoring metrics collected. Support V1.0.+ version.

**Note⚠️ Time series database is optional, but production environment configuration is strongly recommended to provide more complete historical chart functions and high performance**

**⚠️ If you do not configure a time series database, only the last hour of historical data is retained.**

> If you already have an IoTDB environment, you can skip directly to the YML configuration step.

### Install IoTDB via Docker

> Refer to the official website [installation tutorial](https://iotdb.apache.org/UserGuide/V0.13.x/QuickStart/WayToGetIoTDB.html)

1. Download and install Docker environment
   Docker tools download refer to [Docker official document](https://docs.docker.com/get-docker/).
   After the installation you can check if the Docker version normally output at the terminal.

   ```shell
   $ docker -v
   Docker version 20.10.12, build e91ed57
   ```

2. Install IoTDB via Docker

   ```shell
   $ docker run -d -p 6667:6667 -p 31999:31999 -p 8181:8181 \
       -v /opt/iotdb/data:/iotdb/data \ 
       --name iotdb \
       apache/iotdb:1.2.2-standalone
   ```

   `-v /opt/iotdb/data:/iotdb/data` is local persistent mount of IotDB data directory.`/iotdb/data` should be replaced with the actual local directory.
   use```$ docker ps``` to check if the database started successfully

3. Configure the database connection in hertzbeat `application.yml`configuration file

   Modify `hertzbeat/config/application.yml` configuration file
   Note⚠️The docker container way need to mount application.yml file locally, while you can use installation package way to unzip and modify `hertzbeat/config/application.yml`
   Config the `warehouse.store.jpa.enabled` `false`. Replace `warehouse.store.iot-db` data source parameters, HOST account and password.

   ```yml
   warehouse:
     store:
       # disable JPA
       jpa:
         enabled: false
       # enable iot-db
       iot-db:
         enabled: true
         host: 127.0.0.1
         rpc-port: 6667
         username: root
         password: root
         query-timeout-in-ms: -1
         # default '7776000000'（90days,unit:ms,-1:no-expire）
         expire-time: '7776000000'
   ```

   **IoTDB Cluster Configuration**

   If you are using IoTDB for clustering, please refer to the configuration below:

   ```yaml
   warehouse:
     store:
       # Disable default JPA
       jpa:
         enabled: false
       # Enable IoTDB
       iot-db:
         enabled: true
         node-urls: ['127.0.0.1:6667','127.0.0.2:6667','127.0.0.3:6667']
         username: root
         password: root
         # if iotdb version >= 0.13 use default queryTimeoutInMs = -1; else use default queryTimeoutInMs = 0
         query-timeout-in-ms: -1
         # Data storage time: default '7776000000' (90 days, in milliseconds, -1 means never expire)
         expire-time: '7776000000'
   ```

   Configuration parameters:

   |   Parameter Name    |                                        Description                                        |
   |---------------------|-------------------------------------------------------------------------------------------|
   | enabled             | Whether to enable                                                                         |
   | host                | IoTDB database address                                                                    |
   | rpc-port            | IoTDB database port                                                                       |
   | node-urls           | IoTDB cluster addresses                                                                   |
   | username            | IoTDB database account                                                                    |
   | password            | IoTDB database password                                                                   |
   | version             | deprecated                                                                                |
   | query-timeout-in-ms | Query timeout                                                                             |
   | expire-time         | Data storage time, default '7776000000' (90 days, in milliseconds, -1 means never expire) |

   > If both cluster configuration `node-urls` and standalone configuration are set simultaneously, the cluster `node-urls` configuration takes precedence.

4. Restart HertzBeat

### FAQ

1. Do both the time series databases IoTDB and TDengine need to be configured? Can they both be used?

   > You don't need to configure all of them, you can choose one of them. Use the enable parameter to control whether it is used or not. You can also install and configure neither, which only affects the historical chart data.

2. The historical chart of the monitoring page is not displayed, and pops up [Unable to provide historical chart data, please configure to rely on the time series database]

   > As shown in the pop-up window, the premise of displaying the history chart is to install and configure the dependent services of hertzbeat - IotDB database or TDengine database

3. The TDengine database is installed and configured, but the page still displays a pop-up [Unable to provide historical chart data, please configure the dependent time series database]

   > Please check if the configuration parameters are correct  
   > Is td-engine enable set to true  
   > Note⚠️If both hertzbeat and TDengine are started under the same host for docker containers, 127.0.0.1 cannot be used for communication between containers by default, and the host IP is changed  
   > You can check the startup logs according to the logs directory
