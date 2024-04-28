---
id: greptime-init  
title: 依赖时序数据库服务GreptimeDB安装初始化        
sidebar_label: 使用GreptimeDB存储指标数据(可选)    
---

Apache HertzBeat(Incubating) 的历史数据存储依赖时序数据库，任选其一安装初始化即可，也可不安装(注意⚠️但强烈建议生产环境配置)

> 我们推荐使用并长期支持 VictoriaMetrics 作为存储。

GreptimeDB is an open-source time-series database with a special focus on scalability, analytical capabilities and efficiency.   
It's designed to work on infrastructure of the cloud era, and users benefit from its elasticity and commodity storage.

**⚠️ 若不配置时序数据库，则只会留最近一小时历史数据**  

### 通过Docker方式安装GreptimeDB 
> 可参考官方网站[安装教程](https://docs.greptime.com/getting-started/overview)  
1. 下载安装Docker环境   
   Docker 工具自身的下载请参考 [Docker官网文档](https://docs.docker.com/get-docker/)。
      安装完毕后终端查看Docker版本是否正常输出。
   ```
   $ docker -v
   Docker version 20.10.12, build e91ed57
   ```
2. Docker安装GreptimeDB  

```shell
$ docker run -p 4000-4004:4000-4004 \
    -p 4242:4242 -v /opt/greptimedb:/tmp/greptimedb \
    --name greptime \
    greptime/greptimedb standalone start \
    --http-addr 0.0.0.0:4000 \
    --rpc-addr 0.0.0.0:4001 
```

   `-v /opt/greptimedb:/tmp/greptimedb` 为greptimedb数据目录本地持久化挂载，需将`/opt/greptimedb`替换为实际本地存在的目录
   使用```$ docker ps```查看数据库是否启动成功

### 在hertzbeat的`application.yml`配置文件配置此数据库连接   

1. 配置HertzBeat的配置文件
   修改位于 `hertzbeat/config/application.yml` 的配置文件 [/script/application.yml](https://github.com/apache/hertzbeat/raw/master/script/application.yml)      
   注意⚠️docker容器方式需要将application.yml文件挂载到主机本地,安装包方式解压修改位于 `hertzbeat/config/application.yml` 即可     

**修改里面的`warehouse.store.jpa.enabled`参数为`false`， 配置里面的`warehouse.store.greptime`数据源参数，URL账户密码，并启用`enabled`为`true`**    

```yaml
warehouse:
   store:
      # 关闭默认JPA
      jpa:
         enabled: false
      greptime:
         enabled: true
         endpoint: localhost:4001
```

2. 重启 HertzBeat

### 常见问题   

1. 时序数据库 GreptimeDB 或者 IoTDB 或者 TDengine 是否都需要配置，能不能都用
> 不需要都配置，任选其一即可，用enable参数控制其是否使用，也可都不安装配置，只影响历史图表数据。

