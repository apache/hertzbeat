---
id: docker-deploy  
title: 通过 Docker 方式安装 HertzBeat    
sidebar_label: Docker方式安装
---

:::tip
使用 Docker 方式一键启动 HertzBeat 最小可用环境，无外部服务依赖，方便快速体验。  
但不建议在生产环境中使用，生产环境建议使用 Docker Compose 方式部署, 安装包方式部署, Kubernetes 方式部署。
:::

:::note
需您的环境中已经拥有 Docker 环境，若未安装请参考 [Docker官网文档](https://docs.docker.com/get-docker/)
:::

### 部署 HertzBeat Server

1. 执行以下命令

   ```shell
   $ docker run -d -p 1157:1157 -p 1158:1158 \
       -v $(pwd)/data:/opt/hertzbeat/data \
       -v $(pwd)/logs:/opt/hertzbeat/logs \
       -v $(pwd)/application.yml:/opt/hertzbeat/config/application.yml \
       -v $(pwd)/sureness.yml:/opt/hertzbeat/config/sureness.yml \
       --restart=always \
       --name hertzbeat apache/hertzbeat
   ```

   > 命令参数详解

   - `docker run -d` : 通过 Docker 后台运行容器
   - `-p 1157:1157 -p 1158:1158`  : 映射容器端口到主机端口(前面是宿主机的端口号，后面是容器的端口号)。1157是页面端口，1158是集群端口。
   - `-v $(pwd)/data:/opt/hertzbeat/data` : (可选，数据持久化) 重要，挂载数据库文件到本地主机，保证数据不会因为容器的创建删除而丢失
   - `-v $(pwd)/logs:/opt/hertzbeat/logs` : (可选) 挂载日志文件到本地主机方便查看
   - `-v $(pwd)/application.yml:/opt/hertzbeat/config/application.yml`  : (可选) 挂载配置文件到容器中(请确保本地已有此文件)。[下载源](https://github.com/apache/hertzbeat/raw/master/script/application.yml)
   - `-v $(pwd)/sureness.yml:/opt/hertzbeat/config/sureness.yml`  : (可选) 挂载账户配置文件到容器中(请确保本地已有此文件)。[下载源](https://github.com/apache/hertzbeat/raw/master/script/sureness.yml)
   - `-v $(pwd)/ext-lib:/opt/hertzbeat/ext-lib`  : (可选) 挂载外部的第三方 JAR 包 [mysql-jdbc](https://dev.mysql.com/get/Downloads/Connector-J/mysql-connector-java-8.0.25.zip) [oracle-jdbc](https://repo1.maven.org/maven2/com/oracle/database/jdbc/ojdbc8/23.4.0.24.05/ojdbc8-23.4.0.24.05.jar) [oracle-i18n](https://repo.mavenlibs.com/maven/com/oracle/database/nls/orai18n/21.5.0.0/orai18n-21.5.0.0.jar)
   - `--name hertzbeat` : (可选) 命名容器名称为 hertzbeat
   - `--restart=always` : (可选) 配置容器自动重启。
   - `apache/hertzbeat` : 使用[官方应用镜像](https://hub.docker.com/r/apache/hertzbeat)来启动容器, 若网络超时可用`quay.io/tancloud/hertzbeat`代替。

   :::tip

   - 标记为可选的参数，非必填项，若不需要则删除。
   - 此将容器的 1157,1158 端口映射到宿主机的 1157,1158 端口上。若宿主机该端口已被占用，则需修改主机映射端口。
   - 挂载文件时，前面参数为你自定义本地文件地址，后面参数为容器内文件地址。挂载时请确保你本地已有此文件。
   - 可执行```docker update --restart=always hertzbeat```配置容器自动重启。

   :::

2. 开始探索 HertzBeat  
   浏览器访问 <http://ip:1157/> 即可开始探索使用HertzBeat，默认账户密码 admin/hertzbeat。

### 部署 HertzBeat Collector 集群(可选)

:::note
HertzBeat Collector 是一个轻量级的数据采集器，用于采集并将数据发送到 HertzBeat Server。  
通过部署多个 HertzBeat Collector 可以实现数据的高可用，负载均衡和云边协同。
:::

![HertzBeat](/img/docs/cluster-arch.png)

1. 执行以下命令

   ```shell
   $ docker run -d \
       -e IDENTITY=custom-collector-name \
       -e MODE=public \
       -e MANAGER_HOST=127.0.0.1 \
       -e MANAGER_PORT=1158 \
       --name hertzbeat-collector apache/hertzbeat-collector
   ```

   > 命令参数详解

   - `docker run -d` : 通过 Docker 后台运行容器
   - `-e IDENTITY=custom-collector-name`  : (可选) 设置采集器的唯一标识名称。注意多采集器时名称需保证唯一性。
   - `-e MODE=public` : 配置运行模式(public or private), 公共集群模式或私有云边模式。
   - `-e MANAGER_HOST=127.0.0.1` : 重要, 配置连接的 HertzBeat Server 地址，127.0.0.1 需替换为 HertzBeat Server 对外 IP 地址。
   - `-e MANAGER_PORT=1158` :  (可选) 配置连接的 HertzBeat Server 端口，默认 1158.
   - `-v $(pwd)/logs:/opt/hertzbeat-collector/logs` : (可选)挂载日志文件到本地主机方便查看
   - `--name hertzbeat-collector` : 命名容器名称为 hertzbeat-collector
   - `apache/hertzbeat-collector` : 使用[官方应用镜像](https://hub.docker.com/r/apache/hertzbeat-collector)来启动容器, 若网络超时可用`quay.io/tancloud/hertzbeat-collector`代替。

   :::tip

   - `MANAGER_HOST=127.0.0.1` 中的 `127.0.0.1` 需被替换为 HertzBeat Server 对外 IP 地址。
   - 标记为可选的参数，非必填项，若不需要则删除。
   - 挂载文件时，前面参数为你自定义本地文件地址，后面参数为容器内文件地址。挂载时请确保你本地已有此文件。
   - 可执行```docker update --restart=always hertzbeat-collector```配置容器自动重启。

   :::

2. 开始探索 HertzBeat Collector  
   浏览器访问 <http://ip:1157/> 即可开始探索使用，默认账户密码 admin/hertzbeat。

**HAVE FUN**

----

### Docker 方式部署常见问题

**最多的问题就是网络问题，请先提前排查**

1. MYSQL,TDENGINE或IotDB和HertzBeat都Docker部署在同一主机上，HertzBeat使用localhost或127.0.0.1连接数据库失败
   此问题本质为Docker容器访问宿主机端口连接失败，由于docker默认网络模式为Bridge模式，其通过localhost访问不到宿主机。

   > 解决办法一：配置application.yml将数据库的连接地址由localhost修改为宿主机的对外IP  
   > 解决办法二：使用Host网络模式启动Docker，即使Docker容器和宿主机共享网络 `docker run -d --network host .....`

2. 按照流程部署，访问 <http://ip:1157/> 无界面
   请参考下面几点排查问题：

   > 一：若切换了依赖服务MYSQL数据库，排查数据库是否成功创建，是否启动成功  
   > 二：HertzBeat的配置文件 `application.yml` 里面的依赖服务IP账户密码等配置是否正确  
   > 三：若都无问题可以 `docker logs hertzbeat` 查看容器日志是否有明显错误，提issue或交流群或社区反馈

3. 监控页面历史图表不显示，弹出 [无法提供历史图表数据，请配置依赖时序数据库]

   > 如弹窗所示，历史图表展示的前提是需要安装配置hertzbeat的依赖服务 -  
   > 安装初始化此时序数据库

4. 安装配置了时序数据库，但页面依旧显示弹出 [无法提供历史图表数据，请配置依赖时序数据库]

   > 请检查配置的时许数据库参数是否正确  
   > 时序数据库对应的 enable 是否设置为true  
   > 注意⚠️若hertzbeat和外置数据库都为docker容器在同一主机下启动，容器之间默认不能用127.0.0.1通讯，改为主机IP  
   > 可根据logs目录下启动日志排查

5. application.yml 是干什么用的

   > 此文件是HertzBeat的配置文件，用于配置HertzBeat的各种参数，如数据库连接信息，时序数据库配置等。

   下载 `application.yml` 文件到主机目录下，例如: $(pwd)/application.yml  
   下载源 [github/script/application.yml](https://github.com/apache/hertzbeat/raw/master/script/application.yml)

   - 若需使用邮件发送告警，需替换 `application.yml` 里面的邮件服务器参数
   - 若需使用外置Mysql数据库替换内置H2数据库，需替换`application.yml`里面的`spring.datasource`参数 具体步骤参见 [H2数据库切换为MYSQL](mysql-change)）
   - 若需使用时序数据库TDengine来存储指标数据，需替换`application.yml`里面的`warehouse.store.victoria-metrics`参数 具体步骤参见 [使用victoria-metrics存储指标数据](victoria-metrics-init)

6. sureness.yml 是干什么用的

   > 此文件是HertzBeat的用户配置文件，用于配置HertzBeat的用户信息，如账户密码等。

   HertzBeat默认内置三个用户账户,分别为 admin/hertzbeat tom/hertzbeat guest/hertzbeat  
   若需要新增删除修改账户或密码，可以通过配置 `sureness.yml` 实现，若无此需求可忽略此步骤  
   下载 `sureness.yml` 文件到主机目录下，例如: $(pwd)/sureness.yml  
   下载源 [github/script/sureness.yml](https://github.com/apache/hertzbeat/raw/master/script/sureness.yml)  
   具体修改步骤参考 [配置修改账户密码](account-modify)
