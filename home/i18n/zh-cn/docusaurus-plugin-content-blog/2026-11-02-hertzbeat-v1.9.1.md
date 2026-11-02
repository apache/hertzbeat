---
title: Apache HertzBeat™ 1.9.1 版本发布公告
author: Apache HertzBeat Community
author_title: Apache HertzBeat 社区
author_url: https://github.com/apache/hertzbeat
tags: [releases]
description: Apache HertzBeat 1.9.1 是维护版本，修复采集、凭据和管理权限问题。升级前请阅读升级指南。
keywords: [开源监控系统, 告警系统, HertzBeat, 发布, v1.9.1, Apache]
cover_headline: Apache HertzBeat 1.9.1
---

亲爱的社区成员们，

我们高兴地宣布 Apache HertzBeat™ 1.9.1 发布！这是基于 1.9.0 的维护版本，修复了采集、监控管理、凭据和状态历史等问题。由于管理访问权限发生变化，升级前请先阅读升级指南。

## 下载和文档

- **下载**：[Apache HertzBeat 1.9.1](/docs/download)
- **文档**：[Apache HertzBeat 文档](https://hertzbeat.apache.org/zh-cn/docs/)
- **升级指南**：[如何升级到 1.9.1](/docs/start/1.9.1-update)
- **源码变更**：[比较 1.9.0 与 1.9.1 发行源码](https://github.com/apache/hertzbeat/compare/v1.9.0...0fe1c4c4e09cd2b08fee38969961648092d6b1cf)

## ⚠️ 升级前必读

:::caution 1.9.1 管理访问权限变更

只有具有精确 `admin` 角色的账号才能登录管理界面和访问管理 API。随包账号来源包含初始 `admin` 账号，请修改其默认密码。原有 `user`、`guest` 和自定义非管理员账号不会被自动提权或删除。请盘点账号与自动化凭据，仅为可信的运维人员手动授予 `admin`。机器上报入口保留文档所述的认证规则；不要未经权限评估就将机器凭据替换为 admin token。

升级前请备份数据库和部署配置，包括 `sureness.yml` 与 `common.secret`，并演练恢复。保留原有 `common.secret`，将新配置与现有部署设置合并。1.9.0 与 1.9.1 发行源码之间没有新增 SQL 迁移文件，但凭据迁移可能更新已有数据。

随包认证配置启用 Basic 和 JWT；Digest 默认关闭，如有需要须显式启用。完整步骤和回滚方式请参阅[升级指南](/docs/start/1.9.1-update)。

:::

## 🚀 主要更新

### 采集与监控

- **采集恢复**：指标采集超时后安全恢复；远程替换采集任务失败时保留原任务。
- **监控操作**：修复大量选中监控时的批量暂停，以及监控详情页的空指标行处理。
- **状态历史**：每日状态聚合时保留已有历史记录。

### 账号与凭据

- **管理访问**：管理面要求 `admin`，公开和机器上报入口继续遵循文档所述的策略。
- **凭据编辑**：修复监控编辑时的掩码凭据处理；更改目标时请按要求重新提供凭据。
- **配置导入导出**：监控配置的导入和导出需要管理员权限。导出文件可能包含敏感信息；升级后请验证导入与采集。

## 🔄 升级说明

1. 阅读 [1.9.1 升级指南](/docs/start/1.9.1-update)，一致性备份数据库、配置、自定义模板和部署文件。
2. 审查管理员与自动化 token，将发行包规则合并到自定义配置，并保留现有密钥。
3. 使用同一发行版的 1.9.1 制品升级管理端和独立部署的采集器。恢复服务前验证管理员访问、代表性监控、告警通知和采集器重连。
4. 如果检查失败，请按指南回滚并恢复相应的升级前备份。

## 🙏 致谢

感谢所有参与代码贡献、问题反馈、变更审查、文档编写和候选版本验证的社区成员。

## 📞 参与方式

- **GitHub**：[https://github.com/apache/hertzbeat](https://github.com/apache/hertzbeat)
- **邮件列表**：[https://hertzbeat.apache.org/zh-cn/docs/community/mailing_lists](https://hertzbeat.apache.org/zh-cn/docs/community/mailing_lists)
- **Discord**：[https://discord.gg/Fb6M73htGr](https://discord.gg/Fb6M73htGr)

---

*Apache HertzBeat、Apache 羽毛徽标和 HertzBeat 名称是 The Apache Software Foundation 的商标。*
