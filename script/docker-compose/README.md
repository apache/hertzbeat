##  docker-compose部署方案   

- 如果不想部署而是直接使用，我们提供SAAS监控云-[TanCloud探云](https://console.tancloud.cn)，即刻 **[登录注册](https://console.tancloud.cn)** 免费使用。
- 如果想自己本地快速部署的话，可以参考下面进行操作。

##### 安装Docker & Docker-compose

1. 下载安装 docker 环境 & docker-compose 环境
   请参考 [Docker官网文档](https://docs.docker.com/get-docker/), [Compose安装](https://docs.docker.com/compose/install/)       
   ```
   $ docker -v
   Docker version 20.10.12, build e91ed57
   ```

##### docker compose部署heartbeat及其依赖服务     

1. 下载hertzbeat-docker-compose安装部署脚本文件  
   脚本文件位于代码仓库下`script/docker-compose` 链接 [script/docker-compose](https://gitee.com/dromara/hertzbeat/tree/master/script/docker-compose)   


2. 进入部署脚本 docker-compose 目录, 执行  

   `docker-compose up -d`

3. 进入tdengine创建hertzbeat数据库     

   `$ docker exec -it tdengine /bin/bash
   root@tdengine-server:~/TDengine-server-2.4.0.4#`

   创建名称为hertzbeat的数据库 进入容器后，执行 taos shell 客户端程序。

   `root@tdengine-server:~/TDengine-server-2.4.0.4# taos
   Welcome to the TDengine shell from Linux, Client Version:2.4.0.4
   Copyright (c) 2020 by TAOS Data, Inc. All rights reserved.
   taos>`

   执行创建数据库命令

   `taos> show databases;`

   `taos> CREATE DATABASE hertzbeat KEEP 90 DAYS 10 BLOCKS 6 UPDATE 1;`

##### 重启应用  

`docker-compose restart hertzbeat`

##### 开始探索HertzBeat  
   浏览器访问 http://ip:1157/console 开始使用HertzBeat进行监控告警。

---   

怎么样是不是很简单，只要几分钟就可以部署完成，赶紧试试吧！