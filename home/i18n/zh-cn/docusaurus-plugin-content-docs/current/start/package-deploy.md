---
id: package-deploy
title: 通过安装包安装 HertzBeat
sidebar_label: 安装包方式安装
---

:::tip
Apache HertzBeat™ 支持在Linux Windows Mac系统安装运行，CPU支持X86/ARM64。
当前分支默认使用 `Java 25`，且标准安装包不再提供内置 JDK。可参考以下情况使用 HertzBeat：

- 当你的服务器中默认环境变量为 `Java 25` 时，这一步无需任何操作。
- 当你的服务器中默认环境变量不为 `Java 25` 时，如 `Java 8`、`Java 11`、`Java 21`，若你服务器中**没有**其他应用需要低版本 `Java`，根据你的系统到 [https://www.oracle.com/java/technologies/downloads/](https://www.oracle.com/java/technologies/downloads/) 下载 `Java 25`，并将环境变量指向新的 `Java 25`。
- 当你的服务器中默认环境变量不为 `Java 25` 时，如 `Java 8`、`Java 11`、`Java 21`，若你服务器中**有**其他应用需要低版本 `Java`，不希望修改全局环境变量，可根据你的系统到 [https://www.oracle.com/java/technologies/downloads/](https://www.oracle.com/java/technologies/downloads/) 下载 `Java 25`，并将解压后的文件夹重命名为 `java`，复制到 HertzBeat 的解压目录下。

:::

### 部署 HertzBeat Server

1. 下载安装包

   从 [下载页面](/docs/download) 下载您系统环境对应的安装包版本 `apache-hertzbeat-xxx-bin.tar.gz`

2. 设置配置文件(可选)

   解压安装包到主机 eg: /opt/hertzbeat

   ```shell
   tar zxvf apache-hertzbeat-xxx-bin.tar.gz
   ```

   :::tip
   位于 `config/application.yml` 的配置文件，您可以根据需求修改配置文件来配置外部依赖的服务，如数据库，时序数据库等参数。
   HertzBeat 启动时默认全使用内部服务，但生产环境建议切换为外部数据库服务。
   :::

   建议元数据存储使用 [PostgreSQL](postgresql-change), 指标数据存储使用 [VictoriaMetrics](victoria-metrics-init), 具体步骤参见

   - [内置 H2 数据库切换为 PostgreSQL](postgresql-change)
   - [使用 VictoriaMetrics 存储指标数据](victoria-metrics-init)

3. 配置账户文件(可选)

   HertzBeat 默认内置三个用户账户,分别为 admin/hertzbeat tom/hertzbeat guest/hertzbeat
   若需要新增删除修改账户或密码，可以通过修改位于 `config/sureness.yml` 的配置文件实现，具体参考

   - [配置修改账户密码](account-modify)

4. 启动

   执行位于安装目录 bin 下的启动脚本 startup.sh, windows 环境下为 startup.bat

   ```shell
   ./startup.sh
   ```

5. 开始探索HertzBeat
   浏览器访问 [http://ip:1157/](http://ip:1157/) 即刻开始探索使用HertzBeat，默认账户密码 admin/hertzbeat。

### 部署 HertzBeat Collector 集群(可选)

:::note
HertzBeat Collector 是一个轻量级的数据采集器，用于采集并将数据发送到 HertzBeat Server。
通过部署多个 HertzBeat Collector 可以实现数据的高可用，负载均衡和云边协同。
:::

:::tip Native 采集器推荐
如果你的监控任务不依赖从 `ext-lib` 动态加载外部 JDBC 驱动，优先选择 Native 采集器安装包，通常启动更快、常驻内存更低。MySQL、MariaDB、OceanBase 在没有提供 `mysql-connector-j` 时，也可以直接使用 Native 采集器安装包；TiDB 的 SQL 查询指标也遵循同样规则。

在选择前，建议先阅读 [Native 采集器指南](native-collector) 了解它的限制和取舍。
:::

![HertzBeat](/img/docs/cluster-arch.png)

1. 下载安装包

   按部署形态选择对应的采集器安装包：
   - JVM 采集器安装包：`apache-hertzbeat-collector-xxx-bin.tar.gz`
   - Linux 或 macOS 的 Native 采集器安装包：`apache-hertzbeat-collector-native-xxx-{platform}-bin.tar.gz`
   - Windows 的 Native 采集器安装包：`apache-hertzbeat-collector-native-xxx-windows-amd64-bin.zip`
   - 从 [下载页面](/docs/download) 下载

2. 设置配置文件

   解压安装包到主机 eg: /opt/hertzbeat-collector

   ```shell
   tar zxvf apache-hertzbeat-collector-xxx-bin.tar.gz
   # 或
   tar zxvf apache-hertzbeat-collector-native-xxx-linux-amd64-bin.tar.gz
   # 或
   unzip apache-hertzbeat-collector-native-xxx-windows-amd64-bin.zip
   ```

   配置采集器的配置文件 `config/application.yml` 里面的 HertzBeat Server 连接 IP, 端口, 采集器名称(需保证唯一性)等参数。

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

   > 参数详解

   - `identity` : (可选) 设置采集器的唯一标识名称。注意多采集器时名称需保证唯一性。
   - `mode` : 配置运行模式(public or private), 公共集群模式或私有云边模式。
   - `manager-host` : 重要, 配置连接的 HertzBeat Server 地址，
   - `manager-port` :  (可选) 配置连接的 HertzBeat Server 端口，默认 1158.

3. 启动

   JVM 采集器安装包执行位于安装目录 `hertzbeat-collector/bin/` 下的启动脚本 `startup.sh`，Windows 环境下为 `startup.bat`；Linux 或 macOS 的 Native 采集器安装包执行 `./startup.sh`，Windows 的 Native 采集器安装包执行 `bin\\startup.bat`

4. 开始探索 HertzBeat Collector
   浏览器访问主 HertzBeat 服务 [http://manager-host:1157/](http://manager-host:1157/) 的概览页面，即可确认新采集器已注册。

:::important Native 采集器限制说明
Native 采集器适合不依赖外部 JVM classpath 扩展的监控类型。

关于包选择、安装包命名和平台相关限制，详见 [Native 采集器指南](native-collector)。

基于 `ext-lib` 的 JDBC 驱动加载能力是 JVM 采集器的能力。Native 采集器当前不支持在运行时从 `ext-lib` 目录动态加载外部 JDBC 驱动 JAR。

因此，凡是依赖外置 JDBC 驱动的监控类型，请使用 JVM 采集器，不要使用 Native 采集器。当前至少包括：

- Oracle，需要 `ojdbc8`，部分场景还需要 `orai18n`
- DB2，需要 `jcc`
- 任何明确把 `mysql-connector-j` 放进 `ext-lib` 并希望继续走 JDBC 的 MySQL、MariaDB、OceanBase 场景

建议部署方式：

- `API`、`网站`、`端口可用性`、`Ping` 等非 JDBC 类型，以及不依赖 `ext-lib` 的 MySQL、MariaDB、OceanBase，优先使用 Native 采集器
- 需要 `ext-lib` 扩展驱动时使用 JVM 采集器
:::

**HAVE FUN**

----

### 安装包部署常见问题

**最多的问题就是网络环境问题，请先提前排查**

1. 启动失败，需您提前准备JAVA运行环境

   安装JAVA运行环境-可参考[官方网站](https://www.oracle.com/java/technologies/downloads/)
   要求：JAVA25环境
   下载JAVA安装包: [镜像站](https://mirrors.huaweicloud.com/openjdk/)
   安装后命令行检查是否成功安装

   ```shell
   $ java -version
     openjdk version "25.0.2" 2026-01-20
     OpenJDK Runtime Environment (build 25.0.2+8)
     OpenJDK 64-Bit Server VM (build 25.0.2+8, mixed mode, sharing)

   ```

2. 按照流程部署，访问 [http://ip:1157/](http://ip:1157/) 无界面
   请参考下面几点排查问题：

   > 一：若切换了依赖服务MYSQL数据库，排查数据库是否成功创建，是否启动成功
   > 二：HertzBeat的配置文件 `hertzbeat/config/application.yml` 里面的依赖服务IP账户密码等配置是否正确
   > 三：若都无问题可以查看 `hertzbeat/logs/` 目录下面的运行日志是否有明显错误，提issue或交流群或社区反馈
