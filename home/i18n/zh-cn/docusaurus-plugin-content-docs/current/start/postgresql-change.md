---
id: postgresql-change
title: 关系型数据库使用 PostgreSQL 替换依赖的 H2 存储系统元数据(推荐)
sidebar_label: 元数据存储PostgreSQL(推荐)
---

PostgreSQL 是一个功能强大，开源的关系型数据库管理系统（RDBMS）。Apache HertzBeat (incubating) 除了支持使用默认内置的 H2 数据库外，还可以切换为使用 PostgreSQL 存储监控信息，告警信息，配置信息等结构化关系数据。

注意⚠️ 使用外置 PostgreSQL 数据库替换内置 H2 数据库为可选项，但建议生产环境配置，以提供更好的性能

> 如果您已有 PostgreSQL 环境，可直接跳到数据库创建那一步。

### 通过 Docker 方式安装 PostgreSQL

1. 下载安装 Docker 环境
   Docker 的安装请参考 [Docker官网文档](https://docs.docker.com/get-docker/)。安装完毕后请于终端检查 Docker 版本输出是否正常。

   ```shell
   $ docker -v
   Docker version 20.10.12, build e91ed57
   ```

2. Docker 安装 PostgreSQL

   ```shell
   docker run -d --name postgresql -p 5432:5432 -e POSTGRES_USER=root -e POSTGRES_PASSWORD=123456 -e TZ=Asia/Shanghai postgres:15       
   ```

   使用 ```$ docker ps``` 查看数据库是否启动成功

### 数据库创建

1. 进入 PostgreSQL 或使用客户端连接 PostgreSQL 服务

   ```shell
   su - postgres
   psql
   ```

2. 创建名称为 hertzbeat 的数据库

   ```sql
   CREATE DATABASE hertzbeat;
   ```

3. 查看 hertzbeat 数据库是否创建成功

   ```sql
   SELECT * FROM pg_database where datname='hertzbeat';
   ```

### 修改 hertzbeat 的配置文件 application.yml 切换数据源

1. 配置 HertzBeat 的配置文件
   修改位于 `hertzbeat/config/application.yml` 的配置文件
   注意⚠️ docker 容器方式需要将 application.yml 文件挂载到主机本地,安装包方式解压修改位于 `hertzbeat/config/application.yml` 即可
   替换里面的 `spring.database` 数据源参数，IP 端口账户密码驱动
   ⚠️注意 `application.yml` 文件内容需完整，除下方修改内容外其他参数需保留，完整内容见[/script/application.yml](https://github.com/hertzbeat/hertzbeat/raw/master/script/application.yml)

```yaml
spring:
  datasource:
    driver-class-name: org.h2.Driver
    username: sa
    password: 123456
    url: jdbc:h2:./data/hertzbeat;MODE=MYSQL
    hikari:
      max-lifetime: 120000

  jpa:
    show-sql: false
    database-platform: org.eclipse.persistence.platform.database.MySQLPlatform
    database: h2
    properties:
      eclipselink:
        logging:
          level: SEVERE
```

具体替换参数如下,需根据 PostgreSQL 环境配置账户密码 IP:

```yaml
spring:
  datasource:
    driver-class-name: org.postgresql.Driver
    username: root
    password: 123456
    url: jdbc:postgresql://postgresql:5432/hertzbeat
    hikari:
      max-lifetime: 120000
  jpa:
    show-sql: false
    database-platform: org.eclipse.persistence.platform.database.PostgreSQLPlatform
    database: postgresql
    properties:
      eclipselink:
        logging:
          level: SEVERE
```

> 注意：上述是针对下载安装包的方式，对于本地切换数据源，只需完成[数据库创建](./postgresql-change#数据库创建)以及修改`hertzbeat-manager/src/main/resources/application.yml`中的配置即可。

**启动 HertzBeat 浏览器访问 <http://ip:1157/> 开始使用HertzBeat进行监控告警，默认账户密码 admin/hertzbeat**
