---
id: iotdb-init  
title: 依赖时序数据库服务IoTDB安装初始化        
sidebar_label: 使用IoTDB存储指标数据(可选)    
---

Apache HertzBeat(Incubating) 的历史数据存储依赖时序数据库，任选其一安装初始化即可，也可不安装(注意⚠️但强烈建议生产环境配置)

> 我们推荐使用并长期支持 VictoriaMetrics 作为存储。

Apache IoTDB是一体化收集、存储、管理与分析物联网时序数据的软件系统，我们使用其存储分析采集到的监控指标历史数据。支持V0.12 - V0.13版本，推荐使用V0.13.*版本。

**注意⚠️ 时序数据库安装配置为可选项，但强烈建议生产环境配置，以提供更完善的历史图表功能，高性能和稳定性**   
**⚠️ 若不配置时序数据库，则只会留最近一小时历史数据**  

> 如果您已有IoTDB环境，可直接跳到YML配置那一步。


### 通过Docker方式安装IoTDB 
> 可参考官方网站[安装教程](https://iotdb.apache.org/zh/UserGuide/V0.13.x/QuickStart/WayToGetIoTDB.html)  
1. 下载安装Docker环境   
   Docker 工具自身的下载请参考 [Docker官网文档](https://docs.docker.com/get-docker/)。
      安装完毕后终端查看Docker版本是否正常输出。
   ```
   $ docker -v
   Docker version 20.10.12, build e91ed57
   ```
2. Docker安装IoTDB  

```shell
$ docker run -d -p 6667:6667 -p 31999:31999 -p 8181:8181 \
    -v /opt/iotdb/data:/iotdb/data \ 
    --name iotdb \
    apache/iotdb:1.2.2-standalone
```

   `-v /opt/iotdb/data:/iotdb/data` 为IoTDB数据目录本地持久化挂载，需将`/iotdb/data`替换为实际本地存在的目录
   使用```$ docker ps```查看数据库是否启动成功

3. 在hertzbeat的`application.yml`配置文件配置IoTDB数据库连接   

   配置HertzBeat的配置文件    
   修改位于 `hertzbeat/config/application.yml` 的配置文件   
   注意⚠️docker容器方式需要将application.yml文件挂载到主机本地，安装包方式解压修改位于 `hertzbeat/config/application.yml` 即可     

**修改里面的`warehouse.store.jpa.enabled`参数为`false`， 配置`warehouse.store.iot-db`数据源参数，HOST账户密码等，并启用`enabled`为`true`**    

```yaml
warehouse:
  store:
    # 关闭默认JPA
    jpa:
      enabled: false
    # 启用IotDB
    iot-db:
      enabled: true
      host: 127.0.0.1
      rpc-port: 6667
      username: root
      password: root
      # V_0_13 || V_1_0
      version: V_1_0
      # if iotdb version >= 0.13 use default queryTimeoutInMs = -1; else use default queryTimeoutInMs = 0
      query-timeout-in-ms: -1
      # 数据存储时间：默认'7776000000'（90天,单位为毫秒,-1代表永不过期）
      expire-time: '7776000000'
```

4. 重启 HertzBeat

### 常见问题   

1. 时序数据库IoTDB和TDengine是否都需要配置，能不能都用
> 不需要都配置，任选其一即可，用enable参数控制其是否使用，也可都不安装配置，只影响历史图表数据。

2. 监控页面历史图表不显示，弹出 [无法提供历史图表数据，请配置依赖时序数据库]
> 如弹窗所示，历史图表展示的前提是需要安装配置hertzbeat的依赖服务 - IotDB数据库或TDengine数据库

3. 安装配置了IotDB数据库，但页面依旧显示弹出 [无法提供历史图表数据，请配置依赖时序数据库] 
> 请检查配置参数是否正确
> iot-db enable是否设置为true
> 注意⚠️若hertzbeat和IotDB都为docker容器在同一主机下启动，容器之间默认不能用127.0.0.1通讯，改为主机IP
> 可根据logs目录下启动日志排查
