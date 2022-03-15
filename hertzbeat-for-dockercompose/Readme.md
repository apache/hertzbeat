##  docker-compose部署方案

- 如果您不想部署而是直接使用，我们提供SAAS监控云-[TanCloud探云](https://console.tancloud.cn)，即刻 **[登录注册](https://console.tancloud.cn)** 免费使用。
- 如果你想自己本地快速部署的话，可以参考下面进行操作。

### 

##### 安装Docker&Docker-compose

1. docker &docker-compos 安装自行百度，如果这也不会，那这个部署方式可能不适合您。

##### 下载并解压部署包-hertzbeat-for-dockercompose

1.进入 hertzbeat-for-dockercompose目录

   `docker-compose up -d`

2.创建tdengine数据库

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


---
怎么样是不是很简单，只要几分钟就可以部署完成，赶紧试试吧！