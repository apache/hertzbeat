---
id: native-collector
title: Native 采集器指南
sidebar_label: Native 采集器
description: 说明 HertzBeat Native 采集器安装包适合什么场景、优缺点、限制和部署建议。
---

## 什么场景适合使用 Native 采集器？

当你的监控任务不依赖从 `ext-lib` 动态加载外部 JDBC 驱动时，优先考虑 Native 采集器安装包。

比较适合 Native 采集器的场景包括：

- HTTP、HTTPS、网站可用性、API 检查
- 端口可用性、Ping、SSL 证书等网络探测
- 不依赖运行时 `ext-lib` JDBC 加载的 MySQL、MariaDB、OceanBase
- SQL 查询指标不依赖运行时 `ext-lib` JDBC 加载的 TiDB
- Redis、Zookeeper、Kafka 等非 JDBC 监控类型

## 为什么选择它？

相较 JVM 采集器安装包，Native 采集器安装包通常更适合以下诉求：

- 启动更快
- 常驻内存更低
- 运行时更轻，不需要额外准备 bundled 或预装 JDK

## 它的缺点和限制是什么？

Native 采集器并不是所有 JVM 采集器场景的无损替代。

- Native 安装包是平台相关的，必须选择与你操作系统和 CPU 架构匹配的包。
- Native 采集器不支持在运行时从 `ext-lib` 目录动态加载外部 JDBC 驱动 JAR。
- 如果你的部署依赖 JVM 风格的运行时 classpath 扩展能力，仍然应该使用 JVM 采集器安装包。

## 哪些场景应该继续使用 JVM 采集器？

如果你的监控依赖外部 JDBC 驱动，请继续使用 JVM 采集器安装包，尤其包括：

- Oracle，需要 `ojdbc8`，部分场景还需要 `orai18n`
- DB2，需要 `jcc`
- 任何明确把 `mysql-connector-j` 放进 `ext-lib` 并希望继续走 JDBC 的 MySQL、MariaDB、OceanBase 场景

## 安装包命名规则

JVM 采集器安装包仍然保持跨平台：

- `apache-hertzbeat-collector-{version}-bin.tar.gz`

Native 采集器安装包按平台区分：

- Linux 或 macOS：`apache-hertzbeat-collector-native-{version}-{platform}-bin.tar.gz`
- Windows：`apache-hertzbeat-collector-native-{version}-windows-amd64-bin.zip`

例如：

- `apache-hertzbeat-collector-native-1.8.0-linux-amd64-bin.tar.gz`
- `apache-hertzbeat-collector-native-1.8.0-macos-arm64-bin.tar.gz`
- `apache-hertzbeat-collector-native-1.8.0-windows-amd64-bin.zip`

## 配置文件是否和 JVM 采集器一致？

Native 采集器安装包和 JVM 采集器安装包使用同一套 `config/application.yml` 结构。

这意味着：

- 采集器连接参数仍然在同一个位置修改
- 虚拟线程相关配置仍然在同一个位置修改
- Native 专用的启动调整通过代码在运行时生效，而不是长期维护第二份 `application.yml`

## 推荐选择

- 想要更低内存、更快启动，并且监控类型不依赖 JDBC 驱动时，优先选择 Native 采集器安装包；MySQL、MariaDB、OceanBase 在不使用 `ext-lib` 时适合直接选择 Native 采集器安装包，TiDB 的 SQL 查询指标在不使用 `ext-lib` 时也可以走内置 MySQL 兼容查询引擎。
- 需要 `ext-lib`、外置 JDBC 驱动，或者依赖 JVM 风格运行时扩展能力时，使用 JVM 采集器安装包。
- 对 MySQL 兼容监控来说，`auto` 只检查 `ext-lib`。如果你想手动指定链路，可以配置 `hertzbeat.collector.mysql.query-engine=jdbc`、`r2dbc` 或 `auto`。

## 官方多平台安装包是怎么构建的？

- `mvn clean package -pl hertzbeat-collector-collector -am -Pnative` 只会为当前宿主机构建一个 Native 采集器安装包。
- 官方发布使用的 Linux、macOS、Windows Native 安装包，会在发布准备阶段手动触发 `Collector Native Release` GitHub Actions 工作流来生成，而不是在每次 push 或 pull request 时自动构建。

具体安装步骤可参考 [通过安装包安装 HertzBeat](package-deploy)。
