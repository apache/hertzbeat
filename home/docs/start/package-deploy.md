---
id: package-deploy  
title: Install HertzBeat via Package 
sidebar_label: Install via Package
---
> You can install and run HertzBeat on Linux Windows Mac system, and CPU supports X86/ARM64.

1. Download HertzBeat installation package    
   Download installation package `hertzbeat-xx.tar.gz` `hertzbeat-collector-xx.tar.gz` corresponding to your system environment   
   - download from [GITEE Release](https://gitee.com/dromara/hertzbeat/releases) repository 
   - download from [GITHUB Release](https://github.com/dromara/hertzbeat/releases) repository

2. Configure HertzBeat's configuration file(optional)        
   Unzip the installation package to the host eg: /opt/hertzbeat    
   ``` 
   $ tar zxvf hertzbeat-xx.tar.gz
   or
   $ unzip -o hertzbeat-xx.zip
   ```
   Modify the configuration file `hertzbeat/config/application.yml` params according to your needs.      
   - If you need to use email to send alarms, you need to replace the email server parameters `spring.mail` in `application.yml`   
   - **Recommended** If you need to use an external Mysql database to replace the built-in H2 database, you need to replace the `spring.datasource` parameter in `application.yml` For specific steps, see [Using Mysql to replace H2 database](mysql-change)  
   - **Recommended** If you need to use the time series database TDengine to store metric data, you need to replace the `warehouse.store.td-engine` parameter in `application.yml` for specific steps, see [Using TDengine to store metrics data](tdengine-init)   
   - **Recommended** If you need to use the time series database IotDB to store the metric database, you need to replace the `warehouse.storeiot-db` parameter in `application.yml` For specific steps, see [Use IotDB to store metrics data](iotdb-init)

3. Configure the account file(optional)     
   HertzBeat default built-in three user accounts, respectively `admin/hertzbeat tom/hertzbeat guest/hertzbeat`       
   If you need add, delete or modify account or password, configure `hertzbeat/config/sureness.yml`. Ignore this step without this demand.     
   For detail steps, please refer to [Configure Account Password](account-modify)  

4. Start the service   
   Execute the startup script `startup.sh` in the installation directory `hertzbeat/bin/`, or `startup.bat` in windows.   
   ``` 
   $ ./startup.sh 
   ```

5. Begin to explore HertzBeat    

   Access http://localhost:1157/ using browser. You can explore HertzBeat with default account `admin/hertzbeat` now!    

6. Deploy collector clusters (Optional)

   - Download and unzip the collector release package `hertzbeat-collector-xx.tar.gz` to new machine [GITEE Release](https://gitee.com/dromara/hertzbeat/releases) [GITHUB Release](https://github.com/dromara/hertzbeat/releases)
   - Configure the collector configuration yml file `hertzbeat-collector/config/application.yml`: unique `identity` name, running `mode` (public or private), hertzbeat `manager-host`, hertzbeat `manager-port`
     ```yaml
     collector:
       dispatch:
         entrance:
           netty:
             enabled: true
             identity: ${IDENTITY:}
             mode: ${MODE:public}
             manager-host: ${MANAGER_HOST:127.0.0.1}
             manager-port: ${MANAGER_PORT:1158}
     ```
   - Run command `$ ./bin/startup.sh ` or `bin/startup.bat`
   - Access `http://localhost:1157` and you will see the registered new collector in dashboard

**HAVE FUN**

### FAQ  

1. **If using the package not contains JDK, you need to prepare the JAVA environment in advance**

   Install JAVA runtime environment-refer to [official website](http://www.oracle.com/technetwork/java/javase/downloads/index.html)    
   requirement：JDK11 ENV     
   download JAVA installation package: [mirror website](https://repo.huaweicloud.com/java/jdk/)   
   After installation use command line to check whether you install it successfully.
   ```
   $ java -version
   java version "11.0.12" 
   Java(TM) SE Runtime Environment 18.9 (build 11.0.12+8-LTS-237)
   Java HotSpot(TM) 64-Bit Server VM 18.9 (build 11.0.12+8-LTS-237, mixed mode)

   ```

2. **According to the process deploy，visit http://ip:1157/ no interface**   
   Please refer to the following points to troubleshoot issues:
> 1：If you switch to dependency service MYSQL database，check whether the database is created and started successfully.
> 2：Check whether dependent services, IP account and password configuration is correct in HertzBeat's configuration file `hertzbeat/config/application.yml`.    
> 3：Check whether the running log has errors in `hertzbeat/logs/` directory. If you haven't solved the issue, report it to the communication group or community.

3. **Log an error TDengine connection or insert SQL failed**
> 1：Check whether database account and password configured is correct, the database is created.   
> 2：If you install TDengine2.3+ version, you must execute `systemctl start taosadapter` to start adapter in addition to start the server.    

4. **Historical monitoring charts have been missing data for a long time**
> 1：Check whether you configure Tdengine or IoTDB. No configuration means no historical chart data.  
> 2：Check whether Tdengine database `hertzbeat` is created.
> 3: Check whether IP account and password configuration is correct in HertzBeat's configuration file `application.yml`.

5. **The historical picture of monitoring details is not displayed or has no data, and TDengine has been deployed**
> Please confirm whether the installed TDengine version is near 2.4.0.12, version 3.0 and 2.2 are not compatible.

6. **The time series database is installed and configured, but the page still displays a pop-up [Unable to provide historical chart data, please configure dependent time series database]**
> Please check if the configuration parameters are correct  
> Is iot-db or td-engine enable set to true  
> Note⚠️If both hertzbeat and IotDB, TDengine are started under the same host for docker containers, 127.0.0.1 cannot be used for communication between containers by default, and the host IP is changed  
> You can check the startup logs according to the logs directory  
