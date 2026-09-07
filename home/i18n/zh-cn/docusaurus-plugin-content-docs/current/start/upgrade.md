---
id: upgrade  
title: HertzBeat 新版本更新指引
sidebar_label: 版本更新指引
---

**Apache HertzBeat™ 的发布版本列表**

- [下载页面](https://hertzbeat.apache.org/docs/download)
- [Github Release](https://github.com/apache/hertzbeat/releases)
- [DockerHub Release](https://hub.docker.com/r/apache/hertzbeat/tags)

HertzBeat 的元数据信息保存在 H2 或 Mysql, PostgreSQL 关系型数据库内, 采集指标数据存储在 TDengine, IotDB 等时序数据库内。

**升级前您需要保存备份好数据库的数据文件和监控模板文件**

## 1.9.0 不兼容变更

### SFTP监控必须显式配置主机密钥策略

1.9.0不再默认接受任意SFTP服务器密钥。每个SFTP监控必须配置一个或多个可信的
`SHA256:...`主机密钥指纹，或者由操作员显式选择危险的临时跳过验证选项。

这是一个失败关闭的不兼容变更。HertzBeat不会为1.8.x监控、导入配置或通过API/SQL
直接创建的记录自动启用跳过验证。升级前或升级后应立即编辑每个SFTP监控：

1. 获取服务器密钥，并通过可信渠道核对指纹；
2. 将核对后的指纹添加到“SFTP主机密钥指纹”；
3. 仅把跳过验证选项用于短期故障恢复。

完成上述任一策略配置前，受影响的SFTP监控会报告配置失败且不会建立连接。普通FTP
监控不受影响。指纹获取与密钥轮换方法请参阅[FTP监控](../help/ftp)。

### 可观测（OTLP / 日志 / 链路）接口路径变更

1.9.0 将 1.8.x 的日志模块合并为 `hertzbeat-observability`，指标、日志、链路统一使用 `/api/otlp/v1/{signal}` 接收、`/api/observability/**` 查询。1.8.x 只有日志一路信号有接口，因此下表列出的都是**日志接口**的迁移；所有按 1.8.x 路径配置的 OpenTelemetry Collector、Vector、SDK exporter、脚本或看板都需要更新。

| 1.8.x 路径 | 1.9.0 路径 | 1.9.x 状态 |
|---|---|---|
| `POST /api/logs/otlp/v1/logs` | `POST /api/otlp/v1/logs` | **保留为 deprecated 别名**，仍可用，响应带 `Deprecation: true`；2.0 移除 |
| `POST /api/logs/ingest/otlp` | `POST /api/otlp/v1/logs` | **保留为 deprecated 别名**，仍可用，响应带 `Deprecation: true`；2.0 移除 |
| `POST /api/logs/ingest/{其他协议}` | — | 已移除（`400`），历史上只有 `otlp` 有适配器 |
| `GET /api/logs/list` | `GET /api/observability/logs` | 已移除（`404`） |
| `GET /api/logs/stats/overview` | `GET /api/observability/logs/overview` | 已移除（`404`） |
| `GET /api/logs/stats/trace-coverage` | `GET /api/observability/logs/trace-coverage` | 已移除（`404`） |
| `GET /api/logs/stats/trend` | `GET /api/observability/logs/trend` | 已移除（`404`） |
| `GET /api/logs/sse/subscribe` | `GET /api/observability/logs/stream` | 已移除（`404`）；新路径需要 `admin/user/guest` 登录，不再匿名放行 |
| `DELETE /api/logs` | `DELETE /api/observability/logs` | 已移除（`404`） |

`POST /api/otlp/v1/{metrics,traces}` 接收接口、`/api/observability/metrics/**` 与 `/api/observability/traces/**` 查询接口是 1.9.0 **新增**的，1.8.x 没有对应路径，不涉及迁移。

建议的升级步骤：

- 升级前在 collector / exporter 配置中搜索 `/api/logs/`，改为 `/api/otlp/v1/logs`。OTLP HTTP exporter 会把 `404` 视为永久错误并静默丢弃该批数据，路径过期的表现只是"日志突然没了"。
- 如果无法在同一维护窗口内改完 exporter，上表两条接收别名在 1.9.x 仍然可用；请关注 HertzBeat 日志中的 `Deprecated OTLP log route ... was called` 告警并在 2.0 之前完成迁移。
- 如果使用了自定义 `sureness.yml`，请补充 `/api/otlp/v1/**===post===[admin,user]` 与 `/api/observability/**===get===[admin,user,guest]`（参考安装包内的 `sureness.yml`）；旧的 `/api/logs/**` 规则在 exporter 迁移完成后即可删除。

### 新增 OTLP/gRPC 监听端口 14317

当 `warehouse.store.greptime.enabled=true` 时，1.9.0 会额外启动一个 OTLP/gRPC 监听器，绑定 `0.0.0.0:14317`，供 exporter 通过 gRPC 推送指标、日志与链路。官方 Dockerfile 会暴露该容器端口；仓库内的五个 Docker Compose 快速启动方案将其发布为宿主机端口 `14317`，并默认绑定到 `127.0.0.1`。

- **这里没有使用 OpenTelemetry 标准的 4317。** 同机的 OTel Collector、Jaeger 或 Tempo 通常已经占着 4317，而已发布端口一旦冲突，`docker compose up` 会直接失败。HertzBeat 的 OTLP/HTTP 同样走自有端口，因此 14317 与产品其余部分是一致的。
- 存量部署升级后会多出一个监听端口。如果你的防火墙或安全策略按端口清单管理，请把 14317 加进去。
- 1.9.0 的所有 Docker Compose 快速启动方案现在默认把全部已发布端口绑定到 `127.0.0.1`，包括 `1157`、`1158`、`14317` 以及开发用的数据库/时序库端口。在旧的 Compose 检出目录上升级后，本机访问不受影响，但远程浏览器、Collector、OTLP 和数据库访问会被有意关闭，直到显式配置为止。
- 如需接入远程 Collector，请把所选方案目录下的 `.env.example` 复制为 `.env`，将 `HERTZBEAT_BIND_ADDRESS` 设置为 Manager 的可达地址，并只允许 Collector 来源网络访问 `1158`。该变量同时控制 `1157`；远程访问 Web/API 时建议使用 TLS 反向代理。仅在有可信 OTLP 发送方时单独设置 `HERTZBEAT_OTLP_BIND_ADDRESS`。在使用通配地址前，请先替换默认凭证并配置防火墙或安全组限制。重启前执行 `docker compose config`，逐项检查最终的宿主机端口绑定。
- 端口绑定失败**不会**导致 HertzBeat 启动失败：失败会被记录到日志，进程在没有 gRPC 接收能力的情况下继续启动，`/api/otlp/v1` 上的 OTLP/HTTP 不受影响。
- 如需把监听器改到 4317 或关闭它，可在 `application.yml` 中配置，或使用对应的环境变量，并同步修改 docker-compose 的端口映射：

  ```yaml
  hertzbeat:
    otlp:
      grpc:
        enabled: ${HERTZBEAT_OTLP_GRPC_ENABLED:true}
        host: ${HERTZBEAT_OTLP_GRPC_HOST:0.0.0.0}
        port: ${HERTZBEAT_OTLP_GRPC_PORT:14317}
  ```

- 使用 Helm 部署时请注意：Chart 维护在 `apache/hertzbeat-helm-chart` 仓库，依赖 gRPC 接入前请先确认其发布版本已暴露 14317。

### GreptimeDB 信号表改名

当 `warehouse.store.greptime.enabled=true` 时，GreptimeDB 里同时存着两类遥测数据：**你**通过 OTLP 推送的日志，以及 HertzBeat 通过 OpenTelemetry 写入的**自身**运行日志与链路。1.9.0 给自监控表加上了 `hzb_internal_` 前缀，与产品表区分开：

| 数据 | 1.8.x 表名 | 1.9.0 表名 |
|---|---|---|
| 产品 OTLP 日志（日志页面、日志告警、SQL 编辑器） | `hertzbeat_logs` | `hertzbeat_logs`（表名不变，但 `body` 列类型变了，见下节） |
| HertzBeat 自身日志（自监控） | `hzb_logs` | `hzb_internal_logs` |
| HertzBeat 自身链路（自监控） | `hzb_traces` | `hzb_internal_traces` |
| 产品 OTLP 链路（链路页面、链路查询） | 1.8.x 无此功能 | `hertzbeat_traces`（新增） |

- **1.8.x 没有产品链路能力**：没有链路接收接口、没有链路查询接口、也没有链路页面，`hzb_traces` 里只有 HertzBeat 自身的 span。链路是 1.9.0 新增的功能，不存在需要迁移的历史业务链路数据。
- 不做自动迁移。旧的 `hzb_logs` / `hzb_traces` 表会原样保留但不再写入新数据。在 1.9.0 建好新表后，可以把自监控历史数据迁过去：

  ```sql
  INSERT INTO hzb_internal_logs SELECT * FROM hzb_logs;
  INSERT INTO hzb_internal_traces SELECT * FROM hzb_traces;
  ```

  如果不需要这些自监控历史数据，待保留期过后直接 `DROP` 旧表即可。
- 如果有看板或临时 SQL 直接查询 `hzb_logs` / `hzb_traces`，请改为新表名。

### 产品日志表 hertzbeat_logs 的 body 列类型变更

`hertzbeat_logs` 表名虽然没变，但 1.8.x 把 `body` 列建为 `JSON`，1.9.0 改为 `STRING`。1.9.0 的建表语句是 `CREATE TABLE IF NOT EXISTS`，对 1.8.x 已经建出来的旧表是空操作，**因此直接启动后所有新写入的日志都会被 GreptimeDB 拒绝**：exporter 侧仍然收到 200，服务端只有一行 `[warehouse greptime-log] Write failed` 警告，页面上表现为"日志不再更新"，日志告警随之失效。

必须在升级前重命名旧表、启动 1.9.0 建出新表后再回灌历史数据，**不要**直接 `ALTER TABLE ... MODIFY COLUMN`。完整步骤见 [1.9.0 升级指南](1.9.0-update)。

## Docker部署方式的升级

1. 若使用了自定义监控模板
   - 需要备份 `docker cp hertzbeat:/opt/hertzbeat/define ./define` 当前运行 docker 容器里面的 `/opt/hertzbeat/define` 目录到当前主机下
   - `docker cp hertzbeat:/opt/hertzbeat/define ./define`
   - 然后在后续升级启动 docker 容器的时候需要挂载上这个 define 目录，`-v $(pwd)/define:/opt/hertzbeat/define`
   - `-v $(pwd)/define:/opt/hertzbeat/define`
2. 若使用内置默认 H2 数据库
   - 需挂载或备份 `-v $(pwd)/data:/opt/hertzbeat/data` 容器内的数据库文件目录 `/opt/hertzbeat/data`
   - 停止并删除容器，删除本地 HertzBeat docker 镜像，拉取新版本镜像
   - 参考 [Docker安装HertzBeat](docker-deploy) 使用新镜像创建新的容器，注意需要将数据库文件目录挂载 `-v $(pwd)/data:/opt/hertzbeat/data`
3. 若使用外置关系型数据库 Mysql, PostgreSQL
   - 无需挂载备份容器内的数据库文件目录
   - 停止并删除容器，删除本地 HertzBeat docker 镜像，拉取新版本镜像
   - 参考 [Docker安装HertzBeat](docker-deploy) 使用新镜像创建新的容器，`application.yml`配置数据库连接即可

### 安装包部署方式的升级

1. 若使用内置默认 H2 数据库
   - 备份安装包下的数据库文件目录 `/opt/hertzbeat/data`
   - 若有自定义监控模板，需备份 `/opt/hertzbeat/define` 下的模板YML
   - `bin/shutdown.sh` 停止 HertzBeat 进程，下载新安装包
   - 参考 [安装包安装HertzBeat](package-deploy) 使用新安装包启动
2. 若使用外置关系型数据库 Mysql, PostgreSQL
   - 无需备份安装包下的数据库文件目录
   - 若有自定义监控模板，需备份 `/opt/hertzbeat/define` 下的模板YML
   - `bin/shutdown.sh` 停止 HertzBeat 进程，下载新安装包
   - 参考 [安装包安装HertzBeat](package-deploy) 使用新安装包启动，`application.yml`配置数据库连接即可

## 升级后的 AI 计划任务归属

没有记录创建者的 AI 会话会被隔离，不出现在任何用户的会话列表里。AI SOP 计划任务
归属于其目标会话的创建者。升级过程中，没有记录创建者的计划任务会被禁用；没有目标
会话、或创建者与会话创建者不一致的计划任务，会在执行前被禁用。记录仍然保留在数据
库里，管理员核实归属后可以恢复。

无归属的计划任务由数据库迁移脚本禁用。会话缺失和创建者不匹配这两种情况，
则在每次后台执行前重新检查并禁用。

重新启用一个历史计划任务之前：

1. 备份元数据库；
2. 核实 `hzb_ai_conversation` 中目标行的归属；
3. 在会话和计划任务的 `creator` 列中写入同一个已核实的主体；
4. 只启用已经复核过的那一条计划任务。

不要把所有历史记录都指派给同一个共享账号。计划任务只有在其存储的创建者仍然拥有目标
会话时才会执行，归属不匹配的会被自动禁用。

**HAVE FUN**
