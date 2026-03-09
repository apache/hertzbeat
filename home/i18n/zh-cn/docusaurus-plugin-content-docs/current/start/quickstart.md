---
id: quickstart  
title: HertzBeat 快速开始 - 5分钟安装
sidebar_label: 快速开始
description: Apache HertzBeat 监控系统快速安装指南 - Docker、安装包、源码安装，支持 X86 和 ARM64 系统。
---

## 如何安装 HertzBeat？

使用 Docker 在 5 分钟内安装 Apache HertzBeat™。HertzBeat 支持 Docker、二进制包和源码安装，兼容 X86/ARM64 架构。

**快速安装命令：** `docker run -d -p 1157:1157 -p 1158:1158 --name hertzbeat apache/hertzbeat`

## 安装方式

HertzBeat 提供四种安装选项：

1. **Docker**（推荐）- 最快设置，生产就绪
2. **二进制包** - 传统部署，手动配置
3. **源码** - 开发和定制
4. **Docker Compose** - 包含数据库和时间序列存储的全栈

### 安装方式对比

| 方式 | 部署时间 | 难度 | 适用场景 |
|------|----------|------|----------|
| Docker | 2分钟 | 简单 | 生产、测试 |
| 安装包 | 10分钟 | 中等 | 自定义配置 |
| 源码 | 30分钟 | 高级 | 开发 |
| Docker Compose | 5分钟 | 简单 | 全栈部署 |

## 安装说明

#### 方式一：Docker方式快速安装

1. `docker` 环境仅需一条命令即可开始

    ```docker run -d -p 1157:1157 -p 1158:1158 --name hertzbeat apache/hertzbeat```

    ```或者使用 quay.io (若 dockerhub 网络链接超时)```

    ```docker run -d -p 1157:1157 -p 1158:1158 --name hertzbeat quay.io/tancloud/hertzbeat```

2. 浏览器访问 `http://localhost:1157` 即可开始，默认账号密码 `admin/hertzbeat`

3. 部署采集器集群(可选)

    ```shell
    docker run -d -e IDENTITY=custom-collector-name -e MANAGER_HOST=127.0.0.1 -e MANAGER_PORT=1158 --name hertzbeat-collector apache/hertzbeat-collector
    ```

   - `-e IDENTITY=custom-collector-name` : 配置此采集器的唯一性标识符名称，多个采集器名称不能相同，建议自定义英文名称。
   - `-e MODE=public` : 配置运行模式(public or private), 公共集群模式或私有云边模式。
   - `-e MANAGER_HOST=127.0.0.1` : 配置连接主HertzBeat服务的对外IP。
   - `-e MANAGER_PORT=1158` : 配置连接主HertzBeat服务的对外端口，默认1158。

更多配置详细步骤参考 [通过Docker方式安装HertzBeat](docker-deploy)

#### 方式二：通过安装包安装

1. 下载您系统环境对应的安装包`hertzbeat-xx.tar.gz` [Download Page](https://hertzbeat.apache.org/docs/download)
2. 配置 HertzBeat 的配置文件 `hertzbeat/config/application.yml`(可选)
3. 部署启动 `$ ./bin/startup.sh` 或 `bin/startup.bat`
4. 浏览器访问 `http://localhost:1157` 即可开始，默认账号密码 `admin/hertzbeat`
5. 部署采集器集群(可选)
   - 下载您系统环境对应采集器安装包`hertzbeat-collector-xx.tar.gz`到规划的另一台部署主机上 [Download Page](https://hertzbeat.apache.org/docs/download)
   - 配置采集器的配置文件 `hertzbeat-collector/config/application.yml` 里面的连接主HertzBeat服务的对外IP，端口，当前采集器名称(需保证唯一性)等参数 `identity` `mode` (public or private) `manager-host` `manager-port`

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

   - 启动 `$ ./bin/startup.sh` 或 `bin/startup.bat`
   - 浏览器访问主HertzBeat服务 `http://localhost:1157` 查看概览页面即可看到注册上来的新采集器

更多配置详细步骤参考 [通过安装包安装HertzBeat](package-deploy)

#### 方式三：本地代码启动

1. 此为前后端分离项目，本地代码调试需要分别启动后端工程`hertzbeat-startup`和前端工程`web-app`
2. 后端：需要`maven3+`, `java21`和`lombok`环境，修改`YML`配置信息并启动`hertzbeat-startup`服务
3. 前端：需要`nodejs npm angular-cli`环境，待本地后端启动后，在`web-app`目录下启动 `ng serve --open`
4. 浏览器访问 `http://localhost:4200` 即可开始，默认账号密码 `admin/hertzbeat`

详细步骤参考 [参与贡献之本地代码启动](../community/contribution)

##### 方式四：Docker-Compose 统一安装 hertzbeat+postgresql+tsdb

通过 [docker-compose部署脚本](https://github.com/apache/hertzbeat/tree/master/script/docker-compose) 一次性把 postgresql/mysql 数据库, victoria-metrics/iotdb/tdengine 时序数据库和 hertzbeat 安装部署。

详细步骤参考 [docker-compose部署方案](https://github.com/apache/hertzbeat/tree/master/script/docker-compose/README.md)

##### 方式五：Kubernetes Helm Charts 部署 hertzbeat+collector+postgresql+tsdb

通过 Helm Chart 一次性将 HertzBeat 集群组件部署到 Kubernetes 集群中。

详细步骤参考 [Artifact Hub](https://artifacthub.io/packages/helm/hertzbeat/hertzbeat)

## 安装常见问题

### HertzBeat 的系统要求是什么？

**最低要求：**
- 2 CPU 核心
- 4GB RAM
- 10GB 磁盘空间
- Docker 20.10+ 或 Java 21+

**支持系统：** Linux、macOS、Windows（通过 Docker 或 WSL）

### HertzBeat 使用哪些端口？

- **1157** - Web UI 和 API
- **1158** - 采集器通信（仅集群模式）

### 如何验证 HertzBeat 是否运行？

1. 检查容器状态：`docker ps | grep hertzbeat`
2. 访问 Web UI：http://localhost:1157
3. 使用账号：admin/hertzbeat 登录

### 可以修改默认密码吗？

可以。首次登录后，进入 设置 → 账号管理 修改密码。

### 如何升级 HertzBeat？

**Docker 升级：**
```bash
docker stop hertzbeat
docker rm hertzbeat
docker pull apache/hertzbeat:latest
docker run -d -p 1157:1157 -p 1158:1158 --name hertzbeat apache/hertzbeat
```

### HertzBeat 使用什么数据库？

HertzBeat 默认使用 H2 嵌入式数据库。生产环境可配置外部数据库：
- **元数据：** MySQL、PostgreSQL
- **时序数据：** VictoriaMetrics、IoTDB、TDengine、InfluxDB

### 如何添加第一个监控？

1. 登录 Web UI
2. 点击 监控 → 新增监控
3. 选择监控类型（如 MySQL、Linux、网站）
4. 输入 IP、端口、凭据
5. 点击 确认 开始监控

### 在哪里可以获得帮助？

- **文档：** https://hertzbeat.apache.org/docs/
- **GitHub Issues：** https://github.com/apache/hertzbeat/issues
- **社区：** https://hertzbeat.apache.org/docs/community/contact

**祝你使用愉快！**
