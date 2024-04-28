---
id: package-deploy  
title: Install HertzBeat via Package 
sidebar_label: Install via Package
---

> You can install and run Apache HertzBeat(Incubating) on Linux Windows Mac system, and CPU supports X86/ARM64.

1. Download HertzBeat installation package    
   Download installation package `hertzbeat-xx.tar.gz` `hertzbeat-collector-xx.tar.gz` corresponding to your system environment   
   - download from [GITEE Release](https://gitee.com/hertzbeat/hertzbeat/releases) repository 
   - download from [GITHUB Release](https://github.com/apache/hertzbeat/releases) repository

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
   - **Highly recommended** From now on we will mainly support VictoriaMetrics as a time-series database, if you need to use the time series database VictoriaMetrics to store metric data, you need to replace the `warehouse.store.victoria-metrics` parameter in `application.yml` for specific steps, see [Using VictoriaMetrics to store metrics data](victoria-metrics-init)
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

   - Download and unzip the collector release package `hertzbeat-collector-xx.tar.gz` to new machine [GITEE Release](https://gitee.com/hertzbeat/hertzbeat/releases) [GITHUB Release](https://github.com/apache/hertzbeat/releases)
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
   requirement：JDK17 ENV     
   download JAVA installation package: [mirror website](https://repo.huaweicloud.com/java/jdk/)   
   After installation use command line to check whether you install it successfully.
   ```
   $ java -version
   java version "17.0.9"
   Java(TM) SE Runtime Environment 17.0.9 (build 17.0.9+8-LTS-237)
   Java HotSpot(TM) 64-Bit Server VM 17.0.9 (build 17.0.9+8-LTS-237, mixed mode)

   ```

2. **According to the process deploy，visit http://ip:1157/ no interface**   
   Please refer to the following points to troubleshoot issues:
> 1：If you switch to dependency service MYSQL database，check whether the database is created and started successfully.
> 2：Check whether dependent services, IP account and password configuration is correct in HertzBeat's configuration file `hertzbeat/config/application.yml`.    
> 3：Check whether the running log has errors in `hertzbeat/logs/` directory. If you haven't solved the issue, report it to the communication group or community.

3. **Log an error TDengine connection or insert SQL failed**
> 1：Check whether database account and password configured is correct, the database is created.   
> 2：If you install TDengine2.3+ version, you must execute `systemctl start taosadapter` to start adapter in addition to start the server.    

4. **Monitoring historical charts with no data for a long time **
> 1: Whether the time series database is configured or not, if it is not configured, there is no historical chart data.  
> 2: If you are using Tdengine, check whether the database `hertzbeat` of Tdengine is created.
> 3: HertzBeat's configuration file `application.yml`, the dependent services in it, the time series, the IP account password, etc. are configured correctly.

