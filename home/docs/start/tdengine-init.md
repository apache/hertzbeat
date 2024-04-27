---
id: tdengine-init  
title: Use Time Series Database TDengine to Store Metrics Data (Optional)     
sidebar_label: Use TDengine Store Metrics  
---

Apache HertzBeat(Incubating)'s historical data storage relies on the time series database, you can choose one of them to install and initialize, or not to install (note ⚠️ but it is strongly recommended to configure in the production environment)

> It is recommended to use VictoriaMetrics as metrics storage.

TDengine is an open-source IoT time-series database, which we use to store the collected historical data of monitoring metrics. Pay attention to support ⚠️ 3.x version.  

**Note⚠️ Time series database is optional, but production environment configuration is strongly recommended to provide more complete historical chart functions and high performance**   
**⚠️ If you do not configure a time series database, only the last hour of historical data is retained.**   
Note⚠️ Need TDengine 3.x Version.    

> If you have TDengine environment, can directly skip to create a database instance.  


### Install TDengine via Docker 
> Refer to the official website [installation tutorial](https://docs.taosdata.com/get-started/docker/)  
1. Download and install Docker environment     
   Docker tools download refer to [Docker official document](https://docs.docker.com/get-docker/).     
   After the installation you can check if the Docker version normally output at the terminal.    
   ```
   $ docker -v
   Docker version 20.10.12, build e91ed57
   ```
2. Install TDengine with Docker     
   ```shell
   $ docker run -d -p 6030-6049:6030-6049 -p 6030-6049:6030-6049/udp \
    -v /opt/taosdata:/var/lib/taos \ 
    --name tdengine -e TZ=Asia/Shanghai \
    tdengine/tdengine:3.0.4.0
   ```
   `-v /opt/taosdata:/var/lib/taos` is local persistent mount of TDengine data directory. `/opt/taosdata` should be replaced with the actual local directory.    
   `-e TZ="Asia/Shanghai"` can set time zone for TDengine.Set up the corresponding time zone you want.    
   use```$ docker ps``` to check if the database started successfully

### Create database instance    

1. Enter database Docker container  
   ```
   $ docker exec -it tdengine /bin/bash
   ```
2. Create database named hertzbeat     
   After entering the container，execute `taos` command as follows:     
   
   ```
   root@tdengine-server:~/TDengine-server# taos
   Welcome to the TDengine shell from Linux, Client Version
   Copyright (c) 2020 by TAOS Data, Inc. All rights reserved.
   taos>
   ```
   
   execute commands to create database    
   
   ```
   taos> show databases;
   taos> CREATE DATABASE hertzbeat KEEP 90 DURATION 10 BUFFER 16;
   ```
   
   The above statements will create a database named hertzbeat. The data will be saved for 90 days (more than 90 days data will be automatically deleted).   
   A data file every 10 days, memory blocks buffer is 16MB.

3. Check if hertzbeat database has been created success      
   
   ```
   taos> show databases;
   taos> use hertzbeat;
   ```

**Note⚠️If you install TDengine using package**       

> In addition to start the server，you must execute `systemctl start taosadapter` to start adapter

### Configure the database connection in hertzbeat `application.yml` configuration file  

1. Configure HertzBeat's configuration file   
   Modify `hertzbeat/config/application.yml` configuration file [/script/application.yml](https://github.com/apache/hertzbeat/raw/master/script/application.yml)        
   Note⚠️The docker container way need to mount application.yml file locally,while you can use installation package way to unzip and modify `hertzbeat/config/application.yml`     
   Replace `warehouse.store.td-engine` data source parameters, URL account and password.       

```yaml
warehouse:
   store:
      # disable jpa
      jpa:
         enabled: false
      # enable td-engine   
      td-engine:
         enabled: true
         driver-class-name: com.taosdata.jdbc.rs.RestfulDriver
         url: jdbc:TAOS-RS://localhost:6041/hertzbeat
         username: root
         password: taosdata
```

2. Restart HertzBeat

### FAQ

1. Do both the time series databases IoTDB and TDengine need to be configured? Can they both be used?
> You don't need to configure all of them, you can choose one of them. Use the enable parameter to control whether it is used or not. You can also install and configure neither, which only affects the historical chart data.

2. The historical chart of the monitoring page is not displayed, and pops up [Unable to provide historical chart data, please configure to rely on the time series database]
> As shown in the pop-up window, the premise of displaying the history chart is to install and configure the dependent services of hertzbeat - IotDB database or TDengine database

3. The historical picture of monitoring details is not displayed or has no data, and TDengine has been deployed     
> Please confirm whether the installed TDengine version is 3.x, version 2.x are not compatible.  

4. The TDengine database is installed and configured, but the page still displays a pop-up [Unable to provide historical chart data, please configure the dependent time series database]
> Please check if the configuration parameters are correct  
> Is td-engine enable set to true  
> Note⚠️If both hertzbeat and TDengine are started under the same host for docker containers, 127.0.0.1 cannot be used for communication between containers by default, and the host IP is changed  
> You can check the startup logs according to the logs directory  
