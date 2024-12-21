---
id: docker-compose-deploy
title: 通过 Docker Compose 方式安装 HertzBeat
sidebar_label: Docker Compose方式安装
---

:::tip
推荐使用 Docker Compose 方式一键部署 HertzBeat 及其依赖服务。
:::

:::note
需您的环境中已经拥有 Docker 环境 和 Docker Compose 环境 ，若未安装请参考 [Docker官网文档](https://docs.docker.com/compose/install/)
执行命令 `docker compose version` 检查是否拥有 Docker Compose 环境。
:::

1. 下载启动脚本包

   从 [下载地址](/docs/download) 下载安装脚本包 `apache-hertzbeat-xxx-incubating-docker-compose.tar.gz`

2. 选择使用 HertzBeat + PostgreSQL + VictoriaMetrics 方案

   :::tip

   - `apache-hertzbeat-xxx-incubating-docker-compose.tar.gz` 解压后包含多个部署方案，这里我们推荐选择 `hertzbeat-postgresql-victoria-metrics` 方案。
   - 其它部署方式请详细阅读各个部署方案的 README.md 文件, MySQL 方案需要自行准备 MySQL 驱动包。

   :::

   - 解压脚本包

   ```shell
   tar zxvf apache-hertzbeat-1.6.0-incubating-docker-compose.tar.gz
   ```

   - 进入解压目录, 选择 `HertzBeat + PostgreSQL + VictoriaMetrics` 一键部署

   ```shell
   cd apache-hertzbeat-1.6.0-incubating-docker-compose    
   cd hertzbeat-postgresql-victoria-metrics
   ```

   - 一键启动

   > 在 `hertzbeat-postgresql-victoria-metrics` 目录下执行以下命令

   ```shell
   docker-compose up -d
   ```

   - 查看服务状态

   > 查看各个容器的运行状态，up 为正常运行状态

   ```shell
   docker-compose ps
   ```

3. 开始探索 HertzBeat
   浏览器访问 <http://ip:1157/> 即可开始探索使用，默认账户密码 admin/hertzbeat。

**HAVE FUN**

----

### 部署常见问题

**最多的问题就是容器网络问题，请先提前排查**
