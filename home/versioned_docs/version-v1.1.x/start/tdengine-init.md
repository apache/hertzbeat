---
id: tdengine-init  
title: 依赖时序数据库服务TDengine安装初始化        
sidebar_label: 使用TDengine存储指标数据(可选)    
---

HertzBeat的历史数据存储依赖时序数据库 TDengine 或 IoTDB，任选其一安装初始化即可，也可不安装(注意⚠️但强烈建议生产环境配置)

TDengine是一款开源物联网时序型数据库，我们用其存储采集到的监控指标历史数据。 注意支持⚠️ 2.4.x版本。   

**注意⚠️ 时序数据库安装配置为可选项，但强烈建议生产环境配置，以提供更完善的历史图表功能和高性能**

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

**修改里面的`warehouse.store.jpa.enabled`参数为`false`， 配置里面的`warehouse.store.td-engine`数据源参数，URL账户密码，并启用`enabled`为`true`**    

```yaml
warehouse:
   store:
      # 关闭默认JPA
      jpa:
         enabled: false
      td-engine:
         enabled: true
         driver-class-name: com.taosdata.jdbc.rs.RestfulDriver
         url: jdbc:TAOS-RS://localhost:6041/hertzbeat
         username: root
         password: taosdata
```

### 常见问题   

1. 时序数据库IoTDB和TDengine是否都需要配置，能不能都用
> 不需要都配置，任选其一即可，用enable参数控制其是否使用，也可都不安装配置，只影响历史图表数据。

2. 监控页面历史图表不显示，弹出 [无法提供历史图表数据，请配置依赖时序数据库] 
> 如弹窗所示，历史图表展示的前提是需要安装配置hertzbeat的依赖服务 - IotDB数据库或TDengine数据库

3. 监控详情历史图片不展示或无数据，已经配置了TDengine   
> 请确认是否安装的TDengine版本为2.4.0.12附近，版本3.0和2.2不支持兼容

4. 安装配置了TDengine数据库，但页面依旧显示弹出 [无法提供历史图表数据，请配置依赖时序数据库]
> 请检查配置参数是否正确  
> td-engine enable是否设置为true  
> 注意⚠️若hertzbeat和TDengine都为docker容器在同一主机下启动，容器之间默认不能用127.0.0.1通讯，改为主机IP  
> 可根据logs目录下启动日志排查  
