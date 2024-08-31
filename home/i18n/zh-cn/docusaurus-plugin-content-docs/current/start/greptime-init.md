---
id: greptime-init  
title: 依赖时序数据库服务 GreptimeDB 安装初始化（可选）
sidebar_label: 指标数据存储 GreptimeDB
---

Apache HertzBeat (incubating) 的历史数据存储依赖时序数据库，任选其一安装初始化即可，也可不安装(注意⚠️但强烈建议生产环境配置)

> 我们推荐使用并长期支持 VictoriaMetrics 作为存储。

[GreptimeDB](https://github.com/GreptimeTeam/greptimedb) is an open-source time-series database with a special focus on scalability, analytical capabilities and efficiency.
It's designed to work on infrastructure of the cloud era, and users benefit from its elasticity and commodity storage.

**⚠️ 若不配置时序数据库，则只会留最近一小时历史数据**

### 通过Docker方式安装GreptimeDB

1. 下载安装Docker环境
Docker 工具自身的下载请参考 [Docker官网文档](https://docs.docker.com/get-docker/)。
安装完毕后终端查看Docker版本是否正常输出。

   ```shell
   $ docker -v
   Docker version 20.10.12, build e91ed57
   ```

2. Docker安装GreptimeDB

   ```shell
   $ docker run -p 127.0.0.1:4000-4003:4000-4003 \
     -v "$(pwd)/greptimedb:/tmp/greptimedb" \
     --name greptime --rm \
     greptime/greptimedb:latest standalone start \
     --http-addr 0.0.0.0:4000 \
     --rpc-addr 0.0.0.0:4001 \
     --mysql-addr 0.0.0.0:4002 \
     --postgres-addr 0.0.0.0:4003
   ```

   `-v "$(pwd)/greptimedb:/tmp/greptimedb` 为 greptimedb 数据目录本地持久化挂载，需将 `$(pwd)/greptimedb` 替换为实际本地存在的目录，默认使用执行命令的当前目录下的 `greptimedb` 目录作为数据目录。

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
            grpc-endpoints: localhost:4001
            url: jdbc:mysql://localhost:4002/hertzbeat?connectionTimeZone=Asia/Shanghai&forceConnectionTimeZoneToSession=true
            driver-class-name: com.mysql.cj.jdbc.Driver
            username: greptime
            password: greptime
            expire-time: 30d
   ```

   默认数据库是 URL 中配置的  `hertzbeat` ，将自动创建。 `expire-time` 是自动创建的数据库的 TTL （数据过期）时间，默认为 30 天。

2. 重启 HertzBeat

### 常见问题

1. 时序数据库 GreptimeDB 或者 IoTDB 或者 TDengine 是否都需要配置，能不能都用

   > 不需要都配置，任选其一即可，用enable参数控制其是否使用，也可都不安装配置，只影响历史图表数据。
