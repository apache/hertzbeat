---
title: Apache HertzBeat™ 1.8.0 版本发布公告
author: Apache HertzBeat Community
author_title: Apache HertzBeat 社区
author_url: https://github.com/apache/hertzbeat
tags: [开源, 发布, v1.8.0]
keywords: [开源监控系统, 告警系统, HertzBeat, 发布, v1.8.0, Apache]
---

亲爱的社区成员们，

我们激动地宣布 Apache HertzBeat™ 1.8.0 正式发布！这个重要版本带来了重大增强，包括 AI 驱动功能、扩展的监控能力、性能改进和更强大的社区贡献。

## 下载和文档

- **Apache HertzBeat™ 1.8.0 下载链接**: [https://hertzbeat.apache.org/zh-cn/docs/download](https://hertzbeat.apache.org/zh-cn/docs/download)
- **Apache HertzBeat™ 文档**: [https://hertzbeat.apache.org/zh-cn/docs/](https://hertzbeat.apache.org/zh-cn/docs/)
- **发布说明**: [https://github.com/apache/hertzbeat/releases/tag/1.8.0](https://github.com/apache/hertzbeat/releases/tag/1.8.0)

## 🚀 主要更新

### 新功能和增强

#### AI 驱动监控和聊天界面

- **GSOC 聊天界面**: 实现了全面的聊天界面，支持对话管理和 OpenAI 聊天客户端 (#3679)
- **跨服务工具**: 为所有监控服务添加了必要的 AI 驱动工具 (#3722)
- **MCP 服务器**: 实现模型上下文协议服务器，安全运行脚本和命令 (#3547)

#### 扩展监控支持

- **QuestDB 集成**: 添加 QuestDB 作为时序数据库存储选项 (#3731)
- **Dell iDRAC 监控**: 为 Dell iDRAC 服务器监控添加配置文件 (#3763)
- **Apollo 配置中心**: 添加 Apollo 配置中心监控支持 (#3768)
- **Jenkins 监控**: 添加全面的 Jenkins 监控功能 (#3774)
- **DNS 记录类型**: 增强 DNS 监控，支持更多记录类型 (#3799)

#### 增强用户体验

- **仪表板优化**: 完全重新设计仪表板页面，适配新主题 (#3730)
- **指标收藏**: 添加监控中心指标收藏功能，快速访问 (#3735)
- **标签选择器组件**: 实现优化的标签选择器组件，改善标签管理 (#3762)
- **RISC-V 支持**: 添加 RISC-V 架构支持，修改 Dockerfile (#3713)

#### 日志监控能力

- **OSPP 日志监控**: 实现全面的日志监控功能，支持高级解析和告警 (#3673)

### 性能改进

#### Prometheus 集成

- **流式解析**: 增强 Prometheus 流式解析，支持 CRLF (#3745)
- **解析优化**: 多轮 Prometheus 流式解析优化 (#3752, #3761)
- **Gretimedb 优化**: 优化 Gretimedb 时序统计 (#3776)

#### 系统性能

- **SSE 异常处理**: 改进服务器发送事件异常处理 (#3775)
- **阈值规则**: 增强阈值规则操作和表达式日志输出 (#3780)
- **查询参数处理**: 修复搜索参数为浮点数时的 Long.parseLong() 错误 (#3483)

### 错误修复和稳定性

#### 核心系统修复

- **默认路径白名单**: 修复默认路径不匹配白名单的问题 (#3740)
- **Webhook URL 参数**: 修复缺失的 Webhook URL 查询参数 (#3779)
- **服务发现**: 修复服务发现主机字段 NullPointerException (#3767)
- **数据库迁移**: 移除 v174 并添加 v180 Flyway 脚本 (#3787)

#### 配置和部署

- **AI 配置同步**: 修复 Docker Compose 的 AI 相关配置同步 (#3751)
- **CNCF 链接更新**: 更新 CNCF 链接到当前位置 (#3746)

### 文档和国际化

#### 增强文档

- **RISC-V 文档**: 添加 RISC-V 相关帮助文档 (#3712)
- **日语国际化**: 为 iDRAC 监控添加日语国际化支持 (#3766)
- **发布文档**: 更新发布流程文档，添加 1.7.3 发布说明 (#3749)
- **贡献者更新**: 定期更新贡献者文档 (#3759, #3783)

#### UI/UX 改进

- **样式问题**: 解决应用程序中的各种样式问题 (#3734)
- **Apache 品牌标识**: 替换为新的 ASF 品牌标识 (#3770)
- **本地化**: 改进 en-US.json 的本地化 (#3800)

## 🌟 社区成长

### 新贡献者

我们激动地欢迎 16 位新贡献者加入 Apache HertzBeat 社区：

- @cxhello
- @yexuanyang
- @mengnankkkk
- @jl15988
- @dedyks
- @pentium100
- @AlbertYang0801
- @warrobe
- @Jetiaime
- @P-Peaceful
- @zhaoyangplus
- @KOYR
- @Lathika226
- @Sahil-Shadwal
- @Prakash1185
- @BhanuNidumolu

### 项目贡献

- **GSOC (谷歌编程之夏)**: 在聊天界面和 AI 功能方面做出重大贡献
- **OSPP (开源软件供应链点亮计划)**: 在 RISC-V 支持、MCP 服务器和日志监控方面做出重大贡献

## 📊 统计数据

本版本包括：

- **40+ 个拉取请求** 合并
- **16 位新贡献者** 加入社区
- **5 个主要功能** 添加
- **20+ 个错误修复** 解决
- **多个性能改进**

## 🔄 升级说明

### 从 v1.7.x 升级到 v1.8.0

#### Docker 部署

```bash
# 停止现有容器
docker stop hertzbeat

# 删除旧容器
docker rm hertzbeat

# 拉取新版本
docker pull apache/hertzbeat:1.8.0

# 运行新容器
docker run -d -p 1157:1157 -p 1158:1158 --name hertzbeat apache/hertzbeat:1.8.0
```

#### 包部署

1. 从 [下载页面](https://hertzbeat.apache.org/zh-cn/docs/download) 下载 v1.8.0 包
2. 备份现有配置
3. 解压新包并替换安装
4. 如需要，更新配置
5. 重启 HertzBeat 服务

#### Kubernetes/Helm 部署

更新 Helm 图表使用新版本：

```yaml
image:
  tag: "1.8.0"
```

## 🚨 重要说明

- **数据库迁移**: 本版本包括数据库架构更改。升级前确保正确备份
- **配置更改**: 某些 AI 相关配置可能需要更新
- **破坏性更改**: 查看变更日志了解可能影响部署的破坏性更改

## 🔮 未来展望

Apache HertzBeat 社区已经在开发未来版本，包括：

- 增强的 AI 功能
- 更多监控集成
- 性能优化
- 改进用户体验

## 🙏 致谢

我们向所有使此版本成为可能的贡献者表示衷心感谢：

- 提交拉取请求的所有代码贡献者
- 报告问题和提供反馈的社区成员
- 文档编写者和翻译者
- 帮助确保质量的测试者
- Apache 软件基金会的持续支持

## 📞 参与方式

- **GitHub**: [https://github.com/apache/hertzbeat](https://github.com/apache/hertzbeat)
- **邮件列表**: [https://hertzbeat.apache.org/docs/community/mailing_lists](https://hertzbeat.apache.org/docs/community/mailing_lists)
- **Discord**: [https://discord.gg/Fb6M73htGr](https://discord.gg/Fb6M73htGr)
- **文档**: [https://hertzbeat.apache.org/docs/](https://hertzbeat.apache.org/docs/)

## 📋 完整变更日志

完整的变更列表请参考 [完整变更日志](https://github.com/apache/hertzbeat/compare/v1.7.3...1.8.0)。

---

**立即下载 Apache HertzBeat™ 1.8.0，体验 AI 驱动监控的力量！**

*Apache HertzBeat、Apache 羽毛徽标和 HertzBeat 名称是 The Apache Software Foundation 的商标。*
