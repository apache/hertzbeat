---
id: mysql-change  
title: Use MYSQL Replace H2 Database to Store Metadata(Optional)     
sidebar_label: Use MYSQL Instead of H2    
---
MYSQL is a reliable relational database. In addition to default built-in H2 database, Apache HertzBeat(Incubating) allow you to use MYSQL to store structured relational data such as monitoring information, alarm information and configuration information.   

> If you have the MYSQL environment, can be directly to database creation step.  

### Install MYSQL via Docker   
1. Download and install the Docker environment   
   Docker tools download refer to [Docker official document](https://docs.docker.com/get-docker/)。
   After the installation you can check if the Docker version normally output at the terminal.  
   ```
   $ docker -v
   Docker version 20.10.12, build e91ed57
   ```
2. Install MYSQl with Docker 
   ```
   $ docker run -d --name mysql -p 3306:3306 -v /opt/data:/var/lib/mysql -e MYSQL_ROOT_PASSWORD=123456 mysql:5.7
   ```
   `-v /opt/data:/var/lib/mysql` is local persistent mount of mysql data directory. `/opt/data` should be replaced with the actual local directory.          
   use ```$ docker ps``` to check if the database started successfully

### Database creation   
1. Enter MYSQL or use the client to connect MYSQL service   
   `mysql -uroot -p123456`  
2. Create database named hertzbeat    
   `create database hertzbeat default charset utf8mb4 collate utf8mb4_general_ci;`
3. Check if hertzbeat database has been successfully created
   `show databases;`

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
   Specific replacement parameters are as follows and you need to configure account according to the mysql environment:   
```yaml
spring:
  datasource:
    driver-class-name: com.mysql.cj.jdbc.Driver
    username: root
    password: 123456
    url: jdbc:mysql://localhost:3306/hertzbeat?useUnicode=true&characterEncoding=utf-8&useSSL=false
```

**Start HertzBeat  visit http://ip:1157/ on the browser  You can use HertzBeat monitoring alarm, default account and password are admin/hertzbeat**  
