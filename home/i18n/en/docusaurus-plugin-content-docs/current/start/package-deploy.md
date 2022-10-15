---
id: package-deploy  
title: Install HertzBeat via Package 
sidebar_label: Install via Package
---
> You can install and run HertzBeat on Linux Windows Mac system, and CPU supports X86/ARM64. Due to the installation package itself does not include the JAVA runtime environment, you need to prepare JAVA runtime environment in advance.

video tutorial of installation and deployment: [HertzBeat installation and deployment-BiliBili](https://www.bilibili.com/video/BV1GY41177YL)   

1. Install JAVA runtime environment-refer to[official website](http://www.oracle.com/technetwork/java/javase/downloads/index.html)    
   requirement：JDK11 ENV     
   download JAVA installation package: [mirror website](https://repo.huaweicloud.com/java/jdk/)   
   After installation use command line to check whether you install it successfully.   
   ```
   $ java -version
   openjdk version "1.8.0_312"
   OpenJDK Runtime Environment (Zulu 8.58.0.13-CA-macos-aarch64) (build 1.8.0_312-b07)
   OpenJDK 64-Bit Server VM (Zulu 8.58.0.13-CA-macos-aarch64) (build 25.312-b07, mixed mode)
   ```
2. Download HertzBeat installation package
   Download installation package corresponding to your system environment
   - download from [GITEE Release](https://gitee.com/dromara/hertzbeat/releases) repository 
   - download from [GITHUB Release](https://github.com/dromara/hertzbeat/releases) repository

3. Configure HertzBeat's configuration file(optional)      
   Unzip the installation package to the host eg: /opt/hertzbeat  
   ``` 
   $ tar zxvf hertzbeat-[version number].tar.gz   
   ```
   Modify the configuration file `hertzbeat/config/application.yml`
   Replace `td-engine` service parameter, IP port account and password
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
   Modify the following **part parameters** in sureness.yml：**[Note⚠️Other default sureness configuration parameters should be retained]**

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

5. Deploy/Start
   Execute the startup script startup.sh in the installation directory hertzbeat/bin/
   ``` 
   $ ./startup.sh 
   ```
6. Begin to explore HertzBeat  
   visit http://ip:1157/ on the browser. You can use HertzBeat monitoring alarm, default account and password are admin/hertzbeat. 

**HAVE FUN**

### Package Deployment common issues

1. **According to the process deploy，visit http://ip:1157/ no interface**   
   Please refer to the following points to troubleshoot issues:
> one：If you switch to dependency service MYSQL database，check whether the database is created and started successfully.
> two：Check whether dependent services, IP account and password configuration is correct in HertzBeat's configuration file `hertzbeat/config/application.yml`.    
> three： Check whether the running log has errors in `hertzbeat/logs/` directory. If you haven't solved the issue, report it to the communication group or community.

2. **Log an error TDengine connection or insert SQL failed**
> one：Check whether database account and password configured is correct, the database is created.   
> two：If you install TDengine2.3+ version, you must execute `systemctl start taosadapter` to start adapter in addition to start the server.    

3. **Historical monitoring charts have been missing data for a long time**
> one：Check whether you configure Tdengine. No configuration means no historical chart data.     
> two：Check whether Tdengine database `hertzbeat` is created. 
> three: Check whether IP account and password configuration is correct in HertzBeat's configuration file `application.yml`.  
