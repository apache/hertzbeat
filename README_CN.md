<p align="center">
  <a href="https://hertzbeat.apache.org">
     <img alt="hertzbeat" src="/home/static/img/hertzbeat-brand.svg" width="260">
  </a>
</p>

<p align="center">
<b>Readme</b>:
<a href="README.md">English</a> | <b><a href="README_CN.md">中文</a></b> | <a href="README_JP.md">日本語</a>
</p>

[![Discord](https://img.shields.io/badge/Chat-Discord-7289DA?logo=discord)](https://discord.gg/Fb6M73htGr)
[![Twitter](https://img.shields.io/twitter/follow/hertzbeat1024?logo=twitter)](https://x.com/hertzbeat1024)
[![OpenSSF Best Practices](https://www.bestpractices.dev/projects/8139/badge)](https://www.bestpractices.dev/projects/8139)
[![codecov](https://codecov.io/gh/apache/HertzBeat/branch/master/graph/badge.svg)](https://app.codecov.io/gh/apache/hertzbeat)
[![Docker Pulls](https://img.shields.io/docker/pulls/apache/hertzbeat?style=%20for-the-badge&logo=docker&label=DockerHub%20Download)](https://hub.docker.com/r/apache/hertzbeat)
[![Artifact Hub](https://img.shields.io/endpoint?url=https://artifacthub.io/badge/repository/hertzbeat)](https://artifacthub.io/packages/search?repo=hertzbeat)
[![YouTube Channel Subscribers](https://img.shields.io/youtube/channel/subscribers/UCri75zfWX0GHqJFPENEbLow?logo=youtube&label=YouTube%20Channel)](https://www.youtube.com/channel/UCri75zfWX0GHqJFPENEbLow)
[![Contribute with Gitpod](https://img.shields.io/badge/Contribute%20with-Gitpod-908a85?logo=gitpod&color=green)](https://gitpod.io/#https://github.com/apache/hertzbeat)


**官网: [hertzbeat.apache.org](https://hertzbeat.apache.org)**
**邮件: <a href="mailto:dev-subscribe@hertzbeat.apache.org">发送至 ```dev-subscribe@hertzbeat.apache.org```</a>** 订阅邮件列表


## 🎡 <font color="green">介绍</font>

[Apache HertzBeat™](https://github.com/apache/hertzbeat) 是 AI 驱动的下一代开源实时观测系统。指标日志统一收集，告警一站分发，智能管控分析。无需 Agent，高性能集群，提供强大的自定义监控和状态页构建能力。

### 特点

- 集```采集+分析+告警+通知```为一体，HertzBeat AI 驱动下的新交互与功能，也内置 MCP Server 对外能力。
- 统一的指标平台，无需 Agent，兼容 Prometheus，支持应用服务，程序，数据库，缓存，操作系统，大数据，中间件，Web 服务器，云原生，网络，自定义等。
- 统一的日志平台，通过 OTLP 协议多日志源无缝对接上报。
- 统一的告警平台，内部告警与外部多种告警源集成接入，统一告警处理分析，灵活的实时与周期阈值规则，分组收敛，静默，抑制等。
- 统一的消息分发，告警平台处理后通过 `邮件` `Discord` `Slack` `Telegram` `钉钉` `微信` `飞书` `短信` `Webhook` `Server酱` 等方式分发通知。
- 将 `Http, Jmx, Ssh, Snmp, Jdbc, Prometheus` 等协议规范可配置化，只需配置模板 `YML` 就能自定义采集指标。您相信只需简单配置即可快速适配一款 `K8s` 或 `Docker` 等新的监控类型吗？
- 高性能，支持多采集器集群横向扩展，支持多隔离网络监控，云边协同。
- 提供强大的状态页构建能力，轻松向用户传达您产品服务的实时状态。


> `HertzBeat`的统一平台，AI智能，强大自定义，多类型支持，高性能，易扩展，希望能帮助用户快速方便实现观测需求。

----

----

## 🥐 模块

![hertzBeat](home/static/img/docs/hertzbeat-architecture.png)

## 🐕 快速开始

- 如果您是想将 HertzBeat 部署到内网环境搭建监控系统，请参考下面的部署文档进行操作。

### 🍞 HertzBeat 安装
> HertzBeat 支持通过源码安装启动，Docker 容器运行和安装包方式安装部署，CPU 架构支持 x86/arm64。

##### 方式一：Docker 方式快速安装

1. `docker` 环境仅需一条命令即可开始

   ```shell
   docker run -d -p 1157:1157 -p 1158:1158 --name hertzbeat apache/hertzbeat
   ```

2. 浏览器访问 `http://localhost:1157` 即可开始，默认账号密码 `admin/hertzbeat`

3. 部署采集器集群（可选）

   ```shell
   docker run -d -e IDENTITY=custom-collector-name -e MANAGER_HOST=127.0.0.1 -e MANAGER_PORT=1158 --name hertzbeat-collector apache/hertzbeat-collector
   ```

   - `-e IDENTITY=custom-collector-name` : 配置此采集器的唯一性标识符名称，多个采集器名称不能相同，建议自定义英文名称。
    - `-e MODE=public` : 配置运行模式(public or private), 公共集群模式或私有云边模式。
    - `-e MANAGER_HOST=127.0.0.1` : 配置连接主 HertzBeat 服务的对外 IP。
    - `-e MANAGER_PORT=1158` : 配置连接主 HertzBeat 服务的对外端口，默认1158。


更多配置详细步骤参考 [通过 Docker 方式安装 HertzBeat](https://hertzbeat.apache.org/docs/start/docker-deploy)

##### 方式二：通过安装包安装

1. 下载您系统环境对应的安装包 `apache-hertzbeat-xx-bin.tar.gz` [Download](https://hertzbeat.apache.org/docs/download)
2. 配置 HertzBeat 的配置文件 `hertzbeat/config/application.yml` (可选)
3. 部署启动 `$ ./bin/startup.sh ` 或 `bin/startup.bat`
4. 浏览器访问 `http://localhost:1157` 即可开始，默认账号密码 `admin/hertzbeat`
5. 部署采集器集群（可选）
   - 下载采集器安装包 `apache-hertzbeat-collector-xx-bin.tar.gz`（JVM 采集器）或与你目标平台匹配的 Native 采集器安装包，例如 `apache-hertzbeat-collector-native-xx-linux-amd64-bin.tar.gz`、`apache-hertzbeat-collector-native-xx-windows-amd64-bin.zip`，到规划的另一台部署主机上 [Download](https://hertzbeat.apache.org/docs/download)
   - 配置采集器的配置文件 `hertzbeat-collector/config/application.yml` 里面的连接主 HertzBeat 服务的对外 IP，端口，当前采集器名称(需保证唯一性)等参数 `identity` `mode` (public or private) `manager-host` `manager-port`
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
   - 如果没有在 `ext-lib` 中提供 JDBC 驱动，MySQL、MariaDB、OceanBase 可以直接使用内置查询引擎，也可以使用 Native 采集器安装包；TiDB 的 SQL 查询指标也遵循同样规则。
   - 如果在 `ext-lib` 中放入了 `mysql-connector-j`，主程序内置采集器或 JVM 采集器会在重启后自动优先走 JDBC；这一点现在适用于 MySQL、MariaDB、OceanBase，TiDB 的 SQL 查询指标也遵循同样规则，而它的 HTTP 指标不受影响。Oracle、DB2 仍然必须使用 JVM 采集器安装包，因为它们依赖外置 JDBC 驱动。
   - JVM 采集器安装包使用 `$ ./bin/startup.sh ` 或 `bin/startup.bat` 启动。Linux 或 macOS 的 Native 采集器安装包使用 `$ ./bin/startup.sh ` 启动，Windows 的 Native 采集器安装包使用 `bin\\startup.bat` 启动
   - 浏览器访问主 HertzBeat 服务 `http://localhost:1157` 查看概览页面即可看到注册上来的新采集器

更多配置详细步骤参考 [通过安装包安装HertzBeat](https://hertzbeat.apache.org/docs/start/package-deploy)

##### 方式三：本地代码启动

1. 此为前后端分离项目，本地代码调试需要分别启动后端工程 `hertzbeat-startup` 和前端工程 `web-app`
2. 后端：需要 `maven3+`, `java25` 和 `lombok` 环境，修改 `YML` 配置信息，添加JVM参数`--add-opens=java.base/java.nio=org.apache.arrow.memory.core,ALL-UNNAMED`后启动 `hertzbeat-startup` 服务即可。
3. 前端：需要 `nodejs` 和 `pnpm` 环境，待本地后端启动后，在 `web-app` 目录下执行 `pnpm install` 再执行 `pnpm start`
4. 浏览器访问 `http://localhost:4200` 即可开始，默认账号密码 `admin/hertzbeat`

详细步骤参考 [参与贡献之本地代码启动](CONTRIBUTING.md)

##### 方式四：Docker-Compose 统一安装 hertzbeat+postgresql+tsdb

通过 [Docker-Compose 部署脚本](script/docker-compose) 一次性把 postgresql/mysql 数据库, victoria-metrics/iotdb/tdengine 时序数据库和 hertzbeat 安装部署。

详细步骤参考 [通过 Docker-Compose 安装 HertzBeat](script/docker-compose/README.md)

##### 方式五：Kubernetes Helm Charts 部署 hertzbeat+collector+postgresql+tsdb

通过 Helm Chart 一次性将 HertzBeat 集群组件部署到 Kubernetes 集群中。

详细步骤参考 [Artifact Hub](https://artifacthub.io/packages/helm/hertzbeat/hertzbeat)

**HAVE FUN**

## ✨ Contributors

Thanks these wonderful people, welcome to join us:
[贡献者指南](CONTRIBUTING.md)

<a href="https://github.com/apache/hertzbeat/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=apache/hertzbeat&max=500&columns=18&anon=1" alt="contributors"/>
</a>

## 💬 社区交流

##### Channel

[订阅邮件列表](https://lists.apache.org/list.html?dev@hertzbeat.apache.org) : 发送邮件至 `dev-subscribe@hertzbeat.apache.org` 来订阅邮件列表.

[Chat On Discord](https://discord.gg/Fb6M73htGr)

微信交流群 : 加 `ahertzbeat` 好友邀请进群.

微信公众号 : 搜索 ID `usthecom`.

[Github Discussion](https://github.com/apache/hertzbeat/discussions)

[Follow Us Twitter](https://x.com/hertzbeat1024)

[Subscribe YouTube](https://www.youtube.com/channel/UCri75zfWX0GHqJFPENEbLow)


##### Open-Source Project Build From Open-Source

HertzBeat is built on so many great open source projects, thanks to them!

- `Java Spring SpringBoot Jpa Maven Assembly Netty Lombok Sureness Protobuf HttpClient Guava SnakeYaml JsonPath ...`
- `TypeScript Angular NG-ZORRO NG-ALAIN NodeJs Npm Html Less Echarts Rxjs ZoneJs MonacoEditor SlickCarousel Docusaurus ...`


## Landscape

<p align="left">
<img src="./home/static/img/home/cncf-landscape-left-logo.svg" width="300">&nbsp;&nbsp;<img src="./home/static/img/home/cncf-right-logo.svg" width="345" />
<br /><br />
HertzBeat has been included in the <a href="https://landscape.cncf.io/?item=observability-and-analysis--observability--hertzbeat">
CNCF Observability And Analysis - Observability Landscape.</a>
</p>

## 🛡️ License
[`Apache License, Version 2.0`](https://www.apache.org/licenses/LICENSE-2.0.html)
