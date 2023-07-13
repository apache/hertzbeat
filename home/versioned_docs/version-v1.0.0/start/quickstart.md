---
id: quickstart  
title: 快速开始    
sidebar_label: 快速开始    
---

### 🐕 开始使用

- 如果您不想部署而是直接使用，我们提供SAAS监控云-[TanCloud探云](https://console.tancloud.cn)，即刻[登录注册](https://console.tancloud.cn)免费使用。  
- 如果您是想将HertzBeat部署到内网环境搭建监控系统，请参考下面的部署文档进行操作。 

安装部署视频教程: [HertzBeat安装部署-BiliBili](https://www.bilibili.com/video/BV1GY41177YL)   

### 🐵 依赖服务部署   

> HertzBeat最少依赖于 关系型数据库[MYSQL5+](https://www.mysql.com/) 和 时序性数据库[TDengine2+](https://www.taosdata.com/getting-started)

##### 安装MYSQL  
1. docker安装MYSQl  
`docker run -d --name mysql -p 3306:3306 -e MYSQL_ROOT_PASSWORD=123456 mysql:5.7`   
2. 创建名称为hertzbeat的数据库  
3. 执行位于项目仓库/script/sql/目录下的数据库脚本 [schema.sql](https://gitee.com/dromara/hertzbeat/raw/master/script/sql/schema.sql)      

详细步骤参考 [依赖服务MYSQL安装初始化](mysql-init)    

##### 安装TDengine   
1. docker安装TDengine   
`docker run -d -p 6030-6049:6030-6049 -p 6030-6049:6030-6049/udp --name tdengine tdengine/tdengine:2.4.0.12`     
2. 创建名称为hertzbeat的数据库

详细步骤参考 [依赖服务TDengine安装初始化](tdengine-init)   

### 🍞 HertzBeat安装   
> HertzBeat支持通过源码安装启动，Docker容器运行和安装包方式安装部署。  

#### 方式一：Docker方式快速安装
`docker run -d -p 1157:1157 -v /opt/application.yml:/opt/hertzbeat/config/application.yml --name hertzbeat tancloud/hertzbeat:[版本tag]`  

详细步骤参考 [通过Docker方式安装HertzBeat](docker-deploy) 

#### 方式二：通过安装包安装    
1. 下载您系统环境对应的安装包 [GITEE Release](https://gitee.com/dromara/hertzbeat/releases) [GITHUB Release](https://github.com/dromara/hertzbeat/releases)  
2. 配置HertzBeat的配置文件 hertzbeat/config/application.yml   
3. 部署启动 `$ ./startup.sh `   

详细步骤参考 [通过安装包安装HertzBeat](package-deploy) 

#### 方式三：本地代码启动   
1. 此为前后端分离项目，本地代码调试需要分别启动后端工程manager和前端工程web-app
2. 后端：需要`maven3+`和`java8+`环境，修改YML配置信息并启动manager服务
3. 前端：需要`nodejs npm angular-cli`环境，待本地后端启动后，在web-app目录下启动 `ng serve --open`
4. 浏览器访问 localhost:4200 即可开始，默认账户密码 admin/hertzbeat  

详细步骤参考 [参与贡献之本地代码启动](../others/contributing)

#### 方式四：Docker-Compose统一安装hertzbeat及其依赖服务

通过 [docker-compose部署脚本](https://gitee.com/dromara/hertzbeat/tree/master/script/docker-compose) 一次性把mysql数据库,tdengine数据库和hertzbeat安装部署。

详细步骤参考 [docker-compose安装](https://gitee.com/dromara/hertzbeat/tree/master/script/docker-compose/README.md)  

**HAVE FUN**
