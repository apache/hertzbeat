---
id: postgresql-change  
title: Use PostgreSQL Replace H2 Database to Store Metadata(Recommended)     
sidebar_label: Meta Store PostgreSQL (Recommended)
---

PostgreSQL is a RDBMS emphasizing extensibility and SQL compliance. In addition to default built-in H2 database, Apache HertzBeat (incubating) allow you to use PostgreSQL to store structured relational data such as monitoring information, alarm information and configuration information.

> If you have the PostgreSQL environment, can be directly to database creation step.

### Install PostgreSQL via Docker

1. Download and install the Docker environment
   Docker tools download refer to [Docker official document](https://docs.docker.com/get-docker/)。
   After the installation you can check if the Docker version normally output at the terminal.

   ```shell
   $ docker -v
   Docker version 20.10.12, build e91ed57
   ```

2. Install PostgreSQL with Docker

   ```shell
   docker run -d --name postgresql -p 5432:5432 -e POSTGRES_USER=root -e POSTGRES_PASSWORD=123456 -e TZ=Asia/Shanghai postgres:15       
   ```

   use```$ docker ps```to check if the database started successfully

### Database creation

1. Enter postgreSQL or use the client to connect postgreSQL service

   ```shell
   su - postgres
   psql
   ```

2. Create database named hertzbeat

   ```sql
   CREATE DATABASE hertzbeat;
   ```

3. Check if hertzbeat database has been successfully created

   ```sql
   SELECT * FROM pg_database where datname='hertzbeat';
   ```

### Modify hertzbeat's configuration file application.yml and switch data source

1. Configure HertzBeat's configuration file
   Modify `hertzbeat/config/application.yml` configuration file
   Note⚠️The docker container way need to mount application.yml file locally, while you can use installation package way to unzip and modify `hertzbeat/config/application.yml`  
   Replace `spring.database` data source parameters, URL account and password.

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

Specific replacement parameters are as follows and you need to configure account, ip, port according to the postgresql environment:

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

> Note: The above applies to the method of downloading and installing the package. For local data source switching, simply complete the [Database creation](./postgresql-change#database-creation) and modify the configuration in `hertzbeat-manager/src/main/resources/application.yml`.

**Start HertzBeat  visit <http://ip:1157/> on the browser  You can use HertzBeat monitoring alarm, default account and password are admin/hertzbeat**
