---
id: download
title: 下载 Apache HertzBeat - 最新版本
sidebar_label: 下载
description: Apache HertzBeat 监控系统下载 - 服务器、采集器、源码和 Docker Compose 包，包含签名和校验和。
---

## 如何下载 HertzBeat？

下载最新 Apache HertzBeat™ 发布版（v1.8.0）的服务器二进制、采集器二进制、源码或 Docker Compose 包。所有发布版都包含 GPG 签名和 SHA512 校验和用于验证。

**最新版本：** v1.8.0（发布日期：2026年2月5日）

**快速下载：**
- [服务器二进制](https://www.apache.org/dyn/closer.lua/hertzbeat/1.8.0/apache-hertzbeat-1.8.0-bin.tar.gz)
- [采集器二进制](https://www.apache.org/dyn/closer.lua/hertzbeat/1.8.0/apache-hertzbeat-collector-1.8.0-bin.tar.gz)
- [源码](https://www.apache.org/dyn/closer.lua/hertzbeat/1.8.0/apache-hertzbeat-1.8.0-src.tar.gz)

## 下载包类型

| 包类型 | 大小 | 用途 | 平台 |
|--------|------|------|------|
| **服务器二进制** | ~200MB | 主监控服务器 | Linux、macOS、Windows |
| **采集器二进制** | ~50MB | 分布式采集器 | Linux、macOS、Windows |
| **源码** | ~30MB | 从源码构建 | 任何支持 Java 21+ 的平台 |
| **Docker Compose** | ~5MB | 全栈部署 | Docker 环境 |

:::tip 安全验证
使用 GPG 签名和 SHA512 校验和验证下载。参见 [Apache 验证指南](https://www.apache.org/dyn/closer.cgi#verify) 和 [HertzBeat KEYS](https://downloads.apache.org/hertzbeat/KEYS)。
:::

## 最新版本（推荐）

:::tip 安全公告
以前版本可能包含安全漏洞。请始终使用最新版本。
:::

| 版本     | 日期         | 下载                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Release                                                         |
|--------|------------|--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|-----------------------------------------------------------------|
| v1.8.0 | 2026.02.05 | [apache-hertzbeat-1.8.0-bin.tar.gz](https://www.apache.org/dyn/closer.lua/hertzbeat/1.8.0/apache-hertzbeat-1.8.0-bin.tar.gz) (Server) ( [signature](https://downloads.apache.org/hertzbeat/1.8.0/apache-hertzbeat-1.8.0-bin.tar.gz.asc) , [sha512](https://downloads.apache.org/hertzbeat/1.8.0/apache-hertzbeat-1.8.0-bin.tar.gz.sha512) ) <br/> [apache-hertzbeat-collector-1.8.0-bin.tar.gz](https://www.apache.org/dyn/closer.lua/hertzbeat/1.8.0/apache-hertzbeat-collector-1.8.0-bin.tar.gz) (Collector) ( [signature](https://downloads.apache.org/hertzbeat/1.8.0/apache-hertzbeat-collector-1.8.0-bin.tar.gz.asc) , [sha512](https://downloads.apache.org/hertzbeat/1.8.0/apache-hertzbeat-collector-1.8.0-bin.tar.gz.sha512) ) <br/> [apache-hertzbeat-1.8.0-src.tar.gz](https://www.apache.org/dyn/closer.lua/hertzbeat/1.8.0/apache-hertzbeat-1.8.0-src.tar.gz) (Source Code) ( [signature](https://downloads.apache.org/hertzbeat/1.8.0/apache-hertzbeat-1.8.0-src.tar.gz.asc) , [sha512](https://downloads.apache.org/hertzbeat/1.8.0/apache-hertzbeat-1.8.0-src.tar.gz.sha512) )  <br/> [apache-hertzbeat-1.8.0-docker-compose.tar.gz](https://github.com/apache/hertzbeat/releases/download/1.8.0/apache-hertzbeat-1.8.0-docker-compose.tar.gz) (Docker Compose) ( [signature](https://downloads.apache.org/hertzbeat/1.8.0/apache-hertzbeat-1.8.0-docker-compose.tar.gz.asc) , [sha512](https://downloads.apache.org/hertzbeat/1.8.0/apache-hertzbeat-1.8.0-docker-compose.tar.gz.sha512) ) | [note](https://github.com/apache/hertzbeat/releases/tag/1.8.0) |

## Docker 镜像版本

> Apache HertzBeat™ 为每个版本制作了 Docker 镜像. 你可以从 [Docker Hub](https://hub.docker.com/r/apache/hertzbeat) 拉取使用.

- HertzBeat [https://hub.docker.com/r/apache/hertzbeat](https://hub.docker.com/r/apache/hertzbeat)
- HertzBeat Collector [https://hub.docker.com/r/apache/hertzbeat-collector](https://hub.docker.com/r/apache/hertzbeat-collector)

## 归档版本

在这里查看所有历史已归档版本：[archive](https://archive.apache.org/dist/incubator/hertzbeat/).

## 下载常见问题

### 应该下载哪个包？

**服务器二进制** - 大多数用户使用。包含主 HertzBeat 监控服务器和 Web UI。

**采集器二进制** - 分布式部署使用。在远程网络部署采集器向主服务器上报。

**源码** - 开发者想要构建、修改或贡献 HertzBeat 时使用。

**Docker Compose** - 快速全栈部署，包含数据库和时间序列存储。

### 如何验证下载？

1. 下载 GPG 签名（.asc）和校验和（.sha512）文件
2. 验证签名：`gpg --verify apache-hertzbeat-*.tar.gz.asc apache-hertzbeat-*.tar.gz`
3. 验证校验和：`sha512sum -c apache-hertzbeat-*.tar.gz.sha512`

首先导入 Apache HertzBeat KEYS：`wget https://downloads.apache.org/hertzbeat/KEYS && gpg --import KEYS`

### 系统要求是什么？

**服务器二进制要求：**
- Java 21 或更高版本
- 4GB RAM 最低（推荐 8GB）
- 2 CPU 核心 最低
- 20GB 磁盘空间

**采集器二进制要求：**
- Java 21 或更高版本
- 2GB RAM 最低
- 1 CPU 核心 最低
- 5GB 磁盘空间

### 可以用 Docker 代替二进制包吗？

可以。Docker 是推荐的安装方法：
```bash
docker run -d -p 1157:1157 -p 1158:1158 --name hertzbeat apache/hertzbeat
```

### 如何解压和运行二进制？

```bash
tar -xzf apache-hertzbeat-1.8.0-bin.tar.gz
cd apache-hertzbeat-1.8.0
./bin/startup.sh
```

访问 Web UI：http://localhost:1157, 凭据：admin/hertzbeat

### 版本之间有什么区别？

每个版本包含错误修复、安全补丁和新功能。下载表中的发布说明链接详细说明了具体变更。

**始终使用最新版本**以确保安全性和稳定性。

### 在哪里可以找到旧版本？

以前版本归档在 https://archive.apache.org/dist/incubator/hertzbeat/

### 新版本多久发布一次？

HertzBeat 遵循定期发布计划，新版本大约每 2-3 个月发布一次。安全补丁可能更频繁发布。
