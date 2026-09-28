---
title: Apache HertzBeat™ 1.9.0 版本发布公告
author: Apache HertzBeat Community
author_title: Apache HertzBeat 社区
author_url: https://github.com/apache/hertzbeat
tags: [releases]
description: Apache HertzBeat 1.9.0 带来 Native 采集器、SOP 驱动的 AI 工作流、Apache Doris 时序存储与虚拟线程，同时包含需要按指南操作的破坏性变更。
keywords: [开源监控系统, 告警系统, HertzBeat, 发布, v1.9.0, Apache]
cover_headline: Apache HertzBeat 1.9.0
---

亲爱的社区成员们，

我们高兴地宣布 Apache HertzBeat™ 1.9.0 正式发布！本版本共合并 228 个 Pull Request，来自 37 位贡献者，其中 23 位是首次为 HertzBeat 提交代码。

这是一个内容密集的版本：Native 采集器让采集端摆脱 JVM，SOP 驱动的 AI 工作流把对话式运维推进了一大步，时序存储侧新增 Apache Doris 与 MySQL R2DBC 引擎。与此同时，**1.9.0 包含多项破坏性变更**，升级前请务必阅读升级指南。

## 下载和文档

- **Apache HertzBeat™ 1.9.0 下载链接**: [https://hertzbeat.apache.org/zh-cn/docs/download](https://hertzbeat.apache.org/zh-cn/docs/download)
- **Apache HertzBeat™ 文档**: [https://hertzbeat.apache.org/zh-cn/docs/](https://hertzbeat.apache.org/zh-cn/docs/)
- **发布说明**: [https://github.com/apache/hertzbeat/releases/tag/v1.9.0](https://github.com/apache/hertzbeat/releases/tag/v1.9.0)
- **升级指南**: [如何升级到 1.9.0](https://hertzbeat.apache.org/zh-cn/docs/start/1.9.0-update)

## ⚠️ 升级前必读

:::danger 本版本包含破坏性变更

1.9.0 **不是**可以直接替换 1.8.x jar 或镜像的平滑升级版本。以下方面都发生了不兼容变化：

- **运行环境**：最低要求提升到 Java 25
- **Manager 配置**：JPA 实现由 EclipseLink 切换为 Hibernate，`application.yml` 需要调整
- **权限规则**：`sureness.yml` 规则有变更，自定义过该文件的部署需要合并
- **采集器凭据**：AES 密文格式变更，**必须先把所有采集器升级到 1.9.0，再升级主服务**
- **GreptimeDB**：表结构调整，`hertzbeat_logs` 的 `body` 列由 JSON 改为 STRING，自监控表改名
- **告警语义**：周期性阈值规则、实时阈值规则的空值语义、周期性告警静默、告警分组收敛均有调整
- **已移除**：Push 式监控、模板市场

完整的影响面判断、迁移步骤和回滚方案请阅读 [如何升级到 1.9.0](https://hertzbeat.apache.org/zh-cn/docs/start/1.9.0-update)。

:::

## 🚀 主要更新

### 采集器

- **Native 采集器** (#4066)：基于 GraalVM Native Image 构建，提供 `linux-amd64`、`linux-arm64`、`windows-amd64` 三个平台的安装包，启动更快、内存占用更低。代价是安装包按平台区分，且不支持运行时通过 `ext-lib` 加载 JDBC 驱动，详见 [Native 采集器指南](https://hertzbeat.apache.org/zh-cn/docs/start/native-collector)
- **虚拟线程**：阻塞型线程池迁移到虚拟线程 (#4062)
- **时间表达式**：HTTP 采集的 URL 与请求头支持时间表达式解析 (#4334)
- **稳定性修复**：遵循 XML 响应声明的字符集 (#4167)、Statement 创建失败时正确关闭 JDBC 连接 (#4184)

### AI 能力

- **SOP 驱动的 AI 工作流** (#4016)：引入 skills、计划任务调度与国际化支持
- **Ollama 监控** (#4064) 与 **LM Studio 监控** (#4082)：覆盖本地 LLM 运行时
- **Spring AI 对齐**：替换已废弃的 Tool API (#4206)，改用 `MethodToolCallbackProvider` (#4234)
- **AI 创建监控**：优化交互流程 (#3922)

### 存储与查询

- **Apache Doris** (#4031)：可同时作为指标与日志的时序存储
- **MySQL R2DBC 查询引擎** (#4074)
- **VictoriaMetrics 集群** 查询执行器 (#4103)
- **GreptimeDB**：初始化阶段预建 `hertzbeat_logs` 表 (#4231)，SQL 请求体改为 form-urlencoded (#4223)
- **优雅降级**：存储不支持日志/链路/指标时，可观测性控制台不再报错而是降级展示 (#4233)

### 监控能力

- **etcd 监控** (#4306)
- **数据库账户指标**：SQL Server 账户过期 (#4141)、PostgreSQL 数据库账户 (#4131)
- **Nacos 服务发现**：支持鉴权与过滤参数 (#4099)，Nacos 客户端升级到 3.1.1 (#4061)
- **监控定义**：支持在线编辑定义并简化指标选择 (#4158)
- **指标数据表分页** (#4309)

### 告警与通知

- **ntfy** 新增为告警通知渠道 (#4132)
- **阿里云监控** Webhook 支持 (#4296)
- **通知模板预览** (#4338)
- **告警导出 Excel** (#4332)
- **邮件服务器** 新增 SSL 证书校验开关 (#4327)
- **安全加固**：REST API 响应中脱敏通知接收人的密钥字段 (#4220)，并拒绝对不存在的接收人提交脱敏后的编辑 (#4225)

### 状态页

- 组件历史支持配置时间范围 (#4222)
- 历史数据展示延长至 365 天 (#4333)

### 安全与依赖

- **API Token 管理** (#4080)
- **grpc-java** 由 1.56.1 升级到 1.76.3 (#4211)
- **许可证物料**：`material/licenses` 与实际打包的依赖重新对齐 (#4336)

### 界面与国际化

- **韩语** 国际化支持 (#4197)
- 登录页 (#4044)、监控列表页 (#4138)、状态页设置 (#4139)、模板编辑器 (#4051) 样式改进
- 仪表盘隐藏空分类卡片并补充空状态 (#4242)

## 🌟 社区成长

本版本欢迎 23 位新贡献者加入 Apache HertzBeat 社区：

- @turanalmammadov
- @miantalha45
- @04cb
- @Darshan-paul
- @brettgervasoni
- @zhehenlu
- @zhusaidong
- @neon-hippo
- @abhyudayareddy
- @wilmerdooley
- @wy471x
- @Zmjjeff7
- @hutiefang76
- @orangeCatDeveloper
- @ZhouYinLong-lab
- @moduvoice
- @hengyuss
- @paultanay
- @fas89
- @Bhavya-Sonigra
- @DSingh0304
- @nikhiln64
- @Prabal864

## 📊 统计数据

本版本包括：

- **228 个拉取请求** 合并
- **37 位贡献者** 参与，其中 **23 位是新面孔**
- **100+ 个缺陷修复**
- **30+ 项新功能**
- **20+ 项改进与重构**

## 🔄 升级说明

:::caution

请先完整阅读 [如何升级到 1.9.0](https://hertzbeat.apache.org/zh-cn/docs/start/1.9.0-update)，确认影响面并做好备份，再执行下面的步骤。本指南仅适用于从正式发布的 1.8.x 升级；如果你在使用 1.6.x / 1.7.x，请先逐级升级到 1.8.x。

:::

### Docker 部署

```bash
# 停止并删除现有容器
docker stop hertzbeat
docker rm hertzbeat

# 拉取新版本
docker pull apache/hertzbeat:1.9.0

# 运行新容器
docker run -d -p 1157:1157 -p 1158:1158 --name hertzbeat apache/hertzbeat:1.9.0
```

注意顺序：1.9.0 更改了监控凭据的 AES 密文格式，1.8.x 采集器无法解密 1.9.0 主服务下发的密码，而握手过程不做版本校验，错配时只会在采集器日志里报 AES 解密错误，监控侧表现为目标服务认证失败，很容易被误判成密码填错。请先把所有采集器升级到 1.9.0（1.9.0 采集器能正常解密 1.8.x 格式的密文，接旧主服务没有问题），再升级主服务。

### 安装包部署

1. 确认运行环境已具备 **Java 25**
2. 从 [下载页面](https://hertzbeat.apache.org/zh-cn/docs/download) 下载 1.9.0 安装包
3. 备份现有配置与数据库
4. 按升级指南调整 `application.yml` 与 `sureness.yml`
5. 解压新包并替换安装，重启 HertzBeat 服务

如果你不需要 `ext-lib` 外部 JDBC 驱动，可以改用 Native 采集器安装包，启动更快、内存更省。

### Kubernetes / Helm 部署

更新 Helm Chart 使用新版本：

```yaml
image:
  tag: "1.9.0"
```

## 🔮 未来展望

Apache HertzBeat 社区正在推进的方向包括：

- 继续打磨 Native 采集器与虚拟线程带来的性能红利
- 深化 AI 与 SOP 工作流在故障处置中的落地
- 扩展时序与日志存储的后端选择
- 持续完善可观测性控制台的体验

## 🙏 致谢

感谢每一位让这个版本成为可能的社区成员：

- 提交拉取请求的所有代码贡献者
- 报告问题、提供复现和反馈的使用者
- 文档编写者与翻译者
- 参与候选版本验证和投票的 PMC 成员与 Committer
- Apache 软件基金会的持续支持

## 📞 参与方式

- **GitHub**: [https://github.com/apache/hertzbeat](https://github.com/apache/hertzbeat)
- **邮件列表**: [https://hertzbeat.apache.org/zh-cn/docs/community/mailing_lists](https://hertzbeat.apache.org/zh-cn/docs/community/mailing_lists)
- **Discord**: [https://discord.gg/Fb6M73htGr](https://discord.gg/Fb6M73htGr)
- **文档**: [https://hertzbeat.apache.org/zh-cn/docs/](https://hertzbeat.apache.org/zh-cn/docs/)

## 📋 完整变更日志

完整的变更列表请参考 [完整变更日志](https://github.com/apache/hertzbeat/compare/1.8.0...v1.9.0)。

---

**立即下载 Apache HertzBeat™ 1.9.0，体验更轻量的采集端与更聪明的告警！**

*Apache HertzBeat、Apache 羽毛徽标和 HertzBeat 名称是 The Apache Software Foundation 的商标。*
