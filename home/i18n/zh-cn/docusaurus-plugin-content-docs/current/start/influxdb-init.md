---
id: influxdb-init  
title: 依赖时序数据库服务InfluxDB安装初始化(可选)        
sidebar_label: 指标数据存储InfluxDB
---

Apache HertzBeat (incubating) 的历史数据存储依赖时序数据库，任选其一安装初始化即可，也可不安装(注意⚠️但强烈建议生产环境配置)

> 我们推荐使用并长期支持 VictoriaMetrics 作为存储。

InfluxDB是一个由InfluxData开发的开源时序型数据库，专注于海量时序数据的高性能读、高性能写、高效存储与实时分析等。 注意支持⚠️ 1.x版本。

**注意⚠️ 时序数据库安装配置为可选项，但强烈建议生产环境配置，以提供更完善的历史图表功能，高性能和稳定性**
**⚠️ 若不配置时序数据库，则只会留最近一小时历史数据**

### 1. 直接使用华为云服务 GaussDB For Influx

> 开通使用[华为云云数据库 GaussDB For Influx](https://www.huaweicloud.com/intl/zh-cn/product/gaussdb.html)
>
> 获取云数据库对外暴露连接地址，账户密码即可

⚠️注意云数据库默认开启了SSL，云数据库地址应使用 `https:`

### 2. 通过Docker方式安装InfluxDB

1. 下载安装Docker环境
Docker 工具自身的下载请参考 [Docker官网文档](https://docs.docker.com/get-docker/)。
安装完毕后终端查看Docker版本是否正常输出。

   ```shell
   $ docker -v
    Docker version 20.10.12, build e91ed57
   ```

2. Docker安装InfluxDB 1.x

   ```shell
   $ docker run -p 8086:8086 \
         -v /opt/influxdb:/var/lib/influxdb \
         influxdb:1.8
   ```

   `-v /opt/influxdb:/var/lib/influxdb` 为influxdb数据目录本地持久化挂载，需将`/opt/influxdb`替换为实际本地存在的目录  
   使用```$ docker ps```查看数据库是否启动成功

### 在hertzbeat的`application.yml`配置文件配置此数据库连接

1. 配置HertzBeat的配置文件
   修改位于 `hertzbeat/config/application.yml` 的配置文件
   注意⚠️docker容器方式需要将application.yml文件挂载到主机本地,安装包方式解压修改位于 `hertzbeat/config/application.yml` 即可

   **修改里面的`warehouse.store.jpa.enabled`参数为`false`， 配置里面的`warehouse.store.influxdb`数据源参数，URL账户密码，并启用`enabled`为`true`**

   ```yaml
   warehouse:
      store:
         # 关闭默认JPA
         jpa:
            enabled: false
         influxdb:
            enabled: true
            server-url: http://localhost:8086
            username: root
            password: root
            expire-time: '30d'
            replication: 1
   ```

2. 重启 HertzBeat

### 常见问题

1. 时序数据库InfluxDb, IoTDB和TDengine是否都需要配置，能不能都用

   > 不需要都配置，任选其一即可，用enable参数控制其是否使用，也可都不安装配置，只影响历史图表数据。
