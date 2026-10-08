---
id: native-collector
title: 原生 Hybrid Collector
sidebar_label: 原生 Hybrid Collector
---

原生 Hybrid Collector 是针对特定平台构建的 Collector 可执行文件，并携带其托管 OTel runtime 资产。它与 HertzBeat Server 归档、OTel Java Agent 等语言 Agent 相互独立。存在原生包不代表所有 JVM 采集协议或原生平台都已验证。

## 选择并核实制品

使用由目标源码版本为准确的操作系统/架构生成的 Collector 原生归档，并记录摘要及声明平台。源码装配文件为 `script/assembly/collector/assembly-native.xml`，包含可执行文件、启动器、配置、许可证、平台 runtime、清单及 SBOM/校验文件。文件名本身不是来源证明。

在源码检出目录，可使用现有包契约检查指定归档：

```shell
sh script/ci/verify-hybrid-collector-native-package.sh "$COLLECTOR_ARCHIVE" "$COLLECTOR_PLATFORM"
```

将两个变量设置为实际制品和平台名（例如 `linux-arm64`）。这只检查包内容，不运行或认证目标部署。构建原生代码需要仓库要求的 Java 25/GraalVM 及原生构建依赖；运行已验证的原生可执行文件不要求目标机器安装 JVM。不要复用其他架构的二进制。

## 明确配置后再启动

从包内 `config/application.yml` 开始，设置唯一的 `IDENTITY`、准确的 `MANAGER_HOST` 及管理端集群端口（`MANAGER_PORT`，通常为 `1158`）。Server 的公共 HTTP 接口与 Collector 集群接口用途不同。Agentless 目标必须能从该采集器访问。

托管 OTel runtime 需主动启用（`HERTZBEAT_OTEL_RUNTIME_ENABLED` 默认 false）。端点、令牌和采集器身份应遵循匹配的 Collector 接入配置及生成说明。保留数据目录中的身份、队列和偏移。语言 Agent/SDK 需另外配置，包内不附带它们。

在 Unix 系统中，首次启动可在解压目录以前台方式检查：

```shell
./bin/foreground.sh
```

该启动器直接执行包内原生文件，并转发额外的应用参数。请检查日志、注册状态和真实当前样本。`bin/startup.sh` 是后台辅助脚本：存在 `lsof` 时，仅在所启动 PID 监听脚本固定端口 `1159` 后报告监听成功；没有 `lsof` 时，只报告进程已启动且**就绪状态未验证**。进程存活或 TCP 监听都不能证明遥测已进入存储。

## Linux 服务生命周期与状态

Linux 原生包包含 `service/install-systemd.sh` 和 `service/README-systemd.md`。安装或升级时，应遵循该版本包内说明。目录布局将 `/opt/hertzbeat-collector` 下的发行内容、`/etc/hertzbeat` 下的受保护配置、`/var/lib/hertzbeat-collector` 下的持久状态，以及 `/var/log/hertzbeat-collector` 下的日志分离。凭据应放在受保护的配置/环境文件中，而不是命令参数中。

安装器提供 `install`、`upgrade`、`uninstall` 和显式的 `purge` 操作。卸载保留状态；purge 会删除状态。升级前备份配置和状态，并验证恢复后的身份及样本连续性，不要仅凭脚本退出码认定回滚成功。

## 验收边界

2.0 alpha 本地发行证明实际覆盖了 H2/MySQL/PostgreSQL 上的 Server、Agentless MySQL 和官方 OTel Java Agent，没有建立完整的原生 Collector 操作系统/协议矩阵、群组规模能力或 SLO。将其视为已验证来源前，请用真实信号验证所选平台、托管 runtime 生命周期、认证失败、停止上报和恢复。Windows 包使用随附的批处理启动器；Unix/systemd 结果不能证明 Windows 等价。

独立的 Server 配置见 [Server 安装](./package-deploy.md)，未来群组工作见[采集器治理提案](../roadmap/future-collector-fleet-governance.md)。
