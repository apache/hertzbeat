---
id: docker-deploy  
title: Install HertzBeat via Docker   
sidebar_label: Install via Docker      
---

> Recommend to use docker deploy HertzBeat

video tutorial of installation and deployment: [HertzBeat installation and deployment-BiliBili](https://www.bilibili.com/video/BV1GY41177YL)  

1. Download and install the Docker environment   
   Docker tools download refer to [Docker official document](https://docs.docker.com/get-docker/)。
   After the installation you can check if the Docker version normally output at the terminal.
   ```
   $ docker -v
   Docker version 20.10.12, build e91ed57
   ```

2. pull HertzBeat Docker mirror  
   you can look up the mirror version TAG in [official mirror repository](https://hub.docker.com/r/tancloud/hertzbeat/tags)     
   ``` 
   $ docker pull tancloud/hertzbeat   
   ```
3. Configure HertzBeat's configuration file(optional)      
   Create application.yml in the host directory，eg:/opt/application.yml        
   The configuration file content refer to project repository[/script/application.yml](https://gitee.com/dromara/hertzbeat/raw/master/script/application.yml)，modify service parameters, IP port account password in `td-engine`   
   Note⚠️（If use email to alert, please replace the mail server parameter. If use MYSQL data source, replace the datasource parameters inside  refer to[H2 database switch to MYSQL](mysql-change)）       
   Specific replacement parameters is as follows:     
```yaml
warehouse:
   store:
      td-engine:
         enabled: true
         driver-class-name: com.taosdata.jdbc.rs.RestfulDriver
         url: jdbc:TAOS-RS://localhost:6041/hertzbeat
         username: root
         password: taosdata
      iot-db:
         enabled: false
         host: 127.0.0.1
         rpc-port: 6667
         username: root
         password: root
         # org.apache.iotdb.session.util.Version: V_O_12 || V_0_13
         version: V_0_13
         # if iotdb version >= 0.13 use default queryTimeoutInMs = -1; else use default queryTimeoutInMs = 0
         query-timeout-in-ms: -1
         # default '7776000000'（90days,unit:ms,-1:no-expire）
         expire-time: '7776000000'
         
spring:
   mail:
      # Attention: this is mail server address.
      host: smtp.exmail.qq.com
      username: example@tancloud.cn
      # Attention: this is not email account password, this requires an email authorization code
      password: example
      port: 465
```

4. Configure the user configuration file(optional, user-defined user password)         
   HertzBeat default built-in three user accounts, respectively admin/hertzbeat tom/hertzbeat guest/hertzbeat      
   If you need add, delete or modify account or password, configure `sureness.yml`. Ignore this step without this demand.    
   Create sureness.yml in the host directory，eg:/opt/sureness.yml    
   The configuration file content refer to project repository[/script/sureness.yml](https://gitee.com/dromara/hertzbeat/blob/master/script/sureness.yml)    
   
```yaml

resourceRole:
   - /api/account/auth/refresh===post===[admin,user,guest]
   - /api/apps/**===get===[admin,user,guest]
   - /api/monitor/**===get===[admin,user,guest]
   - /api/monitor/**===post===[admin,user]
   - /api/monitor/**===put===[admin,user]
   - /api/monitor/**===delete==[admin]
   - /api/monitors/**===get===[admin,user,guest]
   - /api/monitors/**===post===[admin,user]
   - /api/monitors/**===put===[admin,user]
   - /api/monitors/**===delete===[admin]
   - /api/alert/**===get===[admin,user,guest]
   - /api/alert/**===post===[admin,user]
   - /api/alert/**===put===[admin,user]
   - /api/alert/**===delete===[admin]
   - /api/alerts/**===get===[admin,user,guest]
   - /api/alerts/**===post===[admin,user]
   - /api/alerts/**===put===[admin,user]
   - /api/alerts/**===delete===[admin]
   - /api/notice/**===get===[admin,user,guest]
   - /api/notice/**===post===[admin,user]
   - /api/notice/**===put===[admin,user]
   - /api/notice/**===delete===[admin]
   - /api/tag/**===get===[admin,user,guest]
   - /api/tag/**===post===[admin,user]
   - /api/tag/**===put===[admin,user]
   - /api/tag/**===delete===[admin]
   - /api/summary/**===get===[admin,user,guest]
   - /api/summary/**===post===[admin,user]
   - /api/summary/**===put===[admin,user]
   - /api/summary/**===delete===[admin]

# Resources that need to be filtered and protected can be accessed directly without authentication
# /api/v1/source3===get means /api/v1/source3===get it can be accessed by anyone. Don't need to authentication
excludedResource:
   - /api/account/auth/**===*
   - /api/i18n/**===get
   - /api/apps/hierarchy===get
   # web ui  the front-end static resource
   - /===get
   - /dashboard/**===get
   - /monitors/**===get
   - /alert/**===get
   - /account/**===get
   - /setting/**===get
   - /passport/**===get
   - /**/*.html===get
   - /**/*.js===get
   - /**/*.css===get
   - /**/*.ico===get
   - /**/*.ttf===get
   - /**/*.png===get
   - /**/*.gif===get
   - /**/*.jpg===get
   - /**/*.svg===get
   - /**/*.json===get
   # swagger ui resource
   - /swagger-resources/**===get
   - /v2/api-docs===get
   - /v3/api-docs===get

# user account information
# Here is admin tom lili three accounts
# eg: admin includes[admin,user]roles, password is hertzbeat 
# eg: tom includes[user], password is hertzbeat
# eg: lili includes[guest],text password is lili, salt password is 1A676730B0C7F54654B0E09184448289
account:
   - appId: admin
     credential: hertzbeat
     role: [admin,user]
   - appId: tom
     credential: hertzbeat
     role: [user]
   - appId: guest
     credential: hertzbeat
     role: [guest]
```
   
   Modify the following **part parameters** in sureness.yml **[Note⚠️Other default sureness configuration parameters should be retained]**：  

```yaml

# user account information
# Here is admin tom lili three accounts
# eg: admin includes[admin,user]roles, password is hertzbeat 
# eg: tom includes[user], password is hertzbeat
# eg: lili includes[guest], text password is lili, salt password is 1A676730B0C7F54654B0E09184448289
account:
   - appId: admin
     credential: hertzbeat
     role: [admin,user]
   - appId: tom
     credential: hertzbeat
     role: [user]
   - appId: guest
     credential: hertzbeat
     role: [guest]
```

6. Start the HertzBeat Docker container    

```shell 
$ docker run -d -p 1157:1157 \
    -e LANG=zh_CN.UTF-8 \
    -e TZ=Asia/Shanghai \
    -v /opt/data:/opt/hertzbeat/data \
    -v /opt/logs:/opt/hertzbeat/logs \
    -v /opt/application.yml:/opt/hertzbeat/config/application.yml \
    -v /opt/sureness.yml:/opt/hertzbeat/config/sureness.yml \
    --name hertzbeat tancloud/hertzbeat
```

   This command starts a running HertzBeat Docker container, and the container port 1157 is mapped to the host machine 1157. If existing processes on the host use the port, please modify host mapped port.  
   - `docker run -d` : Run a container in the background via Docker
   - `-p 1157:1157`  : Mapping container ports to the host
   - `-e LANG=zh_CN.UTF-8`  : (optional) set the LANG  
   - `-e TZ=Asia/Shanghai` : (optional) set the TimeZone  
   - `-v /opt/data:/opt/hertzbeat/data` : (optional，data persistence) Important⚠️ Mount the H2 database file to the local host, to ensure that the data is not lost because of creating or deleting container.  
   - `-v /opt/logs:/opt/hertzbeat/logs` : (optional，if you don't have a need,just delete it) Mount the log file to the local host, to guarantee the log will not be lost because of creating or deleting container.
   - `-v /opt/application.yml:/opt/hertzbeat/config/application.yml`  : (optional，if you don't have a need,just delete it) Mount the local configuration file into the container which has been modified in the previous step, namely using the local configuration file to cover container configuration file. We need to modify MYSQL, TDengine configuration information in the configuration file to connect to an external service.
   - `-v /opt/sureness.yml:/opt/hertzbeat/config/sureness.yml`  : (optional，if you don't have a need,just delete it) Mount account configuration file modified in the previous step into the container. Delete this command parameters if have no modify account needs.
   - `--name hertzbeat` : Naming container name hertzbeat 
   - `tancloud/hertzbeat` : Use the pulled latest HertzBeat official application mirror to start the container. version can be looked up in [official mirror repository](https://hub.docker.com/r/tancloud/hertzbeat/tags)   

7. Begin to explore HertzBeat  
   visit http://ip:1157/ on the browser. You can use HertzBeat monitoring alarm, default account and password are admin/hertzbeat.  

**HAVE FUN**   

### FAQ  

**The most common problem is network problems, please check in advance**

1. **MYSQL, TDENGINE, IoTDB and HertzBeat are deployed on the same host by Docker,HertzBeat use localhost or 127.0.0.1 connect to the database but fail**     
The problems lies in Docker container failed to visit and connect localhost port. Beacuse the docker default network mode is Bridge mode which can't access loacl machine through localhost.
> Solution A：Configure application.yml. Change database connection address from localhost to external IP of the host machine.     
> Solution B：Use the Host network mode to start Docker, namely making Docker container and hosting share network. `docker run -d --network host .....`   

2. **According to the process deploy，visit http://ip:1157/ no interface**   
Please refer to the following points to troubleshoot issues：  
> 1：If you switch to dependency service MYSQL database，check whether the database is created and started successfully.
> 2：Check whether dependent services, IP account and password configuration is correct in HertzBeat's configuration file `application.yml`.
> 3：`docker logs hertzbeat` Check whether the container log has errors. If you haven't solved the issue, report it to the communication group or community.

3. **Log an error TDengine connection or insert SQL failed**  
> 1：Check whether database account and password configured is correct, the database is created.   
> 2：If you install TDengine2.3+ version, you must execute `systemctl start taosadapter` to start adapter in addition to start the server.  

4. **Historical monitoring charts have been missing data for a long time**  
> 1：Check whether you configure Tdengine or IoTDB. No configuration means no historical chart data.  
> 2：Check whether Tdengine database `hertzbeat` is created. 
> 3: Check whether IP account and password configuration is correct in HertzBeat's configuration file `application.yml`.

5. If the history chart on the monitoring page is not displayed，popup [please configure time series database]
> As shown in the popup window，the premise of history chart display is that you need install and configure hertzbeat's dependency service - IoTDB or TDengine database.
> Installation and initialization this database refer to [TDengine Installation](tdengine-init) or [IoTDB Installation](iotdb-init)  

6. The historical picture of monitoring details is not displayed or has no data, and TDengine has been deployed  
> Please confirm whether the installed TDengine version is near 2.4.0.12, version 3.0 and 2.2 are not compatible.  

7. The time series database is installed and configured, but the page still displays a pop-up [Unable to provide historical chart data, please configure dependent time series database]
> Please check if the configuration parameters are correct
> Is iot-db or td-engine enable set to true
> Note⚠️If both hertzbeat and IotDB, TDengine are started under the same host for docker containers, 127.0.0.1 cannot be used for communication between containers by default, and the host IP is changed
> You can check the startup logs according to the logs directory
