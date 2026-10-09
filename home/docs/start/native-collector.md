---
id: native-collector
title: Native Collector Guide
sidebar_label: Native Collector
description: When to choose the HertzBeat native collector package, its benefits, limitations, and deployment guidance.
---

## When should I choose the native collector?

Choose the native collector package when your monitoring workload does not depend on loading external JDBC drivers from `ext-lib`.

Typical native-friendly workloads include:

- HTTP, HTTPS, website availability, and API checks
- Port, ping, SSL certificate, and other network probes
- MySQL, MariaDB, and OceanBase when you do not rely on runtime `ext-lib` JDBC loading
- TiDB when you do not rely on runtime `ext-lib` JDBC loading for its SQL query metric set
- Redis, Zookeeper, Kafka, and other non-JDBC monitoring types

## Why use it?

Compared with the JVM collector package, the native collector package is usually a better fit when you want:

- Faster startup
- Lower baseline memory usage
- A simpler runtime without a bundled or preinstalled JDK

## What are the trade-offs?

The native collector package is not a drop-in replacement for every JVM collector scenario.

- Native packages are platform-specific. You must choose the package that matches your OS and CPU architecture.
- The native collector does not support loading external JDBC driver JARs from `ext-lib` at runtime.
- If your deployment depends on JVM-style runtime classpath extension, keep using the JVM collector package.

## Runtime requirements

The native collector is an ahead-of-time compiled executable, so its runtime requirements are
**much stricter** than the JVM collector's. The JVM detects CPU features at startup and adapts;
a native image has its instruction set baked in at build time, with no fallback.

| Platform | Requirement |
| --- | --- |
| Linux / Windows (x86-64) | The CPU must support **AVX2**: Intel Haswell (2013) or newer, AMD Zen (2017) or newer |
| Linux (both architectures) | **glibc 2.34 or newer** |
| Linux (arm64) | ARMv8-A baseline, no extra instruction set required |
| Windows | Windows 10 / Server 2016 or newer, with the **Microsoft Visual C++ 2015-2022 Redistributable** installed |

Common distributions, against the glibc 2.34 line:

| Works | Does not work |
| --- | --- |
| Ubuntu 22.04 / 24.04, Debian 12, RHEL / Rocky / AlmaLinux 9, Amazon Linux 2023 | Ubuntu 20.04, Debian 11, RHEL / Rocky / AlmaLinux 8, CentOS 7, Amazon Linux 2 |

Other environments without AVX2 include some Atom-family low-end chips (J4125, N4020, N5105),
Rosetta 2 on Apple Silicon, and Windows on ARM without the newer Prism emulator.

:::caution The failure modes are misleading

- **No AVX2**: the process exits **instantly, with no output and no log file** (`Illegal instruction`
  on Linux, exit code `-1073741795` on Windows)
- **glibc too old**: `version 'GLIBC_2.34' not found`
- **Missing VC++ runtime on Windows**: `VCRUNTIME140_1.dll` not found

The first one is easily mistaken for a corrupted package. If double-clicking does nothing, or the
process starts and prints nothing at all, check for AVX2 support first.

**If any requirement is not met, use the JVM collector package**
`apache-hertzbeat-collector-{version}-bin.tar.gz` instead. It only needs JDK 25 and has none of
these constraints.
:::

## When should I stay on the JVM collector?

Use the JVM collector package if your monitoring depends on external JDBC drivers, especially:

- Oracle, which requires `ojdbc8` and sometimes `orai18n`
- DB2, which requires `jcc`
- Any MySQL, MariaDB, or OceanBase deployment where you explicitly place `mysql-connector-j` in `ext-lib` and want the JDBC path

## Package naming

The JVM collector package remains cross-platform:

- `apache-hertzbeat-collector-{version}-bin.tar.gz`

The native collector package is platform-specific:

- Linux or macOS: `apache-hertzbeat-collector-native-{version}-{platform}-bin.tar.gz`
- Windows: `apache-hertzbeat-collector-native-{version}-windows-amd64-bin.zip`

Examples:

- `apache-hertzbeat-collector-native-1.9.0-linux-amd64-bin.tar.gz`
- `apache-hertzbeat-collector-native-1.9.0-macos-arm64-bin.tar.gz`
- `apache-hertzbeat-collector-native-1.9.0-windows-amd64-bin.zip`

## Configuration consistency

The native collector package uses the same `config/application.yml` layout as the JVM collector package.

That means:

- Collector connection settings are edited in the same place
- Virtual-thread related configuration is edited in the same place
- Native-only boot adjustments are applied by code at runtime instead of maintaining a second `application.yml`

## Recommended decision

- Choose the native collector package when you want lower memory usage and faster startup for non-JDBC monitoring, for MySQL, MariaDB, and OceanBase without `ext-lib`, or for TiDB when its SQL query metric set can use the built-in MySQL-compatible query engine.
- Choose the JVM collector package when you need `ext-lib`, external JDBC drivers, or JVM-style runtime extensibility.
- For MySQL-compatible monitoring on the JVM collector, `auto` only checks `ext-lib`. If you need to force a path, set `hertzbeat.collector.mysql.query-engine=jdbc`, `r2dbc`, or `auto`.

## How are the official multi-platform packages built?

- `mvn clean package -pl hertzbeat-collector-collector -am -Pnative` builds a native collector package for the current host only.
- The official Linux, macOS, and Windows native release packages are produced by manually running the `Collector Native Release` GitHub Actions workflow during release preparation, not on every push or pull request.

For package deployment steps, refer to [Install HertzBeat via Package](package-deploy).
