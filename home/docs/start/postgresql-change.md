---
id: postgresql-change  
title: Use PostgreSQL Replace H2 Database to Store Metadata(Optional)     
sidebar_label: Use PostgreSQL Instead of H2
---
PostgreSQL is a RDBMS emphasizing extensibility and SQL compliance. In addition to default built-in H2 database, Apache HertzBeat(Incubating) allow you to use PostgreSQL to store structured relational data such as monitoring information, alarm information and configuration information.

> If you have the PostgreSQL environment, can be directly to database creation step.

### Install PostgreSQL via Docker
1. Download and install the Docker environment   
   Docker tools download refer to [Docker official document](https://docs.docker.com/get-docker/)。
   After the installation you can check if the Docker version normally output at the terminal.
   ```
   $ docker -v
   Docker version 20.10.12, build e91ed57
   ```
2. Install PostgreSQL with Docker
   ```
   $ docker run -d --name postgresql -p 5432:5432 -e POSTGRES_USER=root -e POSTGRES_PASSWORD=123456 -e TZ=Asia/Shanghai postgresql:15       
   ```
   use```$ docker ps```to check if the database started successfully
3. Create database in container manually or with [script](https://github.com/apache/hertzbeat/tree/master/script/docker-compose/hertzbeat-postgresql-iotdb/conf/sql/schema.sql).

### Database creation
1. Enter postgreSQL or use the client to connect postgreSQL service   
   ```
   su - postgres
   psql
   ```
2. Create database named hertzbeat    
   `CREATE DATABASE hertzbeat;`
3. Check if hertzbeat database has been successfully created  
   `\l`

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
```
Specific replacement parameters are as follows and you need to configure account, ip, port according to the postgresql environment:
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

**Start HertzBeat  visit http://ip:1157/ on the browser  You can use HertzBeat monitoring alarm, default account and password are admin/hertzbeat**  
