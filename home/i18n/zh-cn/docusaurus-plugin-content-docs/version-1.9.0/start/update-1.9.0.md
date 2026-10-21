---
id: 1.9.0-update
title: 如何升级到 1.9.0
sidebar_label: 1.9.0 升级指南
---

## HertzBeat 1.9.0 升级指南

:::danger 本版本包含破坏性变更
1.9.0 **不是**可以直接替换 jar 或镜像的平滑升级版本。运行环境、配置文件、权限规则、采集器加密协议、GreptimeDB 表结构和部分告警语义都发生了不兼容变化。请在开始升级前完整阅读本指南。
:::

:::note
该指南仅适用于**正式发布的 1.8.x** 升级到正式发布的 1.9.0。
如果你使用 1.6.x / 1.7.x，请先按 [1.7.0 升级指南](1.7.0-update) 和对应版本文档逐级升级到 1.8.x，验证运行正常后再使用本指南。
:::

其它请参考 [版本更新指引](upgrade)

## 是否受影响：快速检查

| 你的部署或使用情况 | 必读章节 |
|---|---|
| 安装包部署 | [运行环境](#运行环境)、[Manager 配置](#manager-配置applicationyml)、[权限规则](#权限规则surenessyml) |
| Docker / Docker Compose | [Manager 配置](#manager-配置applicationyml)、[权限规则](#权限规则surenessyml)、[Docker Compose](#docker-compose) |
| Helm 部署 | [Helm 部署](#helm-部署)；Chart 未适配时不要只覆盖镜像 tag |
| 启用了 GreptimeDB | [GreptimeDB](#greptimedb仅启用时)；不处理会导致日志停止写入 |
| 部署了远程采集器 | [采集器](#采集器)；必须先于 Manager 1.9.0 完成升级 |
| 使用 SFTP、群晖、NVIDIA、Redis Sentinel 或 Push 式监控 | [监控任务](#监控任务) |
| 使用周期性阈值、静默或分组收敛 | [告警与通知](#告警与通知) |
| 有调用 HertzBeat API 的脚本或第三方系统 | [接口调用方](#接口调用方) |
| 在 `ext-lib/` 放置过第三方依赖，或部署过模板市场服务 | [依赖与第三方组件](#依赖与第三方组件)、[已移除的功能](#已移除的功能) |
| 自研插件 | [插件开发者](#插件开发者) |

## 推荐执行顺序与维护窗口

Collector 与 GreptimeDB 之间没有固定的先后依赖，但二者都必须在启动 Manager 1.9.0 前准备完成。推荐按以下顺序执行：

1. 根据上面的快速检查定位所有受影响章节，在测试环境完成演练；下载并准备 1.9.0 安装包、Java 25、新版 `application.yml` 与 `sureness.yml`，此时不要覆盖正在运行的 1.8.x 文件。
2. 在任何生产数据修改、组件升级或文件替换前，备份下节列出的配置和部署文件，并记录当前各组件的版本。
3. 在仍运行 1.8.x 时完成必须提前处理的动作：删除 Push 式监控及相关自定义模板、检查周期性阈值规则、修正无 host 监控的名称、清理重名公告、导出模板市场中的模板，并移除 `ext-lib/` 中冲突的旧依赖。
4. 有远程 Collector 时，先逐台滚动升级到 1.9.0。1.9.0 Collector 可以连接 1.8.x Manager，因此这一步通常不需要停止 Manager。
5. 进入维护窗口：停止 Manager，并暂停所有直接或间接向该 GreptimeDB 写入 HertzBeat 产品日志的发送方。需要避免 Collector 持续重试时，也可以暂时停止 Collector。
6. 在停止写入后，对元数据库与 GreptimeDB 创建一致性备份或快照。
7. 启用了 GreptimeDB 时，按本指南的分阶段路径升级 GreptimeDB，并完成 `hertzbeat_logs` 旧表重命名。
8. 整包替换 Manager，合并新版配置和权限规则，然后启动 Manager 1.9.0。确认新日志表创建成功后，在外部写入保持暂停的情况下回灌并验证历史日志。
9. 受控恢复一个发送方或发送一条测试日志，完成文末的[升级后检查](#升级后检查)。确认正常后再恢复全部外部写入，并结束维护窗口。

:::caution 停机范围
Manager 从第 5 步停止到第 8 步启动完成期间不可用。Collector 可以提前滚动升级；GreptimeDB 升级、表重命名、Manager 切换和历史日志回灌期间必须停止产品日志写入。实际停机时间取决于 GreptimeDB 的分阶段升级、数据卷恢复和历史日志回灌速度。受控验证新日志写入成功后才能全面恢复发送方。
:::

## 升级前备份

备份分为两个阶段。**任何变更之前**先保存：

1. HertzBeat 与 Collector 文件：`define/`、`ext-lib/`、`config/`，以及所有外置的 `application.yml`、`sureness.yml`、证书和密钥文件。
2. 容器部署文件：`.env`、实际使用的 Compose 文件及其本地修改；Kubernetes 的 ConfigMap、Secret、values 文件和挂载声明。
3. 当前 1.8.x 安装包或镜像 tag、所有 Collector 版本和 GreptimeDB 版本，确保回滚时仍能取得相同制品。

进入维护窗口并停止相关写入后，再创建以下**一致性备份**：

1. 元数据库：H2 的完整 `data/` 目录，或 MySQL / PostgreSQL 的一致性备份。
2. 启用 GreptimeDB 时：完整数据目录、Docker volume 或外部存储快照。该备份必须能与升级前使用的 GreptimeDB 版本一起恢复。

升级完成前不要覆盖或删除这些备份。尤其是启用了 GreptimeDB、周期性告警规则或自定义 `sureness.yml` 的部署，建议先完整演练升级与回滚。

## 运行环境

### Java 25

1.9.0 的 Java 运行时要求由 Java 17 提升到 **Java 25**。官方通用安装包与 1.8.x 一样不内置 JDK。

- 服务器默认 Java 已是 25：无需操作。
- 服务器默认 Java 不是 25（如 Java 8、11、17、21），且没有其他应用依赖旧版本：安装 Java 25 并把环境变量指向它。
- 服务器有其他应用依赖旧版本 Java：下载 Java 25，把解压后的目录改名为 `java`，放到 HertzBeat 解压目录下，启动脚本会优先使用它。

Docker 镜像基础层已切换到 `eclipse-temurin:25-jdk`，Docker 用户无需处理。

### 安装包目录结构

启动脚本的 classpath 改为显式的 `lib/*` 与 `ext-lib/*`，不再依赖 jar 的 manifest。请**整包替换**安装目录，不要只替换主 jar。

### 采集器镜像路径

采集器镜像的工作目录从 `/opt/apache-hertzbeat-collector-<版本>-bin/` 改为固定的 `/opt/hertzbeat-collector/`。所有挂载 `config/`、`logs/`、`ext-lib/` 的 volume 或 Kubernetes ConfigMap 路径需要同步修改。

## Manager 配置：application.yml

### JPA 实现从 EclipseLink 切换为 Hibernate

这是最容易被忽略、后果最直接的一处。**沿用 1.8.x 的 `application.yml` 会导致主服务无法启动。** 请按所用数据库把 `spring.jpa` 段整体替换。

1.8.x 的写法（需要删除）：

```yaml
spring:
  jpa:
    show-sql: false
    database-platform: org.eclipse.persistence.platform.database.MySQLPlatform
    database: h2
    properties:
      eclipselink:
        logging:
          level: SEVERE
```

1.9.0 的写法，H2：

```yaml
spring:
  jpa:
    show-sql: false
    database: h2
    hibernate:
      ddl-auto: update
    properties:
      hibernate:
        dialect: org.hibernate.dialect.H2Dialect
        format_sql: true
```

MySQL：

```yaml
spring:
  jpa:
    show-sql: false
    database: mysql
    hibernate:
      ddl-auto: update
    properties:
      hibernate:
        dialect: org.hibernate.dialect.MySQLDialect
        format_sql: true
```

PostgreSQL：

```yaml
spring:
  jpa:
    show-sql: false
    database: postgresql
    hibernate:
      ddl-auto: update
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect
        format_sql: true
```

:::caution
`hibernate.ddl-auto: update` 不能省略。1.9.0 新增的表和列（如 `hzb_auth_token`、通知接收人的 ntfy 字段）由 Hibernate 自动创建，省略后启动虽然成功，但相关功能会在运行时报 SQL 错误。
:::

1.9.0 新增的 Flyway 数据库迁移会在启动时自动执行，无需手工干预，其中一项有可见影响：

- 它把 `hzb_alert_define.expr` 扩展为大文本类型（PostgreSQL `TEXT`、MySQL `LONGTEXT`、H2 `CLOB`），绑定大量监控的阈值表达式不再被截断。

:::caution 挂载了自己的 application.yml 的部署
Docker Compose 用 `./conf/application.yml` 覆盖镜像内的配置文件，`docker run` 也常挂载 `-v $(pwd)/application.yml:/opt/hertzbeat/config/application.yml`。**镜像升级不会更新这些挂载进去的文件**，沿用 1.8.x 的副本一样会撞上上面的 EclipseLink 问题。请用 1.9.0 的版本重新生成，再把你自己的改动合并回去。
:::

### 其他配置键变更

| 1.8.x | 1.9.0 | 说明 |
|---|---|---|
| `management.endpoints.enabled-by-default: on` | `management.endpoints.access.default: read_only` | Spring Boot 4 移除了旧键。保留旧键不会报错，但 actuator 会退回不受限模式。 |
| 无 | `springdoc.api-docs.enabled: false`、`springdoc.swagger-ui.enabled: false` | OpenAPI 文档默认关闭。需要时设为 true，且只有 admin 角色可访问。 |
| 无 | `hertzbeat.otlp.grpc.port: 14317` | 启用 GreptimeDB 时新增 OTLP/gRPC 监听端口，详见 [版本更新指引](upgrade#新增-otlpgrpc-监听端口-14317)。 |
| 无 | `hertzbeat.collector.mysql.query-engine: auto` | MySQL 系采集引擎选择，见下文"采集器"一节。 |
| `spring.mail.properties.mail.smtp.ssl.trust` | 页面邮件设置中的"校验 SSL 证书"开关 | yml 中的 `ssl.trust` 不再生效，自签证书的 SMTP 需在页面关闭校验。 |

## 权限规则：sureness.yml

1.9.0 收紧了大量接口的角色要求。1.9.0 的安装包、Docker 镜像、仓库内五个 Compose 方案的 `conf/sureness.yml` 以及 `script/sureness.yml` 都已同步为新规则。

- 没有挂载过 `sureness.yml`：无需操作。
- 挂载的是 1.8.x 时期下载或复制的 `sureness.yml`：**必须换成 1.9.0 的版本**。1.9.0 更新了授权规则，而挂载进去的文件会覆盖发布包与镜像内的那份。
- 自定义过该文件：以 1.9.0 的文件为基础重新合并你的改动。

需要注意的变化：

- 告警 SSE 与管理 SSE（`/api/alert/sse/**`、`/api/manager/sse/**`）在 1.9.0 中需要登录。浏览器原生 `EventSource` 无法携带认证头，页面已改用带认证的 fetch 流式实现；第三方看板需要同样处理。
- 以下接口在 1.9.0 中 **仅 admin** 可访问：插件上传 `/api/plugin/**`、AI 与 SOP `/api/ai/**`、API Token 管理 `/api/account/token*`、系统配置写入 `/api/config/**`、监控模板修改 `/api/apps/**`（PUT/DELETE）、`/actuator/**`、`/api/metrics`、`/api/warehouse/query`、单个监控删除。使用这些接口的自动化需要改用 admin 凭据。
- 阈值规则新增与修改（`POST/PUT /api/alert/define`、`/api/alert/defines/import`）以及阈值预览 `GET /api/alert/define/preview/**` 在 1.9.0 中 **仅 admin** 可访问；guest 不能读取阈值规则。
- 标签删除 `DELETE /api/label/**` 在 1.9.0 中 **仅 admin** 可访问。
- 外部告警源推送 `POST /api/v2/alerts` 在 1.9.0 中只允许 admin 与 user；Alertmanager / Zabbix 集成需要使用相应角色的凭据。
- 系统密钥配置不再支持通过 REST API 读取，相关请求对所有角色返回 403。
- OpenAPI 文档接口 `/v3/api-docs/**` 在 1.9.0 中仅 admin 可访问。
- 跨域配置不再返回 `Access-Control-Allow-Credentials`，依赖 Cookie 的跨域前端需改为 `Authorization: Bearer` 头。

使用 Prometheus 抓取 `/actuator/prometheus` 的用户，需要为抓取任务配置 admin 角色的 API Token。

## GreptimeDB（仅启用时）

:::caution
1.9.0 启动时会主动初始化 GreptimeDB 的表和日志 pipeline，**任一失败主服务将直接退出**，不再像 1.8.x 那样降级运行。请先完成本节，再启动主服务。
:::

### 版本要求

1.8.x Docker Compose 自带的 `greptime/greptimedb:v0.14.3` 不支持 1.9.0 的日志 pipeline，Compose 1.9.0 已更新为 `v1.1.3`。**不能把 v0.14.3 直接替换为 v1.1.3**；根据 [GreptimeDB 官方升级路径](https://docs.greptime.com/user-guide/deployments-administration/upgrade/)，低于 v0.16 的版本必须先升级到 v0.16，再升级到 v1.0。

按以下阶段操作，每一阶段都要使用该版本对应的官方升级说明，并在继续前确认 GreptimeDB 可以启动、旧表可查询且行数符合预期，再为下一阶段创建新的可恢复快照：

1. `v0.14.3` → 一个兼容的 `v0.16.x` 版本；
2. `v0.16.x` → `v1.0.x`；
3. `v1.0.x` → Compose 使用的 `v1.1.3`。

任一阶段验证失败都应恢复该阶段开始前的数据快照，不要让更高版本继续写入该数据目录。

配置的 GreptimeDB 账号需要有建表、修改表和上传 pipeline 的权限。

### 产品日志表 hertzbeat_logs 的 body 列

1.8.x 把 `body` 列建为 `JSON` 类型，1.9.0 改为 `STRING`。1.9.0 不会修改已有表，**直接启动后所有新写入的日志都会被 GreptimeDB 拒绝**，页面上只表现为"日志不再更新"，日志告警随之失效。

确认 Manager 和其它日志写入方已经停止，并已完成 GreptimeDB 数据快照后，先核对旧表结构和行数：

```sql
SHOW CREATE TABLE hertzbeat_logs;
SELECT COUNT(*) AS row_count, MIN(time_unix_nano) AS min_time, MAX(time_unix_nano) AS max_time
FROM hertzbeat_logs;
```

确认 `body` 为 `JSON` 且表名无误后执行：

```sql
ALTER TABLE hertzbeat_logs RENAME hertzbeat_logs_v18;
```

启动 1.9.0 让其创建新表，但继续暂停外部日志写入。确认新表为空后，再把历史数据回灌：

```sql
INSERT INTO hertzbeat_logs (time_unix_nano, observed_time_unix_nano, trace_id, span_id, trace_flags,
  severity_text, severity_number, body, attributes, resource, instrumentation_scope, dropped_attributes_count)
SELECT time_unix_nano, observed_time_unix_nano, trace_id, span_id, trace_flags,
  severity_text, severity_number, json_to_string(body), attributes, resource, instrumentation_scope, dropped_attributes_count
FROM hertzbeat_logs_v18;
```

:::caution 历史日志只能回灌一次
新表使用 append-only 模式，该 `INSERT ... SELECT` **不是幂等操作**，重复执行会产生重复日志。执行前记录旧表行数及最早、最晚时间；执行成功后，新旧表的这些值应一致。验证完成后，才受控恢复一个发送方并检查新日志写入。

如果客户端断线、超时或无法确认 SQL 是否完整执行，**不要直接重跑**。继续保持所有产品日志写入暂停，比较新旧表的行数和时间范围；无法证明目标表仍为空或回灌完整时，应使用升级前快照恢复并重新执行整个 GreptimeDB 升级流程。若必须保留目标表中的数据，请先在隔离环境设计并验证去重迁移方案。
:::

GreptimeDB 的 DDL 不应假定可以随关系型数据库事务一起回滚，因此执行每条语句后都要确认结果。

:::danger
不要使用 `ALTER TABLE hertzbeat_logs MODIFY COLUMN body STRING`。该语句能执行成功，但历史行的 JSON 二进制内容会被当成字符串读出，变成乱码。
:::

### 自监控表改名

HertzBeat 自监控的日志与链路表从 `hzb_logs` / `hzb_traces` 改名为 `hzb_internal_logs` / `hzb_internal_traces`，无自动迁移，迁移原则见 [版本更新指引](upgrade#greptimedb-信号表改名)。

产品链路表 `hertzbeat_traces` 是新建的：1.8.x 没有链路接入接口、查询接口和页面，`hzb_traces` 里只有 HertzBeat 自身的 span，所以没有历史业务链路数据需要迁移。

## 采集器

:::danger 采集器必须先于主服务升级
1.9.0 更改了监控凭据的 AES 密文格式。主服务不解密、直接把密文下发给采集器，**1.8.x 采集器无法解密 1.9.0 主服务下发的密码**，需要认证的监控可能采集失败。握手过程没有版本校验，不会阻止这种错配：采集器日志里会出现 AES 解密错误，监控侧通常表现为目标服务返回的认证失败，容易被误判成密码填错。主服务首次启动就会用新格式重写部分凭据，不需要用户操作即触发。

正确顺序：先把所有采集器升级到 1.9.0（1.9.0 采集器可以正常解密 1.8.x 格式的密文，接旧主服务无问题），再升级主服务。
:::

### MySQL 系采集引擎

1.9.0 内置了 MySQL / MariaDB / OceanBase / TiDB 的 R2DBC 查询引擎，`query-engine` 默认为 `auto`：`ext-lib/` 下存在 `mysql-connector-j` 时继续用 JDBC，行为不变；否则用内置引擎。若驱动放在 `ext-lib/` 之外的路径，请显式设置 `HERTZBEAT_COLLECTOR_MYSQL_QUERY_ENGINE=jdbc`。

内置引擎比 JDBC 严格：

- 忽略 `url` 参数中的连接选项（`useSSL`、`serverTimezone` 等）。
- 对自定义 SQL 采用**白名单**：只接受以 `SELECT` 或 `SHOW` 开头的单条语句。
- 拒绝任何注释（`--`、`#`、`/* */`），也拒绝含 `insert`/`update`/`delete`/`replace`/`merge`/`alter`/`drop`/`truncate`/`create`/`call` 整词的语句——所以 `WITH ... SELECT`、`DESC`、`SHOW CREATE TABLE` 和带注释的 SQL 都会被拒。

内置 R2DBC 路径会优先使用 TLS。若升级后出现 TLS 握手或 MySQL 认证插件兼容错误，请为监控账号配置兼容的 TLS/认证方式；也可以把 `mysql-connector-j` 放入 `ext-lib/`，并显式设置 `HERTZBEAT_COLLECTOR_MYSQL_QUERY_ENGINE=jdbc` 回到 JDBC 路径。

### JDBC 数据库名校验

JDBC 类监控的 `database` 参数现在只允许 `[A-Za-z0-9_$][A-Za-z0-9_$.-]{0,63}`。包含空格、中文或超过 64 字符的库名，请改为在 `url` 参数中完整填写连接串。

## 监控任务

### SFTP 监控

SFTP 监控（FTP 模板开启 SSL）升级后默认拒绝所有服务器主机密钥，**每个 SFTP 监控都需要手工补充主机密钥指纹**，或临时勾选跳过校验。详见 [版本更新指引](upgrade#sftp监控必须显式配置主机密钥策略)。

### 群晖模板改名

群晖模板的 `app` 标识从 `synology` 改为 `synology_nas`，已有监控不会自动迁移。停止 Manager、备份元数据库后，先确认受影响记录：

```sql
SELECT id, name, app FROM hzb_monitor WHERE app = 'synology';
```

确认结果无误后执行，并再次查询确认没有遗漏：

```sql
UPDATE hzb_monitor SET app = 'synology_nas' WHERE app = 'synology';
SELECT id, name, app FROM hzb_monitor WHERE app = 'synology';
```

引用了 `synology` 的阈值规则、通知规则和看板过滤条件需要同步修改。

### Push 式监控已移除

`push` 协议的监控模板（Push Style Monitor）已删除。升级前先查询受影响监控：

```sql
SELECT id, name, app FROM hzb_monitor WHERE app = 'push';
```

请在仍运行 1.8.x 时通过页面或 API 删除查询到的监控，让 HertzBeat 同时清理参数、阈值绑定、父子监控绑定、指标收藏、采集器绑定和调度任务。**不要只对 `hzb_param` 和 `hzb_monitor` 执行手工 DELETE**，否则会遗留孤儿数据。如果页面或 API 已不可用，请先停止 Manager，再根据所用数据库制定并验证完整的事务清理脚本，不要直接复制不完整的通用 SQL。

如果在页面上编辑并保存过含 `push:` 协议块的自定义模板，或对象存储中存有此类模板，**必须在升级前删除**，否则主服务启动时解析模板失败而退出。Prometheus 推送网关 `/api/push/prometheus/**` 是另一功能，不受影响。

### 模板字段变更

- NVIDIA 模板 `basic` 指标的字段改名：`utilization.gpu [%]` → `utilization_gpu`、`utilization.memory [%]` → `utilization_memory`、`memory.total [MiB]` → `memory_total`、`memory.used [MiB]` → `memory_used`、`memory.free [MiB]` → `memory_free`、`temperature.gpu` → `temperature_gpu`。引用旧字段名的阈值规则和看板需要修改。该模板同时删除了 `proxyHost`、`proxyPort`、`proxyUsername`、`proxyPassword`、`proxyPrivateKey` 五个参数，通过跳板机采集 GPU 的监控需要改用其他方式连通。
- Redis Sentinel 模板 `sentinel` 指标的 `sentinel_masters`、`sentinel_tilt`、`sentinel_running_scripts`、`sentinel_scripts_queue_length`、`sentinel_simulate_failure_flags` 从字符串改为数值。按字符串比较的阈值规则需要改为数值比较。
- 历史数据查询接口会校验所有查询参数：`app`、指标组和字段名只允许字母、数字、`_`、`-`，长度 1–200；`instance` 另外允许 `. : [ ]`，但不允许空格和中文；时间范围必须是 1–6 位数字加一个 `s`、`m`、`h`、`d`、`w` 或 `y` 单位，单位不区分大小写（如 `6h`、`1D`）。自定义模板和 API 调用方需要同步检查。

## 告警与通知

### 周期性阈值规则

周期性规则（PromQL 与 SQL）在执行时新增了限制：查询语句不超过 8192 字符，时间范围不超过 1 天（如 `[2d]`、`[1w]`、`RANGE '2d'` 会被拒绝），结果不超过 1000 行。SQL 规则还必须是单条只读语句，以 `SELECT` 或 `WITH` 开头，不含库名前缀，且能被标准 SQL 解析器解析。

**不满足限制的规则在保存时不会报错，执行时会被静默跳过**，已经触发的告警不会恢复。升级前请逐条检查现有周期性规则，可用阈值预览接口验证（该接口现在仅 admin 可调用）。

### 实时阈值规则的空值语义

1.8.x 中指标字段为空或无法解析时，该行数据直接跳过。1.9.0 改为数值字段以 `null`、字符串字段以空串参与表达式求值。影响：

- `field != 0`、`!contains(field, "x")`、`!matches(field, "...")` 这类取反表达式在空值行上会成立，可能误报。
- 字段已经变空的历史告警会在升级后第一轮评估中集中恢复，产生一批恢复通知。

建议给此类规则加上 `exists(field) &&` 前置条件。

### 周期性告警静默

1.8.x 中周期型静默规则存在缺陷，创建当天之后事实上不再生效。1.9.0 修复后按每天的时间段、闭区间、支持跨午夜匹配，并统一按**服务端时区**计算。所有仍处于启用状态的周期型静默规则升级后会真正开始压制告警，请逐条复核；浏览器与服务端时区不同的规则，时间窗口会整体平移。

### 告警分组收敛

分组告警处于 firing 状态时会按 `repeat_interval`（默认 4 小时）重复通知。`repeat_interval` 为 0 时会按 `group_interval`（默认 5 分钟）重复发送，请改为较大的数值。带标签过滤的通知规则现在只要分组内任一告警命中即触发，下发给通知渠道的分组内容按规则重新组装，`groupKey` 与落库值可能不同，下游按 `groupKey` 去重的系统请改为按单条告警的 `fingerprint`。

### 通知渠道

- Webhook 地址改为原样发送，不再自动编码。地址中含空格、`|`、`{`、`}` 等字符的接收人需要修正。
- 邮件通知默认校验 SMTP 证书，自签证书需在页面邮件设置中关闭校验。
- 接口返回的通知接收人密钥字段（Webhook Token、机器人 Token、Slack 地址等）改为掩码 `******` 加末 4 位。通过接口"读取后再新建"接收人的脚本会把掩码存成真实值，请改为"读取后修改"。

## 接口调用方

- 日志查询、日志管理与日志 SSE 接口从 `/api/logs/**` 迁移到 `/api/observability/**`，旧路径返回 404。OTLP 日志上报旧路径 `/api/logs/otlp/v1/logs`、`/api/logs/ingest/otlp` 保留为过期别名。链路与指标查询接口（`/api/observability/traces/**`、`/api/observability/metrics/**`）是 1.9.0 新增的，1.8.x 没有对应路径。完整对照表见 [版本更新指引](upgrade#可观测otlp--日志--链路接口路径变更)。
- `/api/logs/ingest/otlp` 别名的成功响应体从 `{"code":0,...}` 改为 `{}`；缺少 `Content-Type` 的请求按 protobuf 解析；新增 429 与 503 状态码。
- `GET /api/monitor/{id}` 返回的密码类参数改为掩码 `******`，修改时提交掩码即保留原值；新建监控时不能提交掩码。
- 监控 Excel 导出格式从 11 列改为 14 列，**1.8.x 导出的 xlsx 不能导入 1.9.0**，请重新导出或使用 JSON / YAML。导入改为整批校验，任一行失败则整批不入库。
- 阈值规则导出新增 `datasource` 字段。1.8.x 导出的规则导入后 `datasource` 为空，周期性规则不会执行，导入后请补填。
- 匿名 Prometheus 推送网关 `/api/push/prometheus/**` 新增限额：单次请求体不超过 5 MB、样本不超过 10000 个，自动创建的监控总数不超过 10000。超限统一返回 400 且响应体里 `code` 为 0，真正原因只写在服务端日志里。可用 `HERTZBEAT_PUSH_MAX_BODY_BYTES`、`HERTZBEAT_PUSH_MAX_SAMPLES`、`HERTZBEAT_PUSH_MAX_AUTO_CREATED_MONITORS` 调整。
- 1.8.x 签发的登录 Token 与 API Token 继续有效。新签发的 API Token 支持在页面上列出和吊销。

## Docker Compose

- 所有 Compose 变体的端口默认绑定到 `127.0.0.1`。需要远程访问时复制 `.env.example` 为 `.env`，注意三者分开：
  - `HERTZBEAT_BIND_ADDRESS` 控制 1157（Web/API）与 1158（采集器接入）；
  - `HERTZBEAT_OTLP_BIND_ADDRESS` 单独控制 14317（OTLP/gRPC），只设前者不会放开它；
  - 数据库与时序库端口（如 `127.0.0.1:15432:5432`、`127.0.0.1:14000:4000`）是**写死**在 compose 文件里的，没有对应环境变量，确有需要只能直接改 compose。

  改完先跑 `docker compose config` 核对最终的宿主机绑定。
- `hertzbeat-postgresql-victoria-metrics` 变体的 `POSTGRES_PASSWORD` 改为必填。若旧部署没有覆盖 Compose 的默认密码，已有数据卷使用旧默认值初始化；若曾自定义，则应以实际数据库用户口令为准。升级前请核对旧 `.env`、Compose 配置和数据库用户名，在新 `.env` 中填入**相同口令**，否则数据库认证失败。若要改用强口令，请先在 PostgreSQL 中修改该数据库用户的口令，再同步 `.env`。
- `hertzbeat-postgresql-greptimedb` 变体的 GreptimeDB 镜像从 `v0.14.3` 升级到 `v1.1.3`，见 [GreptimeDB](#greptimedb仅启用时)。

## Helm 部署

Helm Chart 由独立项目维护。**不要在仍以 1.8.x 为 `appVersion` 的 Chart 上只覆盖 Manager 镜像 tag 为 1.9.0**：旧 Chart 可能继续挂载 EclipseLink 版 `application.yml`、旧权限规则，并且没有声明 OTLP/gRPC 端口 14317，导致启动失败、权限行为与 1.9.0 不一致或 gRPC 接入不可用。

升级前确认所用 Chart 明确支持 HertzBeat 1.9.0，并至少检查：

- `application.yml` 已使用本指南中的 Hibernate 配置；
- `sureness.yml` 已同步为 1.9.0 规则；
- 使用 OTLP/gRPC 时，Deployment、Service、NetworkPolicy 和 Ingress/Gateway 已按需配置 14317；
- Collector 的配置挂载路径已从版本化目录改为 `/opt/hertzbeat-collector/`；
- values、ConfigMap、Secret 和持久卷已经备份。

如果尚无明确支持 1.9.0 的 Chart，请不要只替换镜像，改用已验证的安装包或 Compose 流程，或等待 Chart 发布兼容版本。

## AI 会话与 SOP 计划任务

1.9.0 给 AI 会话和 SOP 计划任务加上了归属校验：

- 没有记录创建者的 AI 会话会被隔离，不再出现在任何用户的会话列表里。
- SOP 计划任务归属于其目标会话的创建者。没有目标会话、没有创建者或创建者与会话创建者不一致的任务，会在后台执行前被禁用。
- 整个 `/api/ai/**` 收敛为仅 admin 可访问。

正式发布的 1.8.x 没有 SOP 计划任务，因此从 1.8.x 升级不会产生需要恢复的历史任务。

## 其它行为变化

这几项不需要改配置，但会改变你看到的数据或告警，升级后请留意：

- **无 host 的监控模板**（`*_sd` 服务发现类、openai、deepseek 等）的 `instance` 从 `null:port` 改为回填监控名。首次编辑保存后，时序数据会与旧序列断开一次，告警指纹也会随之变化一次。监控名将作为历史查询的 `instance`；名称含空格、中文或其它不在 `[A-Za-z0-9_\-.:\[\]]` 中的字符时，历史查询会被拒绝，升级前请先改名。
- **SSH / 脚本类采集的单行指标**：命令输出为空且没有 stderr 时，1.8.x 判为采集失败，1.9.0 判为一行值为 NULL 的成功数据。原来靠"response data is null"触发的可用性告警不再触发，需要改为对具体字段判空。stderr 现在会作为失败信息返回。
- **VictoriaMetrics 存储**：与保留标签 `__name__`、`__monitor_id__`、`__metrics__`、`__metric__`、`instance` 同名的自定义标签会被丢弃，不再覆盖保留标签。
- **公告栏**：`hzb_bulletin.name` 增加唯一约束，`POST` 不再按 id 做 upsert（同名直接报已存在），`PUT` 必须带 id。库里已有重名公告时唯一约束会被 Hibernate 静默跳过，建议升级前先清理重名。
- **通知接收人**：`PUT` 一个不存在的 id 从 upsert 改为报错；当 host、port、Webhook URL 等目标字段发生变更时不再接受掩码值，必须提交真实密钥。

## 已移除的功能

- **Push 式监控（`app-push`）**，见 [监控任务](#监控任务)。
- **监控模板市场（template marketplace hub）**：独立部署的模板市场服务整体删除，`/template`、`/tag`、`/star`、`/share`、`/category`、`/user`、`/version`、`/role`、`/resource`、`/auth` 等接口和对应的 7 张表都不再存在，**没有升级路径**。如果你部署过这个服务，请在升级前自行导出其中的模板，改为通过页面或 `define/` 目录管理。

## 依赖与第三方组件

这些变化只影响特定部署方式，多数用户无需处理：

| 组件 | 1.8.0 | 1.9.0 | 影响 |
|---|---|---|---|
| Nacos 客户端 | 2.2.1 | 3.1.1 | **不再支持 Nacos 1.x 服务端**。用 Nacos 做服务发现的监控（`nacos_sd`）需要 Nacos 2.x 及以上 |
| BouncyCastle | `bcprov-jdk15on` | `bcprov-jdk18on` 1.85 | `ext-lib/` 里自带 `jdk15on` 系列 jar 的部署会出现类冲突，请删除旧 jar |
| OkHttp | 4.12.0 | 5.3.2 | 自带 OkHttp 的第三方插件需重编 |
| mssql-jdbc | 10.2.0.jre8 | 12.10.2.jre11 | 手动放进 `ext-lib/` 的旧 SQL Server 驱动建议同步更新 |
| gRPC / OpenTelemetry | 1.56.1 / 2.15.0 | 1.76.3 / 2.25.0 | 一般无感知 |

另外，通知与采集的出站 HTTP 客户端从 OkHttp 换成了 JDK 自带的 `HttpClient`：请求头里的 `Connection: close` 会被静默丢弃，且 https 到 http 的重定向会被拒绝。自建的 Webhook 接收端如果依赖这两种行为，需要调整。

## 插件开发者

`hertzbeat-common` 拆分为 `hertzbeat-common-core` 与 `hertzbeat-common-spring`，插件 SPI 接口（`Plugin`、`PostAlertPlugin`、`PostCollectPlugin`、`PluginRunner`）以及 `GroupAlert`、`SingleAlert`、`CollectRep`、`Job` 的全限定名都未变。

- **必须做**：把依赖坐标从 `org.apache.hertzbeat:hertzbeat-common:1.8.0` 换成 `hertzbeat-common-core` 或 `hertzbeat-common-spring`，然后用 Java 25 重新编译。
- **不需要改代码**：`JsonUtil`、`XmlUtil`（迁至 `hertzbeat-common-core`）、`CommonThreadPool`（迁至 `hertzbeat-common-spring`）等工具类只是换了模块，包名与类名一字未改。
- **需要改代码**：`PluginUpload` 与 `CollectorSummary` 迁到了 `org.apache.hertzbeat.manager.pojo.dto`，`PushProtocol` 与 `PushMetricsDto` 随 Push 式监控一起删除。
- 核心 JSON 库升级到 Jackson 3（`tools.jackson.*`）。Jackson 2 的 databind 仍作为传递依赖存在于 classpath，但不应再依赖它，新代码请使用 Jackson 3。

## 升级后检查

1. 主服务日志无 Flyway 与 Hibernate 报错。
2. 采集器页面所有采集器在线且版本为 1.9.0。
3. 随机抽查需要认证的监控（数据库、SSH、API Key 类）采集正常。
4. 启用 GreptimeDB 时，日志页面有新数据写入；主服务日志无 `[warehouse greptime-log] Write failed`。
5. 周期性阈值规则页面无执行异常；告警静默列表已逐条复核。
6. 挂载或自定义过 `sureness.yml` 的部署，分别使用 admin、普通用户和 guest 验证若干仅管理员接口、登录后接口与匿名接口，确认授权结果符合 1.9.0 规则。

## 回滚到 1.8.x

:::danger
升级后产生的新数据可能无法合并回升级前快照。不要让 1.8.x Manager 直接连接已经被 1.9.0 修改过的元数据库，也不要用 GreptimeDB 0.14 直接打开已经由 1.1 写入的数据目录。
:::

如果升级验证失败并决定回滚：

1. 停止 Manager，以及所有通过 OTLP、HTTP、SQL 或其它方式直接或间接写入该 GreptimeDB 的客户端；共享 GreptimeDB 的其它应用也必须停止写入。为避免持续重试，可同时停止 Collector。
2. 恢复升级前的关系型元数据库备份。
3. 如果升级或修改过 GreptimeDB，恢复升级前的**完整 GreptimeDB 数据目录、Docker volume 或外部存储快照**，并使用备份时记录的 GreptimeDB 版本启动。不要把修改表名当作跨大版本数据库回滚。
4. 恢复 1.8.x 安装包或镜像，以及配套的 `config/`、`define/`、`ext-lib/`、`.env`、Compose/Helm 配置和证书密钥。
5. Collector 1.9.0 可以临时连接 1.8.x Manager；如果要求完整恢复原版本，再逐台恢复 Collector 1.8.x。任何时候都不要让 Manager 1.9.0 向 Collector 1.8.x 下发凭据。
6. 先启动数据库和时序库，再启动 Manager 与 Collector。按升级前记录抽查监控、告警、通知和日志写入。

1.9.0 已经创建新 `hertzbeat_logs` 时，不能直接把 `hertzbeat_logs_v18` 重命名回来，因为目标表名已被占用。完整数据快照是首选回滚方式；如果必须保留 GreptimeDB 1.1 并只回滚 HertzBeat，请先在隔离环境验证如何归档 1.9 新表、恢复旧表名和 JSON `body` 结构，不要在生产环境临时拼接 DDL。

## 仅迁移监控任务到全新环境

如果希望放弃原环境、重新部署一套 1.9.0，可以导出导入监控任务。这不是完整环境迁移，新环境仍需按本文完成 Java、配置、权限、Collector、GreptimeDB 和部署方式检查。

1. 部署并验证一套全新的 1.9.0 环境。
2. 在老环境页面用 **JSON 或 YAML** 格式导出监控任务（Excel 格式不兼容），在新环境导入。
3. 单独导出并导入阈值规则；1.8.x 导出的规则需要在新环境补填 `datasource`。
4. SFTP 监控导入后仍需补充主机密钥指纹。

账号与角色、通知接收人和策略、看板、状态页、公告、AI 会话、系统配置、历史指标/日志以及其它元数据不会因为导入监控任务而自动迁移，需要逐项重建或制定单独的数据迁移方案。

## 获取帮助与报告安全问题

- 一般升级问题可以通过 [GitHub Issues](https://github.com/apache/hertzbeat/issues)、[社区联系方式](../community/contact)或公开开发者邮件列表 `dev@hertzbeat.apache.org` 求助。提问前请删除密码、Token、数据库连接串和其它敏感信息。
- 疑似安全问题**不要**提交公开 Issue、Discussion 或发送到公开邮件列表。请按照 [安全模型](../help/security_model)和 [ASF 漏洞报告流程](https://www.apache.org/security/#reporting-a-vulnerability)私下报告。
