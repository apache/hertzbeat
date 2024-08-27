---
id: victoria-metrics-init  
title: 依赖时序数据库服务VictoriaMetrics安装初始化        
sidebar_label: 指标数据存储VictoriaMetrics(推荐)
---

Apache HertzBeat (incubating) 的历史数据存储依赖时序数据库，任选其一安装初始化即可，也可不安装(注意⚠️但强烈建议生产环境配置)

> 我们推荐使用并长期支持 VictoriaMetrics 作为存储。

VictoriaMetrics，是一个快速高效、经济并且可扩展的监控解决方案和时序数据库，兼容 Prometheus 生态。推荐版本(VictoriaMetrics:v1.95.1+, HertzBeat:v1.4.3+)

**注意⚠️ 时序数据库安装配置为可选项，但强烈建议生产环境配置，以提供更完善的历史图表功能，高性能和稳定性**
**⚠️ 若不配置时序数据库，则只会留最近一小时历史数据**

> 如果您已有VictoriaMetrics环境，可直接跳到YML配置那一步。

### 通过Docker方式安装VictoriaMetrics  

1. 下载安装Docker环境
Docker 工具自身的下载请参考 [Docker官网文档](https://docs.docker.com/get-docker/)。
安装完毕后终端查看Docker版本是否正常输出。

   ```shell
   $ docker -v
   Docker version 20.10.12, build e91ed57
   ```

2. Docker安装VictoriaMetrics

   ```shell
   $ docker run -d -p 8428:8428 \
       -v $(pwd)/victoria-metrics-data:/victoria-metrics-data \
       --name victoria-metrics \
       victoriametrics/victoria-metrics:v1.95.1
   ```

   `-v $(pwd)/victoria-metrics-data:/victoria-metrics-data` 为VictoriaMetrics数据目录本地持久化挂载  
    使用```$ docker ps```查看数据库是否启动成功

3. 在hertzbeat的`application.yml`配置文件配置VictoriaMetrics数据库连接

   配置HertzBeat的配置文件  
   修改位于 `hertzbeat/config/application.yml` 的配置文件  
   注意⚠️docker容器方式需要将application.yml文件挂载到主机本地，安装包方式解压修改位于 `hertzbeat/config/application.yml` 即可

   **修改里面的`warehouse.store.jpa.enabled`参数为`false`， 配置`warehouse.store.victoria-metrics`数据源参数，HOST账户密码等，并启用`enabled`为`true`**

   ```yaml
   warehouse:
     store:
       # 关闭默认JPA
       jpa:
         enabled: false
       # 启用 victoria-metrics
       victoria-metrics:
          enabled: true
          url: http://localhost:8428
          username: root
          password: root
   ```

4. 重启 HertzBeat

### 常见问题

1. 时序数据库是否都需要配置，能不能都用

   > 不需要都配置，任选其一即可，用enable参数控制其是否使用，也可都不安装配置，但会影响历史图表数据和存储时长等。
