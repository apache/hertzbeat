---
id: package-deploy  
title: Install HertzBeat via Package 
sidebar_label: Install via Package
---

:::tip
You can install and run Apache HertzBeat (incubating) on Linux Windows Mac system, and CPU supports X86/ARM64.
Deployment via package relies on Java runtime environment, ensure you have Java17 environment installed, if not please refer to [official website](http://www.oracle.com/technetwork/java/javase/downloads/index.html)
:::

### Deploy HertzBeat Server

1. Download installation package

   Download installation package `apache-hertzbeat-xxx-incubating-bin.tar.gz` corresponding to your system environment
   - [Download Page](/docs/download)

2. Configure HertzBeat's configuration file(optional)

   Unzip the installation package to the host eg: /opt/hertzbeat

   ```shell
   tar zxvf apache-hertzbeat-xxx-incubating-bin.tar.gz
   ```

   :::tip
   The configuration file is located in `config/application.yml`, you can modify the configuration file according to your needs to configure external dependent services, such as databases, time series databases, etc.
   HertzBeat defaults to using internal services when started, but it is recommended to switch to external database services in production environments.
   :::

   It is recommended to use [PostgreSQL](postgresql-change) for metadata storage and [VictoriaMetrics](victoria-metrics-init) for metric data storage. Specific steps are as follows

   - [Switch built-in H2 database to PostgreSQL](postgresql-change)
   - [Using VictoriaMetrics to store metric data](victoria-metrics-init)

3. Configure the account file(optional)

   HertzBeat default built-in three user accounts, respectively `admin/hertzbeat tom/hertzbeat guest/hertzbeat`
   If you need modify account or password, configure `config/sureness.yml`.
   For detail steps, please refer to [Configure Account Password](account-modify)

4. Start the service

   Execute the startup script in the installation directory `bin/`, or `startup.bat` in windows.

   ```shell
   ./startup.sh 
   ```

5. Begin to explore HertzBeat

   Access <http://ip:1157/> using browser. You can explore HertzBeat with default account `admin/hertzbeat` now!

### Deploy HertzBeat Collector Cluster(Optional)

:::note
HertzBeat Collector is a lightweight data collector used to collect and send data to HertzBeat Server.
Deploying multiple HertzBeat Collectors can achieve high availability, load balancing, and cloud-edge collaboration of data.
:::

![hertzbeat](/img/docs/cluster-arch.png)

1. Download installation package

   Download installation package `apache-hertzbeat-collector-xxx-incubating-bin.tar.gz` corresponding to your system environment
   - [Download Page](/docs/download)

2. Configure the collector configuration file

   Unzip the installation package to the host eg: /opt/hertzbeat-collector

   ```shell
   tar zxvf apache-hertzbeat-collector-xxx-incubating-bin.tar.gz
   ```

   Configure the collector configuration yml file `config/application.yml`: unique `identity` name, running `mode` (public or private), hertzbeat `manager-host`, hertzbeat `manager-port`

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

   > Parameters detailed explanation

   - `identity` : (optional) Set the unique identifier name of the collector. Note that the name of the collector must be unique when there are multiple collectors.
   - `mode` : Configure the running mode (public or private), public cluster mode or private cloud-edge mode.
   - `manager-host` : Important, configure the address of the connected HertzBeat Server,
   - `manager-port` : (optional) Configure the port of the connected HertzBeat Server, default 1158.

3. Start the service

   Run command `$ ./bin/startup.sh` or `bin/startup.bat`

4. Begin to explore HertzBeat Collector

   Access `http://ip:1157` and you will see the registered new collector in dashboard

**HAVE FUN**

----

### FAQ

1. you need to prepare the JAVA environment in advance

   Install JAVA runtime environment-refer to [official website](http://www.oracle.com/technetwork/java/javase/downloads/index.html)
   requirement：JDK17 ENV
   download JAVA installation package: [mirror website](https://repo.huaweicloud.com/java/jdk/)
   After installation use command line to check whether you install it successfully.

   ```shell
   $ java -version
   java version "17.0.9"
   Java(TM) SE Runtime Environment 17.0.9 (build 17.0.9+8-LTS-237)
   Java HotSpot(TM) 64-Bit Server VM 17.0.9 (build 17.0.9+8-LTS-237, mixed mode)

   ```

2. According to the process deploy，visit <http://ip:1157/> no interface
   Please refer to the following points to troubleshoot issues:

   > 1：If you switch to dependency service MYSQL database，check whether the database is created and started successfully.  
   > 2：Check whether dependent services, IP account and password configuration is correct in HertzBeat's configuration file `hertzbeat/config/application.yml`.  
   > 3：Check whether the running log has errors in `hertzbeat/logs/` directory. If you haven't solved the issue, report it to the communication group or community.
