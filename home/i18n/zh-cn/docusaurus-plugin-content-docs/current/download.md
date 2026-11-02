---
id: download
title: 下载 Apache HertzBeat 1.9.1
sidebar_label: 下载
---

发行镜像可能仍在同步。请先阅读 [1.9.1 升级指南](/docs/start/1.9.1-update)，并使用同一版本的管理端与采集器。

| 制品 | 下载与校验 |
| --- | --- |
| 源代码 | [apache-hertzbeat-1.9.1-src.tar.gz](https://downloads.apache.org/hertzbeat/1.9.1/apache-hertzbeat-1.9.1-src.tar.gz) · [ASC](https://downloads.apache.org/hertzbeat/1.9.1/apache-hertzbeat-1.9.1-src.tar.gz.asc) · [SHA-512](https://downloads.apache.org/hertzbeat/1.9.1/apache-hertzbeat-1.9.1-src.tar.gz.sha512) |
| 服务端 | [apache-hertzbeat-1.9.1-bin.tar.gz](https://downloads.apache.org/hertzbeat/1.9.1/apache-hertzbeat-1.9.1-bin.tar.gz) · [ASC](https://downloads.apache.org/hertzbeat/1.9.1/apache-hertzbeat-1.9.1-bin.tar.gz.asc) · [SHA-512](https://downloads.apache.org/hertzbeat/1.9.1/apache-hertzbeat-1.9.1-bin.tar.gz.sha512) |
| Docker 服务端 | [apache-hertzbeat-1.9.1-docker-bin.tar.gz](https://downloads.apache.org/hertzbeat/1.9.1/apache-hertzbeat-1.9.1-docker-bin.tar.gz) · [ASC](https://downloads.apache.org/hertzbeat/1.9.1/apache-hertzbeat-1.9.1-docker-bin.tar.gz.asc) · [SHA-512](https://downloads.apache.org/hertzbeat/1.9.1/apache-hertzbeat-1.9.1-docker-bin.tar.gz.sha512) |
| Docker Compose | [apache-hertzbeat-1.9.1-docker-compose.tar.gz](https://downloads.apache.org/hertzbeat/1.9.1/apache-hertzbeat-1.9.1-docker-compose.tar.gz) · [ASC](https://downloads.apache.org/hertzbeat/1.9.1/apache-hertzbeat-1.9.1-docker-compose.tar.gz.asc) · [SHA-512](https://downloads.apache.org/hertzbeat/1.9.1/apache-hertzbeat-1.9.1-docker-compose.tar.gz.sha512) |
| JVM 采集器 | [apache-hertzbeat-collector-1.9.1-bin.tar.gz](https://downloads.apache.org/hertzbeat/1.9.1/apache-hertzbeat-collector-1.9.1-bin.tar.gz) · [ASC](https://downloads.apache.org/hertzbeat/1.9.1/apache-hertzbeat-collector-1.9.1-bin.tar.gz.asc) · [SHA-512](https://downloads.apache.org/hertzbeat/1.9.1/apache-hertzbeat-collector-1.9.1-bin.tar.gz.sha512) |
| 原生采集器 Linux AMD64 | [apache-hertzbeat-collector-native-1.9.1-linux-amd64-bin.tar.gz](https://downloads.apache.org/hertzbeat/1.9.1/apache-hertzbeat-collector-native-1.9.1-linux-amd64-bin.tar.gz) · [ASC](https://downloads.apache.org/hertzbeat/1.9.1/apache-hertzbeat-collector-native-1.9.1-linux-amd64-bin.tar.gz.asc) · [SHA-512](https://downloads.apache.org/hertzbeat/1.9.1/apache-hertzbeat-collector-native-1.9.1-linux-amd64-bin.tar.gz.sha512) |
| 原生采集器 Linux ARM64 | [apache-hertzbeat-collector-native-1.9.1-linux-arm64-bin.tar.gz](https://downloads.apache.org/hertzbeat/1.9.1/apache-hertzbeat-collector-native-1.9.1-linux-arm64-bin.tar.gz) · [ASC](https://downloads.apache.org/hertzbeat/1.9.1/apache-hertzbeat-collector-native-1.9.1-linux-arm64-bin.tar.gz.asc) · [SHA-512](https://downloads.apache.org/hertzbeat/1.9.1/apache-hertzbeat-collector-native-1.9.1-linux-arm64-bin.tar.gz.sha512) |
| 原生采集器 Windows AMD64 | [apache-hertzbeat-collector-native-1.9.1-windows-amd64-bin.zip](https://downloads.apache.org/hertzbeat/1.9.1/apache-hertzbeat-collector-native-1.9.1-windows-amd64-bin.zip) · [ASC](https://downloads.apache.org/hertzbeat/1.9.1/apache-hertzbeat-collector-native-1.9.1-windows-amd64-bin.zip.asc) · [SHA-512](https://downloads.apache.org/hertzbeat/1.9.1/apache-hertzbeat-collector-native-1.9.1-windows-amd64-bin.zip.sha512) |

使用 [KEYS](https://downloads.apache.org/hertzbeat/KEYS) 验证签名和 SHA-512 校验和。历史版本见 [Apache 归档](https://archive.apache.org/dist/hertzbeat/)。

## 选择与校验制品

服务端安装包含管理端和 Web 界面。分布式部署可使用 JVM 采集器，或选择与系统平台匹配的原生采集器。原生采集器不支持运行时加载外部 JDBC 驱动，详见[原生采集器指南](/docs/start/native-collector)。Docker Compose 压缩包提供部署配置。

下载压缩包时同时下载对应的 `.asc` 和 `.sha512` 文件，并验证签名和校验和。例如，校验源码包：

```bash
curl -O https://downloads.apache.org/hertzbeat/KEYS
gpg --import KEYS
gpg --verify apache-hertzbeat-1.9.1-src.tar.gz.asc apache-hertzbeat-1.9.1-src.tar.gz
sha512sum -c apache-hertzbeat-1.9.1-src.tar.gz.sha512
```
