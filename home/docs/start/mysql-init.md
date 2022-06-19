---
id: mysql-init  
title: 依赖的关系型数据库H2切换为MYSQL           
sidebar_label: H2数据库切换为MYSQL    
---
MYSQL是一款值得信赖的关系型数据库，HertzBeat除了支持使用默认内置的H2数据库外，还可以使用MYSQL存储监控信息，告警信息，配置信息等结构化关系数据。  

> 如果您已有MYSQL环境，可直接跳到数据库创建那一步。  

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

### 数据库创建   
1. 进入MYSQL或使用客户端连接MYSQL服务   
   `mysql -uroot -p123456`  
2. 创建名称为hertzbeat的数据库    
   `create database hertzbeat;`
3. 查看hertzbeat数据库是否创建成功
   `show databases;`

### 修改hertzbeat的配置文件application.yml切换数据源   

1. 配置HertzBeat的配置文件
   修改位于 `hertzbeat/config/application.yml` 的配置文件
   注意⚠️docker容器方式需要将application.yml文件挂载到主机本地,安装包方式解压修改位于 `hertzbeat/config/application.yml` 即可  
   替换里面的`spring.database`数据源参数，IP端口账户密码驱动
   原参数: 
```yaml
spring:
  datasource:
    driver-class-name: org.h2.Driver
    username: sa
    password: 123456
    url: jdbc:h2:./data/hertzbeat;MODE=MYSQL
```
   具体替换参数如下,需根据mysql环境配置账户密码IP:   
```yaml
spring:
  datasource:
    driver-class-name: com.mysql.cj.jdbc.Driver
    username: root
    password: 123456
    url: jdbc:mysql://localhost:3306/hertzbeat2?useUnicode=true&characterEncoding=utf-8&useSSL=false
```

**启动 HertzBeat 浏览器访问 http://ip:1157/ 开始使用HertzBeat进行监控告警，默认账户密码 admin/hertzbeat**  
