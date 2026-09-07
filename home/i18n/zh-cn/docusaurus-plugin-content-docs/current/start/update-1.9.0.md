---
id: 1.9.0-update
title: 如何升级到 1.9.0
sidebar_label: 1.9.0 升级指南
---

## HertzBeat 1.9.0 升级指南

:::danger 本版本包含破坏性变更
1.9.0 **不是**可以直接替换 jar 或镜像的平滑升级版本。运行环境、配置文件、权限规则、采集器加密协议、GreptimeDB 表结构和部分告警语义都发生了不兼容变化。请完整阅读本指南并按顺序操作。
:::

:::note
该指南适用于 1.8.x 升级到 1.9.0。
如果你使用更老的版本：1.6.x / 1.7.x 请先按 [1.7.0 升级指南](1.7.0-update) 升到 1.7.x，1.7.x 到 1.8.0 没有不兼容变更可直接替换，然后再按本指南升级；也可以直接用导出导入功能重装到 1.9.0（见文末）。
:::

其它请参考 [版本更新指引](upgrade)

## 升级前必读

1. **备份**元数据库（H2 的 `data/` 目录，或 MySQL / PostgreSQL 库）、`define/` 自定义模板目录、`ext-lib/` 目录、`config/` 目录。
2. **升级顺序不能颠倒**：先升级 GreptimeDB（如果启用），再升级所有采集器，最后升级主服务。原因见下文"采集器"一节。
3. **升级后不能直接回滚**：1.9.0 会用新的密文格式重写部分凭据，1.8.x 无法解密。回滚只能恢复升级前的数据库备份。
4. 建议先在测试环境走一遍本指南，尤其是启用了 GreptimeDB、周期性告警规则或自定义 `sureness.yml` 的部署。

## 第一步：运行环境

### Java 25

1.9.0 要求 **Java 25**，安装包不再内置 JDK。

- 服务器默认 Java 已是 25：无需操作。
- 服务器默认 Java 不是 25（如 Java 8、11、17、21），且没有其他应用依赖旧版本：安装 Java 25 并把环境变量指向它。
- 服务器有其他应用依赖旧版本 Java：下载 Java 25，把解压后的目录改名为 `java`，放到 HertzBeat 解压目录下，启动脚本会优先使用它。

Docker 镜像基础层已切换到 `eclipse-temurin:25-jdk`，Docker 用户无需处理。

### 安装包目录结构

启动脚本的 classpath 改为显式的 `lib/*` 与 `ext-lib/*`，不再依赖 jar 的 manifest。请**整包替换**安装目录，不要只替换主 jar。

### 采集器镜像路径

采集器镜像的工作目录从 `/opt/apache-hertzbeat-collector-<版本>-bin/` 改为固定的 `/opt/hertzbeat-collector/`。所有挂载 `config/`、`logs/`、`ext-lib/` 的 volume 或 Kubernetes ConfigMap 路径需要同步修改。

## 第二步：配置文件 application.yml

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

数据库迁移脚本 V190 会在启动时由 Flyway 自动执行，无需手工干预，但其中两条语句有可见影响：

- 它会**禁用没有记录创建者的 AI SOP 计划任务**。升级后这类定时任务会停止执行，记录仍在库里，核实归属后可手动恢复，见 [版本更新指引](upgrade#升级后的-ai-计划任务归属)。
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

## 第三步：权限规则 sureness.yml

1.9.0 收紧了大量接口的角色要求。1.9.0 的安装包、Docker 镜像、仓库内五个 Compose 方案的 `conf/sureness.yml` 以及 `script/sureness.yml` 都已同步为新规则。

- 没有挂载过 `sureness.yml`：无需操作。
- 挂载的是 1.8.x 时期下载或复制的 `sureness.yml`：**必须换成 1.9.0 的版本**，否则新增的 admin 限制不会生效——旧文件里没有 `/api/plugin/**` 与 `/api/account/token*` 规则，而 sureness 对无规则路径是放行的，任何已登录角色（含 guest）都能上传插件、签发和吊销 API Token。
- 自定义过该文件：以 1.9.0 的文件为基础重新合并你的改动。

需要注意的变化：

- 告警 SSE 与管理 SSE（`/api/alert/sse/**`、`/api/manager/sse/**`）从匿名改为需要登录。浏览器原生 `EventSource` 无法携带认证头，页面已改用带认证的 fetch 流式实现；第三方看板需要同样处理。
- 以下接口从"任意登录用户"改为 **仅 admin**：插件上传 `/api/plugin/**`、AI 与 SOP `/api/ai/**`、API Token 管理 `/api/account/token*`、系统配置写入 `/api/config/**`、监控模板修改 `/api/apps/**`（PUT/DELETE）、`/actuator/**`、`/api/metrics`、`/api/warehouse/query`、单个监控删除。
- 阈值规则新增与修改（`POST/PUT /api/alert/define`、`/api/alert/defines/import`）从 admin 与 user 改为 **仅 admin**；guest 不再能读取阈值规则。阈值预览接口 `GET /api/alert/define/preview/**` 也改为 **仅 admin**。
- 标签删除 `DELETE /api/label/**` 改为 **仅 admin**（1.8.x 无规则，等同于任意登录用户可删）。
- 外部告警源推送 `POST /api/v2/alerts` 限定为 admin 与 user，用 guest 账号推送 Alertmanager / Zabbix 告警的集成需要换成 admin 或 user 的凭据。
- `GET /api/config/secret` 对所有角色返回 403，JWT 与 AES 主密钥不再通过接口暴露。
- OpenAPI 文档接口 `/v3/api-docs/**` 从匿名改为 admin。
- 跨域配置不再返回 `Access-Control-Allow-Credentials`，依赖 Cookie 的跨域前端需改为 `Authorization: Bearer` 头。

使用 Prometheus 抓取 `/actuator/prometheus` 的用户，需要为抓取任务配置 admin 角色的 API Token。

## 第四步：GreptimeDB（仅启用时）

:::caution
1.9.0 启动时会主动初始化 GreptimeDB 的表和日志 pipeline，**任一失败主服务将直接退出**，不再像 1.8.x 那样降级运行。请先完成本节，再启动主服务。
:::

### 版本要求

1.8.x Docker Compose 自带的 `greptime/greptimedb:v0.14.3` 不支持 1.9.0 的日志 pipeline，**必须先把 GreptimeDB 升级到 1.x**（Compose 已更新为 `v1.1.3`）。跨大版本升级 GreptimeDB 的数据兼容性请参考 GreptimeDB 官方文档，并先备份数据目录。

配置的 GreptimeDB 账号需要有建表、修改表和上传 pipeline 的权限。

### 产品日志表 hertzbeat_logs 的 body 列

1.8.x 把 `body` 列建为 `JSON` 类型，1.9.0 改为 `STRING`。1.9.0 不会修改已有表，**直接启动后所有新写入的日志都会被 GreptimeDB 拒绝**，页面上只表现为"日志不再更新"，日志告警随之失效。

升级前请在 GreptimeDB 中执行：

```sql
ALTER TABLE hertzbeat_logs RENAME hertzbeat_logs_v18;
```

启动 1.9.0 让其创建新表后，再把历史数据回灌：

```sql
INSERT INTO hertzbeat_logs (time_unix_nano, observed_time_unix_nano, trace_id, span_id, trace_flags,
  severity_text, severity_number, body, attributes, resource, instrumentation_scope, dropped_attributes_count)
SELECT time_unix_nano, observed_time_unix_nano, trace_id, span_id, trace_flags,
  severity_text, severity_number, json_to_string(body), attributes, resource, instrumentation_scope, dropped_attributes_count
FROM hertzbeat_logs_v18;
```

:::danger
不要使用 `ALTER TABLE hertzbeat_logs MODIFY COLUMN body STRING`。该语句能执行成功，但历史行的 JSON 二进制内容会被当成字符串读出，变成乱码。
:::

### 自监控表改名

HertzBeat 自监控的日志与链路表从 `hzb_logs` / `hzb_traces` 改名为 `hzb_internal_logs` / `hzb_internal_traces`，无自动迁移，迁移 SQL 见 [版本更新指引](upgrade#greptimedb-信号表改名)。

产品链路表 `hertzbeat_traces` 是新建的：1.8.x 没有链路接入接口、查询接口和页面，`hzb_traces` 里只有 HertzBeat 自身的 span，所以没有历史业务链路数据需要迁移。

## 第五步：采集器

:::danger 采集器必须先于主服务升级
1.9.0 更改了监控凭据的 AES 密文格式。主服务不解密、直接把密文下发给采集器，**1.8.x 采集器无法解密 1.9.0 主服务下发的密码**，所有需要认证的监控会静默采集失败，且没有任何连接层报错。主服务首次启动就会用新格式重写部分凭据，不需要用户操作即触发。

正确顺序：先把所有采集器升级到 1.9.0（1.9.0 采集器可以正常解密 1.8.x 格式的密文，接旧主服务无问题），再升级主服务。
:::

### MySQL 系采集引擎

1.9.0 内置了 MySQL / MariaDB / OceanBase / TiDB 的 R2DBC 查询引擎，`query-engine` 默认为 `auto`：`ext-lib/` 下存在 `mysql-connector-j` 时继续用 JDBC，行为不变；否则用内置引擎。若驱动放在 `ext-lib/` 之外的路径，请显式设置 `HERTZBEAT_COLLECTOR_MYSQL_QUERY_ENGINE=jdbc`。

内置引擎比 JDBC 严格：

- 忽略 `url` 参数中的连接选项（`useSSL`、`serverTimezone` 等）。
- 对自定义 SQL 采用**白名单**：只接受以 `SELECT` 或 `SHOW` 开头的单条语句。
- 拒绝任何注释（`--`、`#`、`/* */`），也拒绝含 `insert`/`update`/`delete`/`replace`/`merge`/`alter`/`drop`/`truncate`/`create`/`call` 整词的语句——所以 `WITH ... SELECT`、`DESC`、`SHOW CREATE TABLE` 和带注释的 SQL 都会被拒。

### JDBC 数据库名校验

JDBC 类监控的 `database` 参数现在只允许 `[A-Za-z0-9_$][A-Za-z0-9_$.-]{0,63}`。包含空格、中文或超过 64 字符的库名，请改为在 `url` 参数中完整填写连接串。

## 第六步：监控任务

### SFTP 监控

SFTP 监控（FTP 模板开启 SSL）升级后默认拒绝所有服务器主机密钥，**每个 SFTP 监控都需要手工补充主机密钥指纹**，或临时勾选跳过校验。详见 [版本更新指引](upgrade#sftp监控必须显式配置主机密钥策略)。

### 群晖模板改名

群晖模板的 `app` 标识从 `synology` 改为 `synology_nas`，已有监控不会自动迁移。升级前在元数据库执行：

```sql
UPDATE hzb_monitor SET app = 'synology_nas' WHERE app = 'synology';
```

引用了 `synology` 的阈值规则、通知规则和看板过滤条件需要同步修改。

### Push 式监控已移除

`push` 协议的监控模板（Push Style Monitor）已删除。升级前请删除相关监控：

```sql
DELETE FROM hzb_param WHERE monitor_id IN (SELECT id FROM hzb_monitor WHERE app = 'push');
DELETE FROM hzb_monitor WHERE app = 'push';
```

如果在页面上编辑并保存过含 `push:` 协议块的自定义模板，或对象存储中存有此类模板，**必须在升级前删除**，否则主服务启动时解析模板失败而退出。Prometheus 推送网关 `/api/push/prometheus/**` 是另一功能，不受影响。

### 模板字段变更

- NVIDIA 模板 `basic` 指标的字段改名：`utilization.gpu [%]` → `utilization_gpu`、`utilization.memory [%]` → `utilization_memory`、`memory.total [MiB]` → `memory_total`、`memory.used [MiB]` → `memory_used`、`memory.free [MiB]` → `memory_free`、`temperature.gpu` → `temperature_gpu`。引用旧字段名的阈值规则和看板需要修改。该模板同时删除了 `proxyHost`、`proxyPort`、`proxyUsername`、`proxyPassword`、`proxyPrivateKey` 五个参数，通过跳板机采集 GPU 的监控需要改用其他方式连通。
- Redis Sentinel 模板 `sentinel` 指标的 `sentinel_masters`、`sentinel_tilt`、`sentinel_running_scripts`、`sentinel_scripts_queue_length`、`sentinel_simulate_failure_flags` 从字符串改为数值。按字符串比较的阈值规则需要改为数值比较。
- 自定义模板中指标名或字段名含 `.`、`/`、空格等字符的，历史数据查询接口会拒绝。请改为字母、数字、`_`、`-`。

## 第七步：告警与通知

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

## 第八步：接口调用方

- 日志查询、日志管理与日志 SSE 接口从 `/api/logs/**` 迁移到 `/api/observability/**`，旧路径返回 404。OTLP 日志上报旧路径 `/api/logs/otlp/v1/logs`、`/api/logs/ingest/otlp` 保留为过期别名。链路与指标查询接口（`/api/observability/traces/**`、`/api/observability/metrics/**`）是 1.9.0 新增的，1.8.x 没有对应路径。完整对照表见 [版本更新指引](upgrade#可观测otlp--日志--链路接口路径变更)。
- `/api/logs/ingest/otlp` 别名的成功响应体从 `{"code":0,...}` 改为 `{}`；缺少 `Content-Type` 的请求按 protobuf 解析；新增 429 与 503 状态码。
- `GET /api/monitor/{id}` 返回的密码类参数改为掩码 `******`，修改时提交掩码即保留原值；新建监控时不能提交掩码。
- 监控 Excel 导出格式从 11 列改为 14 列，**1.8.x 导出的 xlsx 不能导入 1.9.0**，请重新导出或使用 JSON / YAML。导入改为整批校验，任一行失败则整批不入库。
- 阈值规则导出新增 `datasource` 字段。1.8.x 导出的规则导入后 `datasource` 为空，周期性规则不会执行，导入后请补填。
- 匿名 Prometheus 推送网关 `/api/push/prometheus/**` 新增限额：单次请求体不超过 5 MB、样本不超过 10000 个，自动创建的监控总数不超过 10000。超限统一返回 400 且响应体里 `code` 为 0，真正原因只写在服务端日志里。可用 `HERTZBEAT_PUSH_MAX_BODY_BYTES`、`HERTZBEAT_PUSH_MAX_SAMPLES`、`HERTZBEAT_PUSH_MAX_AUTO_CREATED_MONITORS` 调整。
- 1.8.x 签发的登录 Token 与 API Token 继续有效。新签发的 API Token 支持在页面上列出和吊销。

## 第九步：Docker Compose

- 所有 Compose 变体的端口默认绑定到 `127.0.0.1`。需要远程访问时复制 `.env.example` 为 `.env`，注意三者分开：
  - `HERTZBEAT_BIND_ADDRESS` 控制 1157（Web/API）与 1158（采集器接入）；
  - `HERTZBEAT_OTLP_BIND_ADDRESS` 单独控制 14317（OTLP/gRPC），只设前者不会放开它；
  - 数据库与时序库端口（如 `127.0.0.1:15432:5432`、`127.0.0.1:14000:4000`）是**写死**在 compose 文件里的，没有对应环境变量，确有需要只能直接改 compose。

  改完先跑 `docker compose config` 核对最终的宿主机绑定。
- `hertzbeat-postgresql-victoria-metrics` 变体的 `POSTGRES_PASSWORD` 改为必填。旧环境的数据卷是用 `123456` 初始化的，`.env` 中请填写相同的值，否则数据库认证失败。
- `hertzbeat-postgresql-greptimedb` 变体的 GreptimeDB 镜像从 `v0.14.3` 升级到 `v1.1.3`，见第四步。

## 第十步：AI 会话与 SOP 计划任务

1.9.0 给 AI 会话和 SOP 计划任务加上了归属校验：

- 没有记录创建者的 AI 会话会被隔离，不再出现在任何用户的会话列表里。
- SOP 计划任务归属于其目标会话的创建者。V190 迁移会**禁用所有没有记录创建者的计划任务**；没有目标会话、或创建者与会话创建者不一致的，会在每次后台执行前被禁用。
- 整个 `/api/ai/**` 收敛为仅 admin 可访问。

记录不会被删除。核实归属后可以按 [版本更新指引](upgrade#升级后的-ai-计划任务归属) 的步骤逐条恢复——注意不要把历史记录统一指派给某个共享账号。

## 其它行为变化

这几项不需要改配置，但会改变你看到的数据或告警，升级后请留意：

- **无 host 的监控模板**（`*_sd` 服务发现类、openai、deepseek 等）的 `instance` 从 `null:port` 改为回填监控名。首次编辑保存后，时序数据会与旧序列断开一次，告警指纹也会随之变化一次。
- **SSH / 脚本类采集的单行指标**：命令输出为空且没有 stderr 时，1.8.x 判为采集失败，1.9.0 判为一行值为 NULL 的成功数据。原来靠"response data is null"触发的可用性告警不再触发，需要改为对具体字段判空。stderr 现在会作为失败信息返回。
- **VictoriaMetrics 存储**：与保留标签 `__name__`、`__monitor_id__`、`__metrics__`、`__metric__`、`instance` 同名的自定义标签会被丢弃，不再覆盖保留标签。
- **公告栏**：`hzb_bulletin.name` 增加唯一约束，`POST` 不再按 id 做 upsert（同名直接报已存在），`PUT` 必须带 id。库里已有重名公告时唯一约束会被 Hibernate 静默跳过，建议升级前先清理重名。
- **通知接收人**：`PUT` 一个不存在的 id 从 upsert 改为报错；当 host、port、Webhook URL 等目标字段发生变更时不再接受掩码值，必须提交真实密钥。

## 已移除的功能

- **Push 式监控（`app-push`）**，见第六步。
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
6. 挂载或自定义过 `sureness.yml` 的部署，用普通用户账号验证不应访问的接口已返回 403（至少抽查 `/api/plugin/**` 与 `/api/account/token`）。
7. 用过 AI SOP 定时任务的部署，检查 `hzb_sop_schedule` 里被 V190 禁用的行，核实归属后再逐条启用。

## 通过导出导入升级

若不想按上述步骤逐项处理，可以将老环境的监控任务导出导入：

- 部署一套 1.9.0 的新环境
- 在老环境页面用 **JSON 或 YAML** 格式导出监控任务（Excel 格式不兼容），在新环境导入
- 阈值规则导出后需要在新环境补填 `datasource`
- SFTP 监控导入后仍需补充主机密钥指纹
