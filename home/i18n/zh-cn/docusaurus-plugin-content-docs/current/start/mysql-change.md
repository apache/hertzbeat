---
id: mysql-change  
title: 关系型数据库使用 Mysql 替换依赖的 H2 存储系统元数据            
sidebar_label: 元数据使用Mysql存储(可选)      
---
MYSQL是一款值得信赖的关系型数据库，Apache HertzBeat(Incubating) 除了支持使用默认内置的H2数据库外，还可以切换为使用MYSQL存储监控信息，告警信息，配置信息等结构化关系数据。  

注意⚠️ 使用外置Mysql数据库替换内置H2数据库为可选项，但建议生产环境配置，以提供更好的性能

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
   $ docker run -d --name mysql \
   -p 3306:3306 \
   -v /opt/data:/var/lib/mysql \
   -e MYSQL_ROOT_PASSWORD=123456 \
   --restart=always \
   mysql:5.7
   ```
   `-v /opt/data:/var/lib/mysql` 为mysql数据目录本地持久化挂载，需将`/opt/data`替换为实际本地存在的目录           
   使用```$ docker ps```查看数据库是否启动成功

### 数据库创建   
1. 进入MYSQL或使用客户端连接MYSQL服务   
   `mysql -uroot -p123456`  
2. 创建名称为hertzbeat的数据库    
   `create database hertzbeat default charset utf8mb4 collate utf8mb4_general_ci;`
3. 查看hertzbeat数据库是否创建成功
   `show databases;`

### 修改hertzbeat的配置文件application.yml切换数据源   

1. 配置HertzBeat的配置文件
   修改位于 `hertzbeat/config/application.yml` 的配置文件   
   注意⚠️docker容器方式需要将application.yml文件挂载到主机本地,安装包方式解压修改位于 `hertzbeat/config/application.yml` 即可
   替换里面的`spring.database`数据源参数，IP端口账户密码驱动   
   ⚠️注意`application.yml`文件内容需完整，除下方修改内容外其他参数需保留，完整内容见[/script/application.yml](https://gitee.com/hertzbeat/hertzbeat/raw/master/script/application.yml)  
   
需修改部分原参数: 
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
    url: jdbc:mysql://localhost:3306/hertzbeat?useUnicode=true&characterEncoding=utf-8&useSSL=false
```

2. 通过docker启动时，需要修改host为宿主机的外网Ip，包括mysql连接字符串和redis。


**启动 HertzBeat 浏览器访问 http://ip:1157/ 开始使用HertzBeat进行监控告警，默认账户密码 admin/hertzbeat**  

### 常见问题   

1. 缺少hibernate的mysql方言，导致启动异常 Caused by: org.hibernate.HibernateException: Access to DialectResolutionInfo cannot be null when 'hibernate.dialect' not set

如果上述配置启动系统，出现` Caused by: org.hibernate.HibernateException: Access to DialectResolutionInfo cannot be null when 'hibernate.dialect' not set`异常，   
需要在`application.yml`文件中增加以下配置：

```yaml
spring:
  jpa:
    hibernate:
      ddl-auto: update 
    properties:
      hibernate:
        dialect: org.hibernate.dialect.MySQL5InnoDBDialect
```
