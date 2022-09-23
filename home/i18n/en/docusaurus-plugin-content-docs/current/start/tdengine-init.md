---
id: tdengine-init  
title: Dependency Service TDengine Installation and Initialization        
sidebar_label: TDengine Init(optional)    
---
TDengine is a time series database. We use TDengine to replace the InfluxDb, to store the history data collected monitoring Metrics.
Note⚠️ TDengine is optional. And no configuration means no historical chart data. 
Note⚠️ Need TDengine 2.4.x Version.   

> If you have TDengine environment, can directly skip to create a database instance.


### Install TDengine via Docker 
> Refer to the official website [installation tutorial](https://www.taosdata.com/docs/cn/v2.0/getting-started/docker)  
1. Download and install Docker environment   
   Docker tools download refer to [Docker official document](https://docs.docker.com/get-docker/).
   After the installation you can check if the Docker version normally output at the terminal.
   ```
   $ docker -v
   Docker version 20.10.12, build e91ed57
   ```
2. Install TDengine with Docker
   ```
   $ docker run -d -p 6030-6049:6030-6049 -p 6030-6049:6030-6049/udp -v /opt/taosdata:/var/lib/taos --name tdengine -e TZ=Asia/Shanghai tdengine/tdengine:2.4.0.12
   ```
   `-v /opt/taosdata:/var/lib/taos` is local persistent mount of TDengine data directory.`/opt/taosdata` should be replaced with the actual local directory.
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
   root@tdengine-server:~/TDengine-server-2.4.0.4# taos
   Welcome to the TDengine shell from Linux, Client Version:2.4.0.4
   Copyright (c) 2020 by TAOS Data, Inc. All rights reserved.
   taos>
   ```
   execute commands to create database
   ```
   taos> show databases;
   taos> CREATE DATABASE hertzbeat KEEP 90 DAYS 10 BLOCKS 6 UPDATE 1;
   ```
   The above statements will create a database named hertzbeat. The data will be saved for 90 days (more than 90 days data will be automatically deleted).
   A data file every 10 days, memory blocks is 6, allow you to update the data.
3. Check if hertzbeat database has been successfully created
   ```
   taos> show databases;
   taos> use hertzbeat;
   ```

**Note⚠️If you install TDengine2.3+ version**       
> In addition to start the server，you must execute `systemctl start taosadapter` to start adapter

### Configure the database connection in hertzbeat `application.yml`configuration file  

1. Configure HertzBeat's configuration file
   Modify `hertzbeat/config/application.yml` configuration file   
   Note⚠️The docker container way need to mount application.yml file locally,while you can use installation package way to unzip and modify `hertzbeat/config/application.yml`     
   Replace `warehouse.store.td-engine` data source parameters, URL account and password.     

```
   warehouse.store.td-engine.enable
   warehouse.store.td-engine.url
   warehouse.store.td-engine.username
   warehouse.store.td-engine.password

```

###   Common issues  

1. If the history chart on the monitoring page is not displayed，popup [unable to provide historical chart data, please configure dependency service on TDengine time series database]
> As shown in the popup window，the premise of history chart display is that you need install and configure HertzBeat's dependency service - TDengine database.

2. The historical picture of monitoring details is not displayed or has no data, and TDengine has been deployed     
> Please confirm whether the installed TDengine version is near 2.4.0.12, version 3.0 and 2.2 are not compatible.  