---
id: mysql-init  
title: 依赖服务MYSQL安装初始化        
sidebar_label: MYSQL安装初始化    
---
MYSQL是一款值得信赖的关系型数据库，HertzBeat使用其存储监控信息，告警信息，配置信息等结构化关系数据。  

安装部署视频教程: [HertzBeat安装部署-BiliBili](https://www.bilibili.com/video/BV1GY41177YL)  

> 如果您已有MYSQL环境，可直接跳到SQL脚本执行那一步。  

### 通过Docker方式安装MYSQL   
1. 下载安装Docker环境   
   Docker 工具自身的下载请参考 [Docker官网文档](https://docs.docker.com/get-docker/)。
   安装完毕后终端查看Docker版本是否正常输出。  
   ```
   $ docker -v
   Docker version 20.10.12, build e91ed57
   ```
2. Docker安装MYSQl  
   ```
   $ docker run -d --name mysql -p 3306:3306 -v /opt/data:/var/lib/mysql -e MYSQL_ROOT_PASSWORD=123456 mysql:5.7
   526aa188da767ae94b244226a2b2eec2b5f17dd8eff594533d9ec0cd0f3a1ccd
   ```
   `-v /opt/data:/var/lib/mysql` 为mysql数据目录本地持久化挂载，需将`/opt/data`替换为实际本地存在的目录           
   使用```$ docker ps```查看数据库是否启动成功

### SQL脚本执行   
1. 进入MYSQL或使用客户端连接MYSQL服务   
   `mysql -uroot -p123456`  
2. 创建名称为hertzbeat的数据库    
   `create database hertzbeat;`
3. 执行位于项目仓库/script/sql/目录下的数据库建表初始化脚本 [schema.sql](https://gitee.com/dromara/hertzbeat/raw/master/script/sql/schema.sql)  
   `mysql -uroot -p123456 < schema.sql`   
4. 查看hertzbeat数据库是否成功建表

