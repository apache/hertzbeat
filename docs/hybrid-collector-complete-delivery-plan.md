# HertzBeat Hybrid Collector 完整交付计划

> 状态：执行基线
> 最近更新：2026-07-15
> 实施分支：`codex/hybrid-collector-phase0`
> 实施工作树：`/Users/zhaoqingran/IdeaProjects/hertzbeat-hybrid-collector`

## 1. 计划用途

本文件是 Hybrid Collector 后续实现、评审和验收的唯一范围基线。后续会话不得依赖聊天记忆决定范围：

1. 每次只推进一个里程碑；
2. 开始前先读取本文件和 `progress.md`；
3. 新增或删除能力必须先修改本文件并说明原因；
4. 验证失败时停在当前里程碑修复，不带失败进入下一项；
5. 所有里程碑和最终验收全部通过后，才能声明 Hybrid Collector 完成。

本计划已经吸收 2026-07-10 Hybrid Collector 架构评审的结论和架构红线，不重新发明另一套采集器。

## 2. 最终产品定义

Hybrid Collector 必须同时具备两类能力：

- **主动采集**：采集主机指标、Prometheus 指标、批准的本地日志，并通过随包提供的官方自动埋点采集 Java 应用链路和 JVM 指标；
- **接收转发**：通过标准 OTLP/HTTP 和 OTLP/gRPC 接收应用或其他 OTel SDK/Agent 的 Metrics、Logs、Traces，经过保护和补充后直接发送 HertzBeat Server。

对用户保持以下产品边界：

- 一个安装包；
- 一个启动入口和系统服务；
- 一个 Collector ID；
- Java Collector 是唯一注册、配置和生命周期主控；
- Go OTel Runtime 不作为第二个 Collector 注册；
- Go Runtime 直接向 HertzBeat Server 发送遥测，Java 不代理数据；
- 不要求用户另装第三方 OpenTelemetry Collector；
- 默认配置可工作，高级能力通过受控语义配置开启，不允许远程下发任意 YAML。

## 3. 完成后的固定组件清单

使用 OCB 构建裁剪后的官方组件集合。除下表外，不增加组件。

### 3.1 Receiver

| 组件 | 最终用途 | 状态 |
| --- | --- | --- |
| `otlpreceiver` | OTLP HTTP/gRPC 接收 Metrics、Logs、Traces | 已实现 |
| `hostmetricsreceiver` | 主动采集 CPU、内存、磁盘、文件系统、网络、负载、进程指标 | 已实现 |
| `prometheusreceiver` | 主动抓取受管 Prometheus/OpenMetrics 端点 | 已实现 |
| `filelogreceiver` | 主动采集本地策略批准的日志文件并处理轮转 | 已实现 |

### 3.2 Processor

| 组件 | 最终用途 | 状态 |
| --- | --- | --- |
| `memorylimiterprocessor` | 有界内存和快速拒绝 | 已实现 |
| `batchprocessor` | 三信号有界批处理 | 已实现 |
| `resourceprocessor` | 写入 HertzBeat Collector/环境等固定资源属性 | 已实现 |
| `resourcedetectionprocessor` | 检测 host、OS、process、container 和获准的云环境资源 | 已实现 |
| `attributesprocessor` | 删除禁止属性并补充固定低基数属性 | 已实现 |
| `filterprocessor` | 使用产品预置规则过滤健康探测等明确噪声；不开放任意远程 OTTL | 已实现 |

### 3.3 Exporter、Extension 和 Provider

| 组件 | 最终用途 | 状态 |
| --- | --- | --- |
| `otlphttpexporter` | 直接发送 HertzBeat OTLP HTTP 接口 | 已实现 |
| `filestorage` | 日志 offset 和三信号持久发送队列 | 已实现 |
| `healthcheckextension` | Java Supervisor 的本地健康判断 | 已实现 |
| `bearertokenauthextension` | 非 loopback OTLP Gateway 模式的入站认证 | 已实现 |
| `envprovider` / `fileprovider` / `yamlprovider` | 读取 Java 生成配置和环境 secret | 已实现 |

### 3.4 自动埋点

自动埋点不是 Collector Contrib Receiver，但属于完整交付范围：

| 能力 | 实现方式 | 状态 |
| --- | --- | --- |
| Java 应用 Trace | 随包提供官方 OpenTelemetry Java Agent | 待实现 |
| JVM Runtime Metrics | 官方 Java Agent runtime instrumentation | 待实现 |
| 日志 Trace/Span 关联 | Java Agent 注入日志上下文，日志由 File Log 或 OTLP Logs 进入 | 待实现 |
| 其他语言 | 提供标准本地 OTLP 地址、Header 和 Resource 配置，不捆绑其他语言 Agent | 待实现文档和 smoke |

不得通过伪造 Span 或把普通日志推断成 Trace 来满足“三信号”。链路必须来自真实应用执行或标准 OTLP 上游。

## 4. 明确不在本次交付范围

以下能力不进入本计划，也不能在实现过程中顺手加入：

- 完整 Contrib Distribution；
- 任意 Raw OpenTelemetry YAML；
- 自研 OTLP Receiver、Exporter、队列、存储或日志 tail；
- Java 中转遥测数据；
- JNI、JNA、cgo 或 fork OpenTelemetry Collector Core；
- 自动扫描并注入任意本机进程；
- 捆绑 Python、Node.js、.NET 和 Go 自动埋点发行物；
- 边缘 Tail Sampling、Span Metrics 和 Service Graph；这些需要全局 Trace 视角，属于 HertzBeat Server；
- Kubernetes 全家桶、Docker Stats、云厂商、数据库和中间件 Contrib Receiver；现有 HertzBeat Java Agentless 能力继续负责这些目标，独立需求另行评审；
- OpAMP；Manager 到 Java Collector 的现有控制通道继续作为唯一控制面；
- 自定义 Go control extension、热重载和 Runtime 在线升级；
- pprof、zPages 等默认生产诊断端口；
- 远程下发任意绝对日志路径、明文 Token 或证书私钥。

## 5. 固定里程碑

### M1：服务端 Desired Config 和安全切换

状态：**已完成**（`353aeadcd`）

交付内容：

- Server 持久化版本化 `ManagedOtelRuntimeConfig`；
- 复用现有 Collector 心跳响应下发，不增加新协议和消息类型；
- Collector 只接受严格递增 revision；
- Java 渲染与随包 Runtime 版本匹配的 YAML；
- 新配置先生成 candidate、实际 Runtime validate，再原子激活；
- validate 失败不停止当前 Runtime；
- readiness 失败只回滚一次 last-known-good；
- 配置存储或解析失败不影响普通 Collector 心跳和 Agentless 任务；
- 管理 API 支持查询和更新语义配置；
- H2、MySQL、PostgreSQL 迁移齐全。

完成门禁：

- Manager 配置服务、API、心跳新旧版本兼容测试；
- Collector 下发解析、revision、candidate/LKG 和进程切换测试；
- Java 25 Checkstyle、Spring Boot 4 AOT；
- `git diff --check`。

### M2：资源识别、归属和固定数据治理

状态：**已完成**（`652f2a836`）

交付内容：

- 加入 `resourcedetectionprocessor`、`attributesprocessor`、`filterprocessor`；
- 检测 host、OS、process、container；云环境 detector 仅在显式启用时运行；
- 统一三信号上的 Collector ID、runtime version、service/environment 属性；
- 明确用户属性、检测属性和 HertzBeat 固定属性的覆盖顺序；
- 过滤规则使用产品枚举，不接受任意 OTTL；
- 删除认证 Header、Token、cookie 等禁止属性；
- 高基数属性不自动提升为资源维度；
- 三信号保持相同的资源归属语义。

完成门禁：

- 三信号资源属性一致性测试；
- 属性覆盖、脱敏、过滤和错误配置测试；
- OCB validate 和真实 Runtime export smoke；
- 资源识别关闭时无额外云 metadata 请求。

### M3：主动指标与日志采集闭环

状态：**已完成**（`f27b2f184`）

交付内容：

- Host Metrics 支持采集间隔和 scraper 白名单；
- Prometheus 支持最多 32 个受管端点、HTTPS、抓取间隔、超时和静态 Header secret 引用；
- File Log 只使用本机管理员定义的 path profile；
- realpath、符号链接逃逸、deny path、glob 数、文件数、单行大小和读取速率均有上限；
- 日志默认 `start_at: end`，轮转和 copytruncate 行为明确；
- 文件 offset 和 exporter queue 共用 owner-only storage；
- Manager 展示 source 的 desired、active、rejected 状态及最后错误；
- 删除或修改 source 后不会留下失效 pipeline。

完成门禁：

- Linux/macOS/Windows 路径策略单元测试；
- Prometheus 超时、TLS、错误响应和高基数样本测试；
- File Log 轮转、截断、重启 offset、拒绝敏感路径测试；
- Host Metrics、Prometheus、File Log 同时运行的真实 Runtime 测试。

### M4：安全 OTLP 接收和 Gateway 模式

状态：**已完成**（`323f34b83`，许可证制品修复 `4eab2fa3e`）

交付内容：

- Agent 模式默认只监听 `127.0.0.1:4317/4318`；
- HTTP/gRPC 三信号、Protobuf/JSON 协议覆盖；
- 单请求大小、并发、队列和超时有界；
- Gateway 模式必须显式开启，非 loopback 监听必须配置 TLS；
- Gateway 模式加入官方 Bearer Token Auth，可选 mTLS；
- 认证 secret 只通过环境或本地 secret 文件传递；
- 认证失败、非法 payload、超限分别返回明确协议错误；
- 入站流量与主动采集共享总资源预算，不能互相饿死。

完成门禁：

- OTLP HTTP JSON/Protobuf 和 gRPC 三信号真实客户端测试；
- 无鉴权、错误 Token、过期/轮换 Token、TLS 和 mTLS 测试；
- 4 MiB 边界、并发拒绝和停止接收时的优雅排空测试；
- 默认配置确认没有公网监听。

### M5：随包 Java 自动埋点

状态：**进行中**

交付内容：

- 固定并审核官方 OpenTelemetry Java Agent 版本；
- Agent 作为独立可选制品放入安装包，不进入 Native Java Collector 可达闭包；
- 提供生成器输出 `-javaagent`、OTLP endpoint、protocol、resource attributes 和日志关联参数；
- Agent 默认发送到本机 Hybrid Collector，不直接绕过 Collector；
- 支持用户显式启用/禁用 instrumentation；
- 不自动修改用户启动脚本，不 attach 任意运行中 JVM；
- 提供 Spring Boot、普通 JAR 和容器三种可复制启动方式；
- File Log 与 Agent 注入的 trace/span 字段能够关联；
- Agent 缺失、版本不兼容或端口不可用时给出明确诊断。

完成门禁：

- 一个真实 Java 示例应用产生 HTTP、数据库、异常和异步 Span；
- 同一应用产生 JVM 指标、关联日志和 Trace；
- HertzBeat Server 可查询三信号并按 traceId 跳转；
- Agent 关闭时应用行为不受 Collector 影响；
- Agent LICENSE、NOTICE、SBOM 和漏洞扫描通过。

### M6：运行状态、内部遥测和故障诊断

状态：**待实现**

交付内容：

- Java 心跳报告 desired revision、active revision、进程状态、PID、重启次数和最后错误；
- Go Runtime internal telemetry 直接上报 HertzBeat Server；
- 展示 accepted、refused、sent、failed、queue size/capacity 和 file consumer 状态；
- 区分配置错误、端口冲突、后端不可用、认证失败、队列满、进程崩溃；
- 后端不可用只触发 exporter retry/queue，不重启 Runtime；
- Java Agentless 采集在 Go Runtime 降级或失败时继续工作；
- 日志中不打印 Token、Authorization、完整用户日志正文或证书内容。

完成门禁：

- 每类故障的状态收敛测试；
- 心跳负载和 Server 查询不会携带遥测正文；
- Runtime crash/restart circuit 和人工恢复测试；
- 缺数据、不可用和真实零值能够区分。

### M7：容量、背压和长期故障恢复

状态：**待实现**

交付内容：

- 三信号共享内存上限和独立 pipeline 可观测性；
- exporter 磁盘队列固定容量、owner-only 权限和明确满盘行为；
- HertzBeat/Greptime 暂停后不丢已确认进入持久队列的数据；
- Runtime 被强杀、Java 被重启、机器重启后均能恢复队列和日志 offset；
- 无无限重试线程、无限队列或后台泄漏；
- 停止压力后自动恢复，不要求重启 Greptime 或 Collector；
- 记录真实 CPU、RSS、磁盘、吞吐和延迟，不伪造容量结论。

完成门禁：

- Metrics、Logs、Traces 独立和混合负载；
- 后端断开、恢复、慢响应、429、503 和连接重置；
- 队列满、磁盘满和损坏存储；
- 24 小时 soak；
- 停压恢复与无残留长任务证明。

### M8：Java Native、多平台发行和真实端到端验收

状态：**待最终复验；基础打包已实现**

交付内容：

- Java 25 + Spring Boot 4 Collector；
- macOS/Linux arm64/amd64、Windows amd64 Native Java 制品；
- 对应平台的 no-CGO Go Runtime；
- Java Agent 作为可选独立文件随包发布；
- 单服务启动、停止、信号转发、子进程清理和崩溃恢复；
- Docker Native 镜像非 root 运行且无 JVM；
- 组件 inventory、LICENSE、NOTICE、SBOM、漏洞报告、校验和与可复现构建；
- 真实 HertzBeat Server + GreptimeDB 完成用户闭环。

最终浏览器/API 闭环：

1. 注册一个 Collector；
2. 配置主机指标、Prometheus 和日志 profile；
3. 生成 Java Agent 启动参数并启动真实应用；
4. 查询主动采集指标和日志；
5. 查询应用 Trace、Span 和事件；
6. 日志按 traceId 跳转 Trace；
7. Trace 查看同时间窗口日志和指标；
8. 断开 HertzBeat/Greptime 后恢复，积压自动发送；
9. 强杀 Go Runtime，Java Agentless 不停且 Go 自动恢复；
10. 重启整个 Collector，offset、队列、配置 revision 和身份保持正确。

最终发布门禁：

- 全部聚焦单测、集成测试和真实 Runtime 测试；
- Java 25 Checkstyle、Spring Boot 4 AOT、Native Image；
- 五个平台布局与启动合同；
- OCB inventory、license、SBOM、`govulncheck`、校验和和可复现构建；
- HertzBeat/Greptime 三信号真实写入和查询；
- 24 小时 soak 和故障恢复；
- `git diff --check`、无硬编码 CJK、无本地产物进入提交；
- 人工代码评审确认没有重复抽象、自研替代官方组件或未使用代码。

## 6. 实施顺序和停止规则

固定顺序为 `M1 → M2 → M3 → M4 → M5 → M6 → M7 → M8`，不得跳过失败门禁并继续。

每个里程碑执行循环：

1. 写最小失败合同；
2. 做满足合同的最小实现；
3. 运行聚焦验证；
4. 修复全部失败；
5. 运行该里程碑的真实 Runtime 或端到端证明；
6. 更新本文件状态和 `progress.md`；
7. 只提交本里程碑相关源码、测试和文档；
8. 进入下一里程碑。

只有以下情况可以暂停并询问维护者：

- 需要改变本文件的固定交付范围；
- 需要新增官方组件或自研组件；
- 出现许可证、安全、跨平台或后端契约阻塞；
- 需要外部 CI、签名或发布权限；
- 真实数据证明原验收指标不可实现，需要维护者决定取舍。

## 7. 完成定义

以下条件必须同时成立：

- 主动采集主机指标、Prometheus 指标和批准的文件日志；
- 随包 Java Agent 从真实应用采集 Trace、JVM 指标并关联日志；
- 安全接收并转发外部 OTLP 三信号；
- 三信号拥有一致资源身份和 HertzBeat Collector 归属；
- Server Desired Config 能安全下发、验证、切换和回滚；
- 后端中断、进程崩溃和机器重启后能够恢复；
- Java Agentless 采集不依赖 Go Runtime 健康；
- JVM 和 Native Collector 均可运行，发布包覆盖目标平台；
- 真实 HertzBeat + Greptime 完成三信号查询与跨信号跳转；
- 所有 M1 到 M8 门禁通过；
- 代码通过人工可维护性评审，无未使用实现和临时兼容层。

未同时满足上述条件时，不得使用“Hybrid Collector 已完成”或“可正常替代 OTel Collector”作为结论。
