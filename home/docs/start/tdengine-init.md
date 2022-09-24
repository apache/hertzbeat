---
id: tdengine-init  
title: 依赖服务TDengine安装初始化        
sidebar_label: TDengine初始化(可选)    
---
TDengine是一款开源物联网时序型数据库，我们用其存储采集到的监控指标历史数据。 注意⚠️ 2.4.x版本。   
注意⚠️ TDengine为可选项，未配置则无历史图表数据。

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

```shell
$ docker run -d -p 6030-6049:6030-6049 -p 6030-6049:6030-6049/udp \
    -v /opt/taosdata:/var/lib/taos \ 
    --name tdengine -e TZ=Asia/Shanghai \
    tdengine/tdengine:2.4.0.12
```

   `-v /opt/taosdata:/var/lib/taos` 为tdengine数据目录本地持久化挂载，需将`/opt/taosdata`替换为实际本地存在的目录  
   `-e TZ="Asia/Shanghai"` 为tdengine设置时区，这里可选设置对应的时区   
   使用```$ docker ps```查看数据库是否启动成功

### 创建数据库实例    

>  [TDengine CLI 小技巧](https://docs.taosdata.com/2.4/reference/taos-shell/#tdengine-cli-%E5%B0%8F%E6%8A%80%E5%B7%A7)

1. 进入数据库Docker容器  
   ```
   $ docker exec -it tdengine /bin/bash
   ```

2. 修改账户密码

   > 我们强烈建议您修改密码。TDengine默认的账户密码是 root/taosdata
   > 进入容器后，执行 `taos` 命令进入TDengine CLI , 如下: 

   ```
   root@tdengine-server:~/TDengine-server-2.4.0.4# taos
   Welcome to the TDengine shell from Linux, Client Version:2.4.0.4
   Copyright (c) 2020 by TAOS Data, Inc. All rights reserved.
   taos>
   ```
   > 在 TDengine CLI 中使用 alter user 命令可以修改用户密码，缺省密码为 taosdata

3. 创建名称为hertzbeat的数据库

   执行创建数据库命令

   ```
   taos> show databases;
   taos> CREATE DATABASE hertzbeat KEEP 90 DAYS 10 BLOCKS 6 UPDATE 1;
   ```

   上述语句将创建一个名为 hertzbeat 的库，这个库的数据将保留90天（超过90天将被自动删除），每 10 天一个数据文件，内存块数为 6，允许更新数据

4. 查看hertzbeat数据库是否成功创建

   ```
   taos> show databases;
   taos> use hertzbeat;
   ```

5. 退出TDengine CLI

   ```
   输入 q 或 quit 或 exit 回车
   ```

**注意⚠️若是安装包安装的TDengine2.3+版本**       

> 除了启动server外，还需执行 `systemctl start taosadapter` 启动 adapter

### 在hertzbeat的`application.yml`配置文件配置此数据库连接   

1. 配置HertzBeat的配置文件
   修改位于 `hertzbeat/config/application.yml` 的配置文件   
   注意⚠️docker容器方式需要将application.yml文件挂载到主机本地,安装包方式解压修改位于 `hertzbeat/config/application.yml` 即可     
   替换里面的`warehouse.store.td-engine`数据源参数，URL账户密码    

```
   warehouse.store.td-engine.enable
   warehouse.store.td-engine.url
   warehouse.store.td-engine.username
   warehouse.store.td-engine.password
```

### 常见问题   

1. 监控页面历史图表不显示，弹出 [无法提供历史图表数据，请配置依赖服务TDengine时序数据库]
> 如弹窗所示，历史图表展示的前提是需要安装配置hertzbeat的依赖服务 - TDengine数据库

2. 监控详情历史图片不展示或无数据，已经配置了TDengine   
> 请确认是否安装的TDengine版本为2.4.0.12附近，版本3.0和2.2不支持兼容