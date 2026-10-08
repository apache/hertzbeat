---
id: package-deploy
title: 通过安装包安装 HertzBeat
sidebar_label: 安装包方式安装
---

本文适用于 HertzBeat 2.0 alpha／社区预览版。建议使用全新安装环境进行评估；复用已有数据库前，请先阅读[升级边界](upgrade.md)。

## 前置条件

- Java 25。安装包不包含 JDK。Bash 启动脚本使用 `PATH` 中的 `java`；如果解压目录下存在可执行的 `java/bin/java`，则优先使用它。
- Bash、`curl`，以及安装目录中 `data`、`config`、`logs` 的写权限。服务端启动脚本使用 curl 执行有时间上限的 HTTP 启动检查。
- 可访问的 GreptimeDB，用于三信号查询；准备 HTTP 地址、gRPC 地址、数据库名称，以及服务要求的凭据。
- 元数据库：本地评估可使用内嵌 H2，也可使用 MySQL 或 PostgreSQL。本轮本地 alpha 验收覆盖 H2、MySQL 8.4、PostgreSQL 17 和 GreptimeDB 1.1.4，不代表所有数据库版本、操作系统或原生发行包均已验证。

以下命令使用 Bash 服务端安装包。其他平台应采用对应制品和说明。启动前检查工具链：

```shell
java -version
curl --version
```

## 安装并完成 Setup

1. 从[下载页面](/docs/download)或维护者提供的评估渠道取得 alpha 安装包；如已提供签名或校验值，应先核对。源码构建需记录源码快照，并构建生产前端和启动模块安装包；Vite 开发服务器不能替代发行制品。
2. 解压到新目录。将下面的文件名替换为实际选定的安装包：

   ```shell
   tar -xzf apache-hertzbeat-2.0.0-bin.tar.gz
   cd apache-hertzbeat-2.0.0-bin
   ./bin/startup.sh
   ```

3. 打开 `http://<server>:1157/setup`。首次出现 **Setup required** 说明配置服务已可访问，并不代表安装完成。如果页面要求解锁码，请以安装目录所有者身份读取本地 `data/config/setup-unlock-code`，并妥善保密。
4. 配置元数据库和 GreptimeDB，执行连接检查。安装包的 H2 初始化应使用 `jdbc:h2:./data/hertzbeat;MODE=MYSQL`；本 alpha 的 H2 建表流程需要 MySQL 兼容模式。填写 HertzBeat 服务端能够访问的地址；容器内的 `127.0.0.1` 指向该容器自身。
5. 创建管理员，检查可选的公开访问地址和通知配置，并确认适用的警告。H2 用于评估，不作为生产部署建议。完成 Setup 后使用刚创建的账号登录，不要假设存在 `admin/hertzbeat` 等默认密码。
6. 为服务端以外的客户端配置对外公布的 OTLP 地址。浏览器访问地址和 OTLP HTTP 摄入地址不是同一概念，应使用接入页面生成的指南，不要猜测接口路径。

保留安装包 `config/application.yml` 中的导入配置。Setup 将受管理的配置写入安装目录的 `data/config`；运维人员显式设置的环境变量、命令行和外部配置文件仍保留其优先级。把类路径中的全部默认值复制到外部配置，可能意外覆盖之后的 Setup 修改。

服务端安装包包含元数据库 JDBC 依赖。如果自定义构建省略了驱动，应在启动前通过 `ext-lib` 提供兼容驱动，不要修改正在运行的制品。

## 启动与排错

Bash 启动脚本默认使用 1157 端口和 120 秒启动期限。指定其他端口或更长等待时间：

```shell
SERVER_PORT=1257 START_TIMEOUT=180 ./bin/startup.sh
```

`SERVER_PORT` 同时作为 Spring Boot 的服务端口配置。其他显式端口设置应保持一致。`JAVA_OPTS` 和 `JAVA_MEM_OPTS` 接受按空白分隔的 JVM 参数；使用其他启动方式时，应保留脚本要求的 Arrow JVM 访问参数。

```shell
./bin/startup.sh status
curl --fail http://127.0.0.1:1157/api/setup/status
./bin/shutdown.sh
```

`status` 命令检查进程，不检查信号健康度。端口已监听也不能单独证明初始化成功。进程退出、启动超时或出现 `recovery_required` 时，应查看 `logs/startup.log` 和 Setup 状态，先解决地址、凭据、文件权限或 schema 兼容问题。不要通过修复 Flyway 校验值或替换运行时 JAR 掩盖初始化失败。

## 无人值守评估或 CI

自动化应复用现有的无人值守 Setup 流程。分别提供非空的元数据库密码文件和管理员密码文件，文件应归 HertzBeat 运行账号所有，并仅允许该账号读取，例如权限 `0600`。不要同时设置明文 `password` 和 `password-file`，也不要把密码写入仓库或 CI 输出。

在保留安装包导入配置的前提下，将以下设置加入当前生效的配置，并调整文件路径和 Greptime 地址：

```yaml
hertzbeat:
  setup:
    unattended:
      enabled: true
      acknowledged-warnings: H2_NON_PRODUCTION
    metadata:
      kind: H2
      jdbc-url: 'jdbc:h2:./data/hertzbeat;MODE=MYSQL'
      username: sa
      password-file: /run/secrets/hertzbeat-metadata-password
    telemetry:
      grpc-endpoints: 127.0.0.1:4001
      http-endpoint: http://127.0.0.1:4000
      database: public
    administrator:
      username: admin
      password-file: /run/secrets/hertzbeat-administrator-password
```

如果 Greptime 要求鉴权，还需设置 `hertzbeat.setup.telemetry.username` 和 `hertzbeat.setup.telemetry.password-file`。无人值守流程使用与 UI 相同的校验器和持久化阶段；等待 `/api/setup/status` 返回 `complete` 后，再验证登录。它不会绕过连接检查失败、恢复流程或必要的警告确认。管理员密码应符合当前 BCrypt 编码器的要求，包括 72 字节输入上限。

## 验证首批数据

- **Agentless MySQL：** 使用可访问目标上的最小权限账号创建 MySQL 监控，运行检测，然后检查新鲜的当前值和历史采集值。该目标账号与 HertzBeat 元数据库账号是两个不同用途的账号。
- **OTel Java 应用：** 选择 Java 应用接入方案，将生成的配置用于官方 OpenTelemetry Java agent，产生真实应用请求，再检查首批指标、链路及关联日志。每个信号都必须实际到达；一个信号到达不代表三信号全部接通。
- 首信号检测观察固定时间窗口。停止上报后，应创建新的检测并查看 exporter 错误；之前收到过数据不能证明现在仍在持续上报。

这两条参考链路不要求单独部署 Collector。独立 Collector 的连接、注册、身份和对外摄入地址需另行配置；本地验收不证明 Collector 集群高可用，也不覆盖接入目录中的每一种方案。
