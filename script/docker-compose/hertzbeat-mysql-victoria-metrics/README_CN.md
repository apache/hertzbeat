##  docker-compose部署 HertzBeat+Mysql+VictoriaMetrics 方案   

- 如果想自己本地快速部署的话，可以参考下面进行操作。

> docker-compose 部署方案使用了 Mysql + VictoriaMetrics 作为 HertzBeat 依赖存储服务。   
> 此方案会启动三个容器服务 Mysql, VictoriaMetrics, HertzBeat   

##### 安装Docker & Docker-compose

1. 下载安装 docker 环境 & docker-compose 环境
   请参考 [Docker官网文档](https://docs.docker.com/get-docker/), [Compose安装](https://docs.docker.com/compose/install/)       
   ```
   $ docker -v
   Docker version 20.10.12, build e91ed57
   ```

##### docker compose部署hertzbeat及其依赖服务     

1. 下载hertzbeat-docker-compose安装部署脚本文件  
   脚本文件位于代码仓库下`script/docker-compose/hertzbeat-mysql-victoria-metrics` 链接 [script/docker-compose](https://github.com/apache/hertzbeat/tree/master/script/docker-compose/hertzbeat-mysql-victoria-metrics)   

2. 可选：向 `ext-lib` 添加外部 JDBC 驱动 jar
   MySQL 兼容监控现在可以直接使用内置查询引擎，所以 `mysql-connector-j` 不是必需项。
   如果你希望 HertzBeat 在重启后优先走 JDBC，可以把 `mysql-connector-j` 放到 `ext-lib`。
   Oracle、DB2 这类场景仍然需要把外部 JDBC 驱动放到 `ext-lib`。

3. 创建两份相互独立且仅供本次安装使用的密钥。`COMMON_SECRET` 是 Manager
   与所有独立 Collector 必须完全相同的 32 字节 AES 密钥；
   `CLUSTER_AUTH_ACTIVE_SECRET` 是另一份消息认证密钥。升级时必须保留两者，
   并且不要将 `.env` 提交到版本库。

   ```shell
   umask 077
   printf 'COMMON_SECRET=%s\n' "$(openssl rand -hex 16)" > .env
   printf 'CLUSTER_AUTH_ACTIVE_SECRET=%s\n' "$(openssl rand -hex 32)" >> .env
   ```

4. 进入部署脚本 docker-compose 目录, 执行

   `docker compose up -d`

##### 开始探索HertzBeat   

浏览器访问 `localhost:1157` 即可开始，默认账号密码 `admin/hertzbeat`  

---

怎么样是不是很简单，只要几分钟就可以部署完成，赶紧试试吧！
