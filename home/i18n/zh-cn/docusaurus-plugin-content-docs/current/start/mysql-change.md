---
id: mysql-change  
title: 关系型数据库使用 Mysql 替换依赖的 H2 存储系统元数据(可选)            
sidebar_label: 元数据存储Mysql
---

MYSQL是一款值得信赖的关系型数据库，Apache HertzBeat (incubating) 除了支持使用默认内置的H2数据库外，还可以切换为使用MYSQL存储监控信息，告警信息，配置信息等结构化关系数据。

注意⚠️ 使用外置MySQL数据库替换内置H2数据库为可选项，但建议生产环境配置，以提供更好的性能

> 如果您已有MYSQL环境，并且MYSQL版本符合要求，可直接跳到数据库创建那一步。

### 支持的MYSQL版本

请确保使用支持的 MySQL 版本。HertzBeat 仅支持 MySQL 5.7+ 或 8 版本。你可以通过以下命令查看 MySQL 版本：

```shell
$ mysql --version
mysql  Ver 8.0.25 for Linux on x86_64 (MySQL Community Server - GPL)
```

### 通过Docker方式安装MYSQL

1. 下载安装Docker环境
   Docker 的安装请参考 [Docker官网文档](https://docs.docker.com/get-docker/)。
   安装完毕后请于终端检查Docker版本输出是否正常。

   ```shell
   $ docker -v
   Docker version 20.10.12, build e91ed57
   ```

2. Docker安装MYSQL

   ```shell
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

### 添加 MYSQL jdbc 驱动 jar

- 下载 MYSQL jdbc driver jar, 例如 mysql-connector-java-8.0.25.jar. <https://dev.mysql.com/get/Downloads/Connector-J/mysql-connector-java-8.0.25.zip>
- 将此 jar 包拷贝放入 HertzBeat 的安装目录下的 `ext-lib` 目录下.

### 修改hertzbeat的配置文件application.yml切换数据源

- 配置 HertzBeat 的配置文件  
  修改位于 `hertzbeat/config/application.yml` 的配置文件
  注意⚠️docker容器方式需要将application.yml文件挂载到主机本地,安装包方式解压修改位于 `hertzbeat/config/application.yml` 即可
  替换里面的`spring.database`数据源参数，IP端口账户密码驱动
  ⚠️注意`application.yml`文件内容需完整，除下方修改内容外其他参数需保留，完整内容见[/script/application.yml](https://github.com/hertzbeat/hertzbeat/raw/master/script/application.yml)
  
  需修改部分原参数:

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

具体替换参数如下,需根据mysql环境配置账户密码IP:

```yaml
spring:
  datasource:
    driver-class-name: com.mysql.cj.jdbc.Driver
    username: root
    password: 123456
    url: jdbc:mysql://mysql:3306/hertzbeat?useUnicode=true&characterEncoding=utf-8&allowPublicKeyRetrieval=true&useSSL=false
    hikari:
      max-lifetime: 120000
  jpa:
    show-sql: false
    database-platform: org.eclipse.persistence.platform.database.MySQLPlatform
    database: mysql
    properties:
      eclipselink:
        logging:
          level: SEVERE
```

- 通过docker启动时，建议修改host为宿主机的外网IP地址，包括mysql连接字符串。

> 注意：上述是针对下载安装包的方式，对于本地切换数据源，只需完成[数据库创建](./mysql-change#数据库创建)以及修改`hertzbeat-manager/src/main/resources/application.yml`中的配置即可。

**启动 HertzBeat 浏览器访问 <http://ip:1157/> 开始使用HertzBeat进行监控告警，默认账户密码 admin/hertzbeat**
