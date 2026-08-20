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

### 可观测（OTLP / 日志 / 链路）接口路径变更

1.9.0 将 1.8.x 的日志模块合并为 `hertzbeat-observability`，指标、日志、链路统一使用 `/api/otlp/v1/{signal}` 接收、`/api/observability/**` 查询。所有按 1.8.x 路径配置的 OpenTelemetry Collector、Vector、SDK exporter、脚本或看板都需要更新。

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
| `GET /api/traces/**` | `GET /api/observability/traces/**` | 已移除（`404`） |
| `GET /api/ingestion/otlp/metrics/console` | `GET /api/observability/metrics/query` | 已移除（`404`） |
| `GET /api/ingestion/otlp/metrics/inventory` | `GET /api/observability/metrics/inventory` | 已移除（`404`） |

建议的升级步骤：

- 升级前在 collector / exporter 配置中搜索 `/api/logs/`，改为 `/api/otlp/v1/logs`。OTLP HTTP exporter 会把 `404` 视为永久错误并静默丢弃该批数据，路径过期的表现只是"日志突然没了"。
- 如果无法在同一维护窗口内改完 exporter，上表两条接收别名在 1.9.x 仍然可用；请关注 HertzBeat 日志中的 `Deprecated OTLP log route ... was called` 告警并在 2.0 之前完成迁移。
- 如果使用了自定义 `sureness.yml`，请补充 `/api/otlp/v1/**===post===[admin,user]` 与 `/api/observability/**===get===[admin,user,guest]`（参考安装包内的 `sureness.yml`）；旧的 `/api/logs/**`、`/api/traces/**`、`/api/ingestion/otlp/**` 规则在 exporter 迁移完成后即可删除。

### GreptimeDB 信号表改名

当 `warehouse.store.greptime.enabled=true` 时，GreptimeDB 里同时存着两类遥测数据：**你**通过 OTLP 推送的日志与链路，以及 HertzBeat 通过 OpenTelemetry 写入的**自身**运行日志与链路。1.8.x 中两类链路数据落在同一张 `hzb_traces` 表里，1.9.0 将其拆开，因此一张产品表和两张自监控表都改了名：

| 数据 | 1.8.x 表名 | 1.9.0 表名 |
|---|---|---|
| 产品 OTLP 链路（链路页面、链路查询） | `hzb_traces` | `hertzbeat_traces` |
| 产品 OTLP 日志（日志页面、日志告警、SQL 编辑器） | `hertzbeat_logs` | `hertzbeat_logs`（不变） |
| HertzBeat 自身日志（自监控） | `hzb_logs` | `hzb_internal_logs` |
| HertzBeat 自身链路（自监控） | `hzb_traces` | `hzb_internal_traces` |

- **升级前接入的链路数据在链路页面上会是空的。** 1.9.0 只创建并查询 `hertzbeat_traces`，1.8.x 期间写入 `hzb_traces` 的 span 在手动迁移之前不会显示在界面上。
- 产品日志表 `hertzbeat_logs` **没有**改名，1.8.x 期间接入的历史日志升级后无需任何操作即可正常查询。
- 不做自动迁移。旧的 `hzb_logs` / `hzb_traces` 表会原样保留但不再写入新数据。在 1.9.0 建好新表后可手动迁移历史数据，例如：

  ```sql
  INSERT INTO hzb_internal_logs SELECT * FROM hzb_logs;
  ```

  迁移链路数据需要更谨慎：`hzb_traces` 里混着你的 span 和 HertzBeat 自身的 span，需按服务名过滤，避免把自监控数据灌进产品表：

  ```sql
  -- 只保留业务服务；HertzBeat 自监控使用 service.name = 'HertzBeat'
  INSERT INTO hertzbeat_traces SELECT * FROM hzb_traces WHERE service_name <> 'HertzBeat';
  INSERT INTO hzb_internal_traces SELECT * FROM hzb_traces WHERE service_name = 'HertzBeat';
  ```

  如果不需要历史数据，待保留期过后直接 `DROP` 旧表即可。
- 如果有看板或临时 SQL 直接查询 `hzb_logs` / `hzb_traces`，请改为新表名。

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

**HAVE FUN**
