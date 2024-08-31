---
id: quickstart  
title: 快速开始    
sidebar_label: 快速开始
---

### 🐕 开始使用

- 如果您是想将 Apache HertzBeat (incubating) 部署到本地搭建监控系统，请参考下面的部署文档进行操作。

### 🍞 HertzBeat安装

> HertzBeat支持通过源码安装启动，Docker容器运行和安装包方式安装部署，CPU架构支持X86/ARM64。

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

1. 此为前后端分离项目，本地代码调试需要分别启动后端工程`manager`和前端工程`web-app`
2. 后端：需要`maven3+`, `java17`和`lombok`环境，修改`YML`配置信息并启动`manager`服务
3. 前端：需要`nodejs npm angular-cli`环境，待本地后端启动后，在`web-app`目录下启动 `ng serve --open`
4. 浏览器访问 `http://localhost:4200` 即可开始，默认账号密码 `admin/hertzbeat`

详细步骤参考 [参与贡献之本地代码启动](../community/contribution)

##### 方式四：Docker-Compose 统一安装 hertzbeat+postgresql+tsdb

通过 [docker-compose部署脚本](https://github.com/apache/hertzbeat/tree/master/script/docker-compose) 一次性把 postgresql/mysql 数据库, victoria-metrics/iotdb/tdengine 时序数据库和 hertzbeat 安装部署。

详细步骤参考 [docker-compose部署方案](https://github.com/apache/hertzbeat/tree/master/script/docker-compose/README.md)

##### 方式五：Kubernetes Helm Charts 部署 hertzbeat+collector+postgresql+tsdb

通过 Helm Chart 一次性将 HertzBeat 集群组件部署到 Kubernetes 集群中。

详细步骤参考 [Artifact Hub](https://artifacthub.io/packages/helm/hertzbeat/hertzbeat)

**HAVE FUN**
