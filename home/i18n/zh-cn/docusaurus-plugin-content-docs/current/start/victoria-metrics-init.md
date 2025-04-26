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

### 使用 VictoriaMetrics 集群模式（Cluster Mode）

VictoriaMetrics 支持 **集群模式**，将数据写入（`vminsert`）、存储（`vmstorage`）与查询（`vmselect`）分别由独立组件负责。以下是如何部署 VictoriaMetrics 集群并集成至 HertzBeat 的说明。

#### 1. 使用 Docker Compose 部署 VictoriaMetrics 集群

创建一个名为 `docker-compose.yml` 的文件，内容如下：

```yaml
version: "3"

services:
  vmstorage1:
    image: victoriametrics/vmstorage
    command:
      - "-retentionPeriod=1"
      - "-storageDataPath=/storage"
    volumes:
      - vmstorage-data:/storage
    ports:
      - "8400:8400"  # 提供给 vminsert 写入连接
      - "8401:8401"  # 提供给 vmselect 查询连接

  vminsert:
    image: victoriametrics/vminsert
    command:
      - "-storageNode=vmstorage1:8400"
      - "-httpAuth.username=root"
      - "-httpAuth.password=root"
    ports:
      - "8480:8480"  # 数据写入端口

  vmselect:
    image: victoriametrics/vmselect
    command:
      - "-storageNode=vmstorage1:8401"
      - "-httpAuth.username=root"
      - "-httpAuth.password=root"
    ports:
      - "8481:8481"  # 查询接口端口

volumes:
  vmstorage-data:
```

使用以下命令启动集群：

```shell
docker-compose up -d
```

使用以下命令确认所有组件是否运行成功：

```shell
docker ps
```

#### 2. 配置 HertzBeat 使用集群模式

修改 `hertzbeat/config/application.yml` 配置文件，内容如下：

```yaml
warehouse:
  store:
    jpa:
      enabled: false
    victoria-metrics:
      cluster:
        enabled: true
        select:
          url: http://127.0.0.1:8481
          username: root
          password: root
        insert:
          url: http://127.0.0.1:8480
          username: root
          password: root
```

**注意事项：**

- `cluster.enabled` 设置为 `true` 表示启用集群模式；
- `select.url` 和 `insert.url` 需与部署时的地址保持一致，确保网络互通。

#### 3. 重启 HertzBeat

完成配置后，重启 HertzBeat 以连接至 VictoriaMetrics 集群。

### 常见问题

1. 时序数据库是否都需要配置，能不能都用

   > 不需要都配置，任选其一即可，用enable参数控制其是否使用，也可都不安装配置，但会影响历史图表数据和存储时长等。
