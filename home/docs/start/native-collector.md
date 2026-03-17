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

## When should I stay on the JVM collector?

Use the JVM collector package if your monitoring depends on external JDBC drivers, especially:

- MySQL, which requires `mysql-connector-j`
- OceanBase, which also depends on the MySQL JDBC driver
- Oracle, which requires `ojdbc8` and sometimes `orai18n`
- DB2, which requires `jcc`

## Package naming

The JVM collector package remains cross-platform:

- `apache-hertzbeat-collector-{version}-bin.tar.gz`

The native collector package is platform-specific:

- Linux or macOS: `apache-hertzbeat-collector-native-{version}-{platform}-bin.tar.gz`
- Windows: `apache-hertzbeat-collector-native-{version}-windows-amd64-bin.zip`

Examples:

- `apache-hertzbeat-collector-native-1.8.0-linux-amd64-bin.tar.gz`
- `apache-hertzbeat-collector-native-1.8.0-macos-arm64-bin.tar.gz`
- `apache-hertzbeat-collector-native-1.8.0-windows-amd64-bin.zip`

## Configuration consistency

The native collector package uses the same `config/application.yml` layout as the JVM collector package.

That means:

- Collector connection settings are edited in the same place
- Virtual-thread related configuration is edited in the same place
- Native-only boot adjustments are applied by code at runtime instead of maintaining a second `application.yml`

## Recommended decision

- Choose the native collector package when you want lower memory usage and faster startup for non-JDBC monitoring.
- Choose the JVM collector package when you need `ext-lib`, external JDBC drivers, or JVM-style runtime extensibility.

## How are the official multi-platform packages built?

- `mvn clean package -pl hertzbeat-collector-collector -am -Pnative` builds a native collector package for the current host only.
- The official Linux, macOS, and Windows native release packages are produced by manually running the `Collector Native Release` GitHub Actions workflow during release preparation, not on every push or pull request.

For package deployment steps, refer to [Install HertzBeat via Package](package-deploy).
