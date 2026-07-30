##  docker-compose部署 HertzBeat+Postgresql+Greptime 方案   

- 如果想自己本地快速部署的话，可以参考下面进行操作。

> docker-compose 部署方案使用了 PostgreSQL + GreptimeDB 作为 HertzBeat 依赖存储服务。   
> 此方案会启动三个容器服务 PostgreSQL, GreptimeDB, HertzBeat   

##### 安装Docker & Docker-compose

1. 下载安装 docker 环境 & docker-compose 环境
   请参考 [Docker官网文档](https://docs.docker.com/get-docker/), [Compose安装](https://docs.docker.com/compose/install/)       
   ```
   $ docker -v
   Docker version 20.10.12, build e91ed57
   ```

##### docker compose部署hertzbeat及其依赖服务     

1. 下载hertzbeat-docker-compose安装部署脚本文件  
   脚本文件位于代码仓库下`script/docker-compose/hertzbeat-postgresql-greptimedb` 链接 [script/docker-compose](https://github.com/apache/hertzbeat/tree/master/script/docker-compose/hertzbeat-postgresql-greptimedb)   


2. 可选：向 `ext-lib` 添加外部 JDBC 驱动 jar
   MySQL 兼容监控现在可以直接使用内置查询引擎，所以 `mysql-connector-j` 不是必需项。
   如果你希望 HertzBeat 在重启后优先走 JDBC，可以把 `mysql-connector-j` 放到 `ext-lib`。
   Oracle、DB2 这类场景仍然需要把外部 JDBC 驱动放到 `ext-lib`。

3. 进入部署脚本 Docker Compose 目录，执行

   `docker compose up -d`

##### 监听地址与远程 Collector

快速启动方案默认将所有宿主机端口绑定到 `127.0.0.1`：

- `1157` 是 HertzBeat Web UI 和 API 端口。
- `1158` 是 Manager 与 Collector 的通信端口。
- `15432`、`14000`–`14003` 是 PostgreSQL 和 GreptimeDB 的开发调试端口。
  容器之间通过内部 `hertzbeat` 网络访问，所以这些端口始终只监听本机。

普通本地使用不需要修改配置。如果其他主机上的 Collector 需要连接 Manager，
请将 `.env.example` 复制为 `.env`，并把 `HERTZBEAT_BIND_ADDRESS` 修改为
Collector 可以访问的 Manager 地址：

```shell
cp .env.example .env
# 修改 HERTZBEAT_BIND_ADDRESS，然后检查最终端口映射。
docker compose config
```

只允许 Collector 所在的来源网络访问 `1158`。如需远程访问 Web/API，建议通过
TLS 反向代理开放 `1157`。如果必须设置为 `0.0.0.0`，请先替换所有内置/默认凭证，
通过防火墙或安全组限制来源并配置 TLS。`HERTZBEAT_BIND_ADDRESS` 不会开放
PostgreSQL 或 GreptimeDB 端口。

远程 Collector 应配置 Manager 的可达地址和 `1158` 端口；除非 Manager 与
Collector 位于同一主机，否则不能使用 `127.0.0.1`。

##### 开始探索HertzBeat   

浏览器访问 `localhost:1157` 即可开始，默认账号密码 `admin/hertzbeat`  

---   

怎么样是不是很简单，只要几分钟就可以部署完成，赶紧试试吧！
