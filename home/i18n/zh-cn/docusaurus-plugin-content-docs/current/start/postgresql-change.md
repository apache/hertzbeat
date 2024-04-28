---
id: postgresql-change
title: 关系型数据库使用 PostgreSQL 替换依赖的 H2 存储系统元数据
sidebar_label: 元数据使用PostgreSQL存储(可选)
---
PostgreSQL是一个功能强大，开源的关系型数据库管理系统（RDBMS）。Apache HertzBeat(Incubating) 除了支持使用默认内置的H2数据库外，还可以切换为使用PostgreSQL存储监控信息，告警信息，配置信息等结构化关系数据。  

注意⚠️ 使用外置PostgreSQL数据库替换内置H2数据库为可选项，但建议生产环境配置，以提供更好的性能

> 如果您已有PostgreSQL环境，可直接跳到数据库创建那一步。  


### 通过Docker方式安装PostgreSQL    

1. Download and install the Docker environment   
   Docker tools download refer to [Docker official document](https://docs.docker.com/get-docker/)。
   After the installation you can check if the Docker version normally output at the terminal.
   ```
   $ docker -v
   Docker version 20.10.12, build e91ed57
   ```
   
2. Docker安装 PostgreSQL
   ```
   $ docker run -d --name postgresql -p 5432:5432 -e POSTGRES_USER=root -e POSTGRES_PASSWORD=123456 -e TZ=Asia/Shanghai postgresql:15       
   ```
   使用```$ docker ps```查看数据库是否启动成功

3. Create database in container manually or with [script](https://github.com/apache/hertzbeat/tree/master/script/docker-compose/hertzbeat-postgresql-iotdb/conf/sql/schema.sql).

### 数据库创建  

1. 进入 PostgreSQL 或使用客户端连接 PostgreSQL 服务 
   ```
   su - postgres
   psql
   ```
   
2. 创建名称为hertzbeat的数据库    
   `CREATE DATABASE hertzbeat;`

3. 查看hertzbeat数据库是否创建成功  
   `\l`

### 修改hertzbeat的配置文件application.yml切换数据源

1. 配置HertzBeat的配置文件
   修改位于 `hertzbeat/config/application.yml` 的配置文件   
   注意⚠️docker容器方式需要将application.yml文件挂载到主机本地,安装包方式解压修改位于 `hertzbeat/config/application.yml` 即可
   替换里面的`spring.database`数据源参数，IP端口账户密码驱动   
   ⚠️注意`application.yml`文件内容需完整，除下方修改内容外其他参数需保留，完整内容见[/script/application.yml](https://gitee.com/hertzbeat/hertzbeat/raw/master/script/application.yml)

```yaml
spring:
  datasource:
    driver-class-name: org.h2.Driver
    username: sa
    password: 123456
    url: jdbc:h2:./data/hertzbeat;MODE=MYSQL
```
具体替换参数如下,需根据 PostgreSQL 环境配置账户密码IP:
```yaml
spring:
   config:
      activate:
         on-profile: prod
   datasource:
      driver-class-name: org.postgresql.Driver
      username: root
      password: 123456
      url: jdbc:postgresql://127.0.0.1:5432/hertzbeat
      hikari:
         max-lifetime: 120000

   jpa:
      database: postgresql
      hibernate:
         ddl-auto: update
      properties:
         hibernate:
            dialect: org.hibernate.dialect.PostgreSQLDialect
```

**启动 HertzBeat 浏览器访问 http://ip:1157/ 开始使用HertzBeat进行监控告警，默认账户密码 admin/hertzbeat**  
