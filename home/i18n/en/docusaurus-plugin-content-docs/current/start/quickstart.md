---
id: quickstart  
title: Quick Start    
sidebar_label: Quick Start    
---

### 🐕 Quick Start

- If you don’t want to deploy but use it directly, we provide [SAAS Monitoring Cloud-TanCloud](https://console.tancloud.cn), **[Log In And Register For Free](https://console.tancloud.cn) **.
- If you want to deploy HertzBeat local, please refer to the following [Deployment Documentation](https://hertzbeat.com/docs/start/quickstart) for operation.

### 🐵 Dependency Service Deployment   

> HertzBeat depends at least on relational database [MYSQL5+](https://www.mysql.com/) and time series database [TDengine2+](https://www.taosdata.com/getting-started)


##### Install MYSQL
1. Install mysql with docker    
   `docker run -d --name mysql -p 3306:3306 -e MYSQL_ROOT_PASSWORD=123456 mysql:5.7`
2. Create database names `hertzbeat`
3. Run the database sql script [schema.sql](https://gitee.com/dromara/hertzbeat/raw/master/script/sql/schema.sql) located in the project repository `/script/sql/` directory.

For detailed steps, refer to [MYSQL Installation And Initialization](https://hertzbeat.com/docs/start/mysql-init)

##### Install TDengine
1. Install TDengine with docker     
   `docker run -d -p 6030-6049:6030-6049 -p 6030-6049:6030-6049/udp --name tdengine tdengine/tdengine:2.4.0.12`
2. Create database names `hertzbeat`

For detailed steps, refer to [TDengine Installation And Initialization](https://hertzbeat.com/docs/start/tdengine-init).

### 🍞 Install HertzBeat

> HertzBeat supports installation through source code, docker or package.

##### 1：Install quickly via docker
`docker run -d -p 1157:1157 -v /opt/application.yml:/opt/hertzbeat/config/application.yml --name hertzbeat tancloud/hertzbeat:[版本tag]`

Detailed steps refer to [Install HertzBeat via Docker](https://hertzbeat.com/docs/start/docker-deploy)

##### 2：Install via package
1. Download the installation package [GITEE Release](https://gitee.com/dromara/hertzbeat/releases) [GITHUB Release](https://github.com/dromara/hertzbeat/releases)
2. Configure the HertzBeat configuration yml file `hertzbeat/config/application.yml`
3. Run shell `$ ./startup.sh `
4. Access `localhost:1157` to start, default account: `admin/admin`

Detailed steps refer to [Install HertzBeat via package](https://hertzbeat.com/docs/start/package-deploy)

##### 3：Start via source code
1. Local source code debugging needs to start the back-end project manager and the front-end project web-app.
2. Backend：need `maven3+`, `java8+`, start the manager service.
3. Web：need `nodejs npm angular-cli` environment, Run `ng serve --open` in `web-app` directory after backend startup.
4. Access `localhost:4200` to start, default account: `admin/admin`

Detailed steps refer to [CONTRIBUTING](../others/contributing)

##### 4：Install All(mysql+tdengine+hertzbeat) via Docker-compose

Install and deploy the mysql database, tdengine database and hertzbeat at one time through [docker-compose deployment script](https://github.com/dromara/hertzbeat/tree/master/script/docker-compose).

Detailed steps refer to [docker-compose install](https://github.com/dromara/hertzbeat/tree/master/script/docker-compose)  

**HAVE FUN**
