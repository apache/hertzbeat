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

### 采集任务更可靠

监控系统需要在采集异常后继续稳定工作。1.9.1 修复了指标采集超时后的安全恢复问题；对于 SSL 证书监控，停滞的 TLS 握手会遵守配置的超时时间。

采集任务调度也完善了几种生命周期场景：重复初始化或重连时，避免同一监控出现重复的活动任务；远程替换任务失败时保留原任务，后续可以重试；在任务重平衡期间删除监控，也不会让已删除的任务重新出现。

### 监控管理

- **组合筛选**：名称或关键词与标签条件可以同时生效，筛选发生在分页之前，不再只从当前页中查找匹配项。
- **批量操作与详情**：修复大量选中监控时的批量暂停问题，以及监控详情页空指标行的处理问题，详见 [#4458](https://github.com/apache/hertzbeat/pull/4458) 和 [#4464](https://github.com/apache/hertzbeat/pull/4464)。
- **服务发现**：删除服务发现父监控时，清理匹配的子监控及其参数，保留无关监控；发生异常时回滚操作。
- **配置导入导出**：监控配置的导入和导出需要管理员权限。导出配置可能包含敏感的加密凭据，请妥善保存和分享。

### 告警与状态历史

一组告警中，某个成员恢复而其他成员仍在触发时，告警组会继续保持触发状态。重复通知间隔内的恢复也会正常传递，同时避免重复恢复事件。告警定义支持通过 YAML 导出、导入并保留所支持的字段。

每日状态聚合会保留已有历史和计数；相关测试也覆盖了重复聚合与夏令时边界。

### 账号与凭据

管理界面和管理 API 要求账号具有精确的 `admin` 角色；公开入口和机器上报入口继续遵循各自文档所述的规则。请单独审查自动化凭据：机器上报并不一定需要管理员权限。

编辑已有监控时可以保留掩码凭据；目标发生变化时，请按提示重新提供凭据。对于已设置凭据的 Webhook、Telegram、Discord 和 ntfy 通知配置，更改相应目标需要明确重新填写凭据；目标不变时可保留掩码凭据，原本未设置的可选凭据仍可留空。

## 📦 发行包

本次提供源码包、服务端压缩包、JVM 采集器、Docker Compose，以及 Linux AMD64、Linux ARM64 和 Windows AMD64 原生采集器。请从[下载页面](/docs/download)选择适合部署环境的制品。原生采集器不能在运行时通过 `ext-lib` 加载外部 JDBC 驱动；需要这些驱动时请选择合适的 JVM 采集器。

## 🔄 升级到 1.9.1

1. **规划并备份**：阅读[升级指南](/docs/start/1.9.1-update)，保留可用于回滚的 1.9.0 制品，并对数据库做一致性备份。复制 H2 数据库前请先停止服务。同时备份 `application.yml`、`sureness.yml`、`common.secret`、证书、自定义 `define/` 和 `ext-lib/` 文件，以及部署挂载和卷。
2. **检查权限与配置**：仅为可信运维人员手动授予 `admin`，修改初始管理员密码，保留原有 `common.secret`，并将新版配置与现有设置合并。随包配置默认关闭 Digest，但挂载的旧 `sureness.yml` 可能仍然启用它，请检查实际配置。
3. **升级部署**：压缩包安装建议解压到新目录后合并配置，不要只替换 JAR；保留 1.9.1 的 `bin/` 和 `lib/` 目录。Compose 部署应保留现有挂载和卷，不要将 `docker compose down -v` 作为升级步骤。管理端和采集器使用匹配的 1.9.1 制品。
4. **恢复服务前验证**：检查管理员访问、代表性监控、告警通知和远程采集器重连，并检查相关采集网络的连通性。如需回滚，请遵循指南；恢复升级前数据库备份会丢失备份之后写入的数据。

1.9.0 与 1.9.1 发行源码之间没有新增 SQL 迁移文件，但凭据迁移可能更新已有数据库数据。请在升级前针对自己的部署演练恢复。

## 🙏 致谢

感谢所有参与代码贡献、问题反馈、变更审查、文档编写和候选版本验证的社区成员。

## 📞 参与方式

- **GitHub**：[https://github.com/apache/hertzbeat](https://github.com/apache/hertzbeat)
- **邮件列表**：[https://hertzbeat.apache.org/zh-cn/docs/community/mailing_lists](https://hertzbeat.apache.org/zh-cn/docs/community/mailing_lists)
- **Discord**：[https://discord.gg/Fb6M73htGr](https://discord.gg/Fb6M73htGr)

---

*Apache HertzBeat、Apache 羽毛徽标和 HertzBeat 名称是 The Apache Software Foundation 的商标。*
