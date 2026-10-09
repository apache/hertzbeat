##  docker-compose部署 HertzBeat+Mysql+Tdengine 方案   

- 如果想自己本地快速部署的话，可以参考下面进行操作。

> docker-compose 部署方案使用了 Mysql + Tdengine 作为 HertzBeat 依赖存储服务。   
> 此方案会启动三个容器服务 Mysql, Tdengine, HertzBeat   

##### 安装Docker & Docker-compose

1. 下载安装 docker 环境 & docker-compose 环境
   请参考 [Docker官网文档](https://docs.docker.com/get-docker/), [Compose安装](https://docs.docker.com/compose/install/)       
   ```
   $ docker -v
   Docker version 20.10.12, build e91ed57
   ```

##### docker compose部署hertzbeat及其依赖服务     

1. 下载hertzbeat-docker-compose安装部署脚本文件  
   脚本文件位于代码仓库下`script/docker-compose/hertzbeat-mysql-tdengine` 链接 [script/docker-compose](https://github.com/apache/hertzbeat/tree/master/script/docker-compose/hertzbeat-mysql-tdengine)   

2. 可选：向 `ext-lib` 添加外部 JDBC 驱动 jar
   MySQL 兼容监控现在可以直接使用内置查询引擎，所以 `mysql-connector-j` 不是必需项。
   如果你希望 HertzBeat 在重启后优先走 JDBC，可以把 `mysql-connector-j` 放到 `ext-lib`。
   Oracle、DB2 这类场景仍然需要把外部 JDBC 驱动放到 `ext-lib`。

3. 进入部署脚本 docker-compose 目录, 执行  

   `docker compose up -d`

4. 进入tdengine创建hertzbeat数据库     

   ```bash
   $ docker exec -it tdengine /bin/bash
   root@tdengine-server:~/TDengine-server-2.4.0.4#
   ```

   创建名称为hertzbeat的数据库 进入容器后，执行 taos shell 客户端程序。
   
   ```bash
   root@tdengine-server:~/TDengine-server-2.4.0.4# taos
   Welcome to the TDengine shell from Linux, Client Version: 2.4.0.4
   Copyright (c) 2020 by TAOS Data, Inc. All rights reserved.
   taos>
   ```

   执行创建数据库命令
   
   `taos> show databases;`
   
   `taos> CREATE DATABASE hertzbeat KEEP 90 DURATION 10 BUFFER 16;`

##### 重启应用  

`docker-compose restart hertzbeat`

##### 开始探索HertzBeat   

浏览器访问 `localhost:1157` 即可开始，默认账号密码 `admin/hertzbeat`  

---

怎么样是不是很简单，只要几分钟就可以部署完成，赶紧试试吧！
