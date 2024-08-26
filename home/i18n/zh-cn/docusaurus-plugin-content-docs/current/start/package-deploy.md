---
id: package-deploy  
title: 通过安装包安装 HertzBeat    
sidebar_label: 安装包方式安装
---

:::tip
Apache HertzBeat (incubating) 支持在Linux Windows Mac系统安装运行，CPU支持X86/ARM64。
安装包方式依赖 Java 运行环境，需您的环境中已经拥有 Java17 环境，若未安装请参考 [官方网站](http://www.oracle.com/technetwork/java/javase/downloads/index.html)
:::

### 部署 HertzBeat Server

1. 下载安装包

   从 [下载页面](/docs/download) 下载您系统环境对应的安装包版本 `apache-hertzbeat-xxx-incubating-bin.tar.gz`

2. 设置配置文件(可选)

   解压安装包到主机 eg: /opt/hertzbeat

   ```shell
   tar zxvf apache-hertzbeat-xxx-incubating-bin.tar.gz
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
   浏览器访问 <http://ip:1157/> 即刻开始探索使用HertzBeat，默认账户密码 admin/hertzbeat。

### 部署 HertzBeat Collector 集群(可选)

:::note
HertzBeat Collector 是一个轻量级的数据采集器，用于采集并将数据发送到 HertzBeat Server。
通过部署多个 HertzBeat Collector 可以实现数据的高可用，负载均衡和云边协同。
:::

![hertzbeat](/img/docs/cluster-arch.png)

1. 下载安装包

   从 [下载页面](/docs/download) 下载您系统环境对应的安装包版本 `apache-hertzbeat-collector-xxx-incubating-bin.tar.gz`

2. 设置配置文件

   解压安装包到主机 eg: /opt/hertzbeat-collector

   ```shell
   tar zxvf apache-hertzbeat-collector-xxx-incubating-bin.tar.gz
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

   执行位于安装目录 hertzbeat-collector/bin/ 下的启动脚本 startup.sh, windows 环境下为 startup.bat

   ```shell
   ./startup.sh 
   ```

4. 开始探索 HertzBeat Collector  
   浏览器访问 <http://ip:1157/> 即可开始探索使用，默认账户密码 admin/hertzbeat。

**HAVE FUN**

----

### 安装包部署常见问题

**最多的问题就是网络环境问题，请先提前排查**

1. 启动失败，需您提前准备JAVA运行环境

   安装JAVA运行环境-可参考[官方网站](http://www.oracle.com/technetwork/java/javase/downloads/index.html)  
   要求：JAVA17环境  
   下载JAVA安装包: [镜像站](https://repo.huaweicloud.com/java/jdk/)  
   安装后命令行检查是否成功安装

   ```shell
   $ java -version
   java version "17.0.9"
   Java(TM) SE Runtime Environment 17.0.9 (build 17.0.9+8-LTS-237)
   Java HotSpot(TM) 64-Bit Server VM 17.0.9 (build 17.0.9+8-LTS-237, mixed mode)
   
   ```

2. 按照流程部署，访问 <http://ip:1157/> 无界面
   请参考下面几点排查问题：

   > 一：若切换了依赖服务MYSQL数据库，排查数据库是否成功创建，是否启动成功  
   > 二：HertzBeat的配置文件 `hertzbeat/config/application.yml` 里面的依赖服务IP账户密码等配置是否正确  
   > 三：若都无问题可以查看 `hertzbeat/logs/` 目录下面的运行日志是否有明显错误，提issue或交流群或社区反馈
