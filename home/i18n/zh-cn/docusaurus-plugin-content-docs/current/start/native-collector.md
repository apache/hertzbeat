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

## 运行环境要求

Native 采集器是提前编译好的原生可执行文件，运行环境的要求比 JVM 采集器**严格得多**。JVM 采集器由 JIT 在
启动时探测 CPU 特性并自动适配，而 native 包在构建时就把指令集固化进了二进制，没有回退机制。

| 平台 | 要求 |
| --- | --- |
| Linux / Windows（x86-64） | CPU 必须支持 **AVX2**：Intel Haswell（2013）及以后、AMD Zen（2017）及以后 |
| Linux（两种架构） | **glibc ≥ 2.34** |
| Linux（arm64） | ARMv8-A 基线即可，无额外指令集要求 |
| Windows | Windows 10 / Server 2016 及以上，并安装 **Microsoft Visual C++ 2015-2022 可再发行组件包** |

常见发行版对照（glibc ≥ 2.34 这条线）：

| 可用 | 不可用 |
| --- | --- |
| Ubuntu 22.04 / 24.04、Debian 12、RHEL / Rocky / AlmaLinux 9、Amazon Linux 2023 | Ubuntu 20.04、Debian 11、RHEL / Rocky / AlmaLinux 8、CentOS 7、Amazon Linux 2 |

不支持 AVX2 的环境还包括：部分 Atom 血统的低端芯片（如 J4125、N4020、N5105）、Apple Silicon 上的
Rosetta 2、以及未更新到 Prism 新版模拟器的 Windows on ARM。

:::caution 不满足要求时的表现很具有迷惑性
- **CPU 不支持 AVX2**：进程**瞬间退出，没有任何输出、也没有日志文件**（Linux 上报 `Illegal instruction`，
  Windows 上退出码为 `-1073741795`）
- **glibc 版本过低**：报 `version 'GLIBC_2.34' not found`
- **Windows 缺少 VC++ 运行库**：报缺少 `VCRUNTIME140_1.dll`

第一种最容易被误判为"安装包损坏"。遇到"双击没反应"或"启动了什么都没打印"时，请先核对 CPU 是否支持 AVX2。

**任何一项不满足，都可以改用 JVM 采集器安装包** `apache-hertzbeat-collector-{version}-bin.tar.gz`，
它只要求 JDK 25，没有上述限制。
:::

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

- `apache-hertzbeat-collector-native-1.9.0-linux-amd64-bin.tar.gz`
- `apache-hertzbeat-collector-native-1.9.0-macos-arm64-bin.tar.gz`
- `apache-hertzbeat-collector-native-1.9.0-windows-amd64-bin.zip`

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
