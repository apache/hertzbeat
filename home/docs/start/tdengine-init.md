---
id: tdengine-init  
title: 依赖服务TDengine安装初始化        
sidebar_label: TDengine安装初始化    
---
TDengine是一款国产的开源物联网时序型数据库，我们使用其替换了InfluxDb，来存储采集到的监控指标数据。

安装部署视频教程: [HertzBeat安装部署-BiliBili](https://www.bilibili.com/video/BV1GY41177YL)  

> 如果您已有TDengine环境，可直接跳到创建数据库实例那一步。


### 通过Docker方式安装TDengine 
> 可参考官方网站[安装教程](https://www.taosdata.com/docs/cn/v2.0/getting-started/docker)  
1. 下载安装Docker环境   
   Docker 工具自身的下载请参考 [Docker官网文档](https://docs.docker.com/get-docker/)。
   安装完毕后终端查看Docker版本是否正常输出。
   ```
   $ docker -v
   Docker version 20.10.12, build e91ed57
   ```
2. Docker安装TDengine
   ```
   $ docker run -d -p 6030-6049:6030-6049 -p 6030-6049:6030-6049/udp -v /opt/taosdata:/var/lib/taos --name tdengine -e TZ=Asia/Shanghai tdengine/tdengine:2.4.0.12
   526aa188da767ae94b244226a2b2eec2b5f17dd8eff594533d9ec0cd0f3a1ccd
   ```
   `-v /opt/taosdata:/var/lib/taos` 为tdengine数据目录本地持久化挂载，需将`/opt/taosdata`替换为实际本地存在的目录  
   `-e TZ="Asia/Shanghai"` 为tdengine设置时区，这里可选设置对应的时区   
   使用```$ docker ps```查看数据库是否启动成功

### 创建数据库实例    
1. 进入数据库Docker容器  
   ```
   $ docker exec -it tdengine /bin/bash
   root@tdengine-server:~/TDengine-server-2.4.0.4#
   ```
2. 创建名称为hertzbeat的数据库
   进入容器后，执行 taos shell 客户端程序。
   ```
   root@tdengine-server:~/TDengine-server-2.4.0.4# taos
   Welcome to the TDengine shell from Linux, Client Version:2.4.0.4
   Copyright (c) 2020 by TAOS Data, Inc. All rights reserved.
   taos>
   ```
   执行创建数据库命令
   ```
   taos> show databases;
   taos> CREATE DATABASE hertzbeat KEEP 90 DAYS 10 BLOCKS 6 UPDATE 1;
   ```
   上述语句将创建一个名为 hertzbeat 的库，这个库的数据将保留90天（超过90天将被自动删除），每 10 天一个数据文件，内存块数为 6，允许更新数据
3. 查看hertzbeat数据库是否成功创建
   ```
   taos> show databases;
   taos> use hertzbeat;
   ```

**注意⚠️若是安装包安装的TDengine2.3+版本**       
> 除了启动server外，还需执行 `systemctl start taosadapter` 启动 adapter
