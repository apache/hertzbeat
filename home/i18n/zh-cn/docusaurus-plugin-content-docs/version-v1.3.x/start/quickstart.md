---
id: quickstart  
title: 快速开始    
sidebar_label: 快速开始    
---

### 🐕 开始使用

- 如果您不想部署而是直接使用，我们提供SAAS监控云-[TanCloud探云](https://console.tancloud.cn)，即刻[登录注册](https://console.tancloud.cn)免费使用。  
- 如果您是想将HertzBeat部署到内网环境搭建监控系统，请参考下面的部署文档进行操作。 

### 🐵 依赖服务部署(可选)

> HertzBeat依赖于 **关系型数据库** H2(默认已内置无需安装) 或 [Mysql](mysql-change) 和 **时序性数据库** [TDengine2+](tdengine-init) 或 [IOTDB](iotdb-init) (可选)  

**注意⚠️ 若需要部署时序数据库，IotDB 和 TDengine 任选其一即可！**  

##### 安装Mysql(可选)  

1. docker安装Mysql    
   `   $ docker run -d --name mysql -p 3306:3306 -v /opt/data:/var/lib/mysql -e MYSQL_ROOT_PASSWORD=123456 mysql:5.7`   
   `-v /opt/data:/var/lib/mysql` - 为mysql数据目录本地持久化挂载，需将`/opt/data`替换为实际本地存在的目录
2. 创建名称为hertzbeat的数据库    
   `create database hertzbeat default charset utf8mb4 collate utf8mb4_general_ci;`    
3. 在hertzbeat的配置文件`application.yml`配置Mysql数据库替换H2内置数据库连接参数    

详细步骤参考 [使用Mysql替换内置H2数据库](mysql-change)   

##### 安装TDengine(可选) 

1. docker安装TDengine   
   `docker run -d -p 6030-6049:6030-6049 -p 6030-6049:6030-6049/udp --name tdengine tdengine/tdengine:3.0.4.0`
2. 创建名称为hertzbeat的数据库
3. 在hertzbeat的配置文件`application.yml`配置tdengine连接   

详细步骤参考 [使用时序数据库TDengine存储指标数据(可选)](tdengine-init)  

##### 安装IotDB(可选)  

1. Docker安装IoTDB 

```shell
$ docker run -d -p 6667:6667 -p 31999:31999 -p 8181:8181 \
    -v /opt/iotdb/data:/iotdb/data \ 
    --name iotdb \
    apache/iotdb:0.13.3-node
```

详细步骤参考 [使用时序数据库IoTDB存储指标数据(可选)](iotdb-init)  

### 🍞 HertzBeat安装   
> HertzBeat支持通过源码安装启动，Docker容器运行和安装包方式安装部署，CPU架构支持X86/ARM64。

#### 方式一：Docker方式快速安装  

1. `docker` 环境仅需一条命令即可开始

```docker run -d -p 1157:1157 --name hertzbeat tancloud/hertzbeat```

```或者使用 quay.io (若 dockerhub 网络链接超时)```

```docker run -d -p 1157:1157 --name hertzbeat quay.io/tancloud/hertzbeat```

2. 浏览器访问 `localhost:1157` 即可开始，默认账号密码 `admin/hertzbeat`

更多配置详细步骤参考 [通过Docker方式安装HertzBeat](docker-deploy) 

#### 方式二：通过安装包安装    

1. 下载您系统环境对应的安装包 [GITEE Release](https://gitee.com/dromara/hertzbeat/releases) [GITHUB Release](https://github.com/dromara/hertzbeat/releases)
2. 需要已安装java环境, `jdk11`
3. [可选]配置 HertzBeat 的配置文件 `hertzbeat/config/application.yml`
4. 部署启动 `$ ./startup.sh `
5. 浏览器访问 `localhost:1157` 即可开始，默认账号密码 `admin/hertzbeat`

更多配置详细步骤参考 [通过安装包安装HertzBeat](package-deploy) 

#### 方式三：本地代码启动   
1. 此为前后端分离项目，本地代码调试需要分别启动后端工程manager和前端工程web-app
2. 后端：需要`maven3+`, `java11`和`lombok`环境，修改YML配置信息并启动manager服务
3. 前端：需要`nodejs npm angular-cli`环境，待本地后端启动后，在web-app目录下启动 `ng serve --open`
4. 浏览器访问 `localhost:4200` 即可开始，默认账号密码 `admin/hertzbeat`

详细步骤参考 [参与贡献之本地代码启动](../others/contributing)

##### 方式四：Docker-Compose 统一安装 hertzbeat+mysql+iotdb/tdengine

通过 [docker-compose部署脚本](https://github.com/dromara/hertzbeat/tree/master/script/docker-compose) 一次性把 mysql 数据库, iotdb/tdengine 时序数据库和 hertzbeat 安装部署。

详细步骤参考 [docker-compose部署方案](https://github.com/dromara/hertzbeat/tree/master/script/docker-compose/README.md)  

**HAVE FUN**
