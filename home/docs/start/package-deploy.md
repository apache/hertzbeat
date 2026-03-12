---
id: package-deploy
title: Install HertzBeat via Package
sidebar_label: Install via Package
---

:::tip
You can install and run Apache HertzBeat™ on Linux Windows Mac system, and CPU supports X86/ARM64.
The current branch uses `Java 25`, and the standard installation package no longer provides a built-in JDK. Use HertzBeat according to the following situations:

- When the default environment variable on your server is `Java 25`, you do not need to take any action for this step.
- When the default environment variable on your server is not `Java 25`, such as `Java 8`, `Java 11`, or `Java 21`, and if there are no other applications on your server that require a lower version of Java, download `Java 25` from [https://www.oracle.com/java/technologies/downloads/](https://www.oracle.com/java/technologies/downloads/) according to your system, and set a new environment variable pointing to `Java 25`.
- When the default environment variable on your server is not `Java 25`, such as `Java 8`, `Java 11`, or `Java 21`, and you do not want to change the environment variable because there are other applications on your server that require a lower version of Java, download `Java 25` from [https://www.oracle.com/java/technologies/downloads/](https://www.oracle.com/java/technologies/downloads/) according to your system, rename the extracted folder to `java`, and then copy it to the HertzBeat extraction directory.

:::

### Deploy HertzBeat Server

1. Download installation package

   Download installation package `apache-hertzbeat-xxx-bin.tar.gz` corresponding to your system environment
   - [Download Page](/docs/download)

2. Configure HertzBeat's configuration file(optional)

   Unzip the installation package to the host eg: /opt/hertzbeat

   ```shell
   tar zxvf apache-hertzbeat-xxx-bin.tar.gz
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

   Access [http://ip:1157/](http://ip:1157/) using browser. You can explore HertzBeat with default account `admin/hertzbeat` now!

### Deploy HertzBeat Collector Cluster(Optional)

:::note
HertzBeat Collector is a lightweight data collector used to collect and send data to HertzBeat Server.
Deploying multiple HertzBeat Collectors can achieve high availability, load balancing, and cloud-edge collaboration of data.
:::

:::tip Native Collector Recommendation
If your monitoring workload does not depend on external JDBC drivers from `ext-lib`, prefer the native collector package for faster startup and lower memory usage.

Before choosing it, review the trade-offs in [Native Collector Guide](native-collector).
:::

![HertzBeat](/img/docs/cluster-arch.png)

1. Download installation package

   Download the collector package that matches your deployment mode:
   - JVM collector package: `apache-hertzbeat-collector-xxx-bin.tar.gz`
   - Native collector package for Linux or macOS: `apache-hertzbeat-collector-native-xxx-{platform}-bin.tar.gz`
   - Native collector package for Windows: `apache-hertzbeat-collector-native-xxx-windows-amd64-bin.zip`
   - [Download Page](/docs/download)

2. Configure the collector configuration file

   Unzip the installation package to the host eg: /opt/hertzbeat-collector

   ```shell
   tar zxvf apache-hertzbeat-collector-xxx-bin.tar.gz
   # or
   tar zxvf apache-hertzbeat-collector-native-xxx-linux-amd64-bin.tar.gz
   # or
   unzip apache-hertzbeat-collector-native-xxx-windows-amd64-bin.zip
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

   Run `$ ./bin/startup.sh` or `bin/startup.bat` for the JVM collector package. Run `$ ./bin/startup.sh` for Linux or macOS native collector packages, and `bin\\startup.bat` for the Windows native collector package.

4. Begin to explore HertzBeat Collector

   Open the HertzBeat server dashboard at `http://<manager-host>:1157` and confirm the new collector is registered.

:::important Native Collector Limitations
The native collector package is suitable for monitoring types that do not rely on external JVM classpath extension.

See [Native Collector Guide](native-collector) for package selection, package naming, and platform-specific trade-offs.

`ext-lib`-based JDBC driver loading is a JVM collector capability. The native collector package does not support loading external JDBC driver JARs from `ext-lib` at runtime.

If your monitoring depends on external JDBC drivers, use the JVM collector package instead of the native collector package. This currently includes:

- MySQL, which requires `mysql-connector-j`
- OceanBase, which also relies on the MySQL JDBC driver
- Oracle, which requires `ojdbc8` and often `orai18n`
- DB2, which requires `jcc`

Recommended deployment:

- Use the native collector package for HTTP, website, port, ping, and similar non-JDBC monitoring types
- Use the JVM collector package when you need `ext-lib` driver extension
:::

**HAVE FUN**

----

### FAQ

1. you need to prepare the JAVA environment in advance

   Install JAVA runtime environment-refer to [official website](https://www.oracle.com/java/technologies/downloads/)
   requirement：JDK25 ENV
   download JAVA installation package: [mirror website](https://mirrors.huaweicloud.com/openjdk/)
   After installation use command line to check whether you install it successfully.

   ```shell
   $ java -version
     openjdk version "25.0.2" 2026-01-20
     OpenJDK Runtime Environment (build 25.0.2+8)
     OpenJDK 64-Bit Server VM (build 25.0.2+8, mixed mode, sharing)

   ```

2. According to the process deploy，visit [http://ip:1157/](http://ip:1157/) no interface
   Please refer to the following points to troubleshoot issues:

   > 1：If you switch to dependency service MYSQL database，check whether the database is created and started successfully.
   > 2：Check whether dependent services, IP account and password configuration is correct in HertzBeat's configuration file `hertzbeat/config/application.yml`.
   > 3：Check whether the running log has errors in `hertzbeat/logs/` directory. If you haven't solved the issue, report it to the communication group or community.
