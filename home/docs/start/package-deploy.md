---
id: package-deploy  
title: 通过安装包安装HertzBeat    
sidebar_label: 安装包方式部署    
---

### 🐕 开始使用

- 如果您不想部署而是直接使用，我们提供SAAS监控云-[TanCloud探云](https://console.tancloud.cn)，即刻[登陆注册](https://console.tancloud.cn)免费使用。  
- 如果您是想将HertzBeat部署到内网环境搭建监控系统，请参考下面的部署文档进行操作。 

### 🐵 依赖服务部署   

> HertzBeat最少依赖于 关系型数据库[MYSQL8+](https://www.mysql.com/) 和 时序性数据库[TDengine2+](https://www.taosdata.com/getting-started)

##### 安装MYSQL  
1. docker安装MYSQl  
`docker run -d --name mysql -p 3306:3306 -e MYSQL_ROOT_PASSWORD=123456 mysql`   
2. 创建名称为hertzBeat的数据库  
3. 执行位于项目仓库script目录下的数据库脚本 schema.sql    

##### 安装TDengine   
1. docker安装TDengine   
`docker run -d -p 6030-6049:6030-6049 -p 6030-6049:6030-6049/udp --name tdengine tdengine/tdengine`     
2. 创建名称为hertzBeat的数据库

### 🍞 HertzBeat安装   
> HertzBeat支持通过源码安装启动，Docker容器运行和安装包方式安装部署。  

#### Docker方式快速安装
`docker run -d -p 1157:1157 --name hertzbeat tancloud/hertzbeat:latest`  
#### 通过安装包安装   
todo  

**HAVE FUN**
