---
id: upgrade  
title: HertzBeat 新版本更新指引
sidebar_label: 版本更新指引
---

**Apache HertzBeat (incubating) 的发布版本列表**

- [下载页面](https://hertzbeat.apache.org/docs/download)
- [Github Release](https://github.com/apache/hertzbeat/releases)
- [DockerHub Release](https://hub.docker.com/r/apache/hertzbeat/tags)

HertzBeat 的元数据信息保存在 H2 或 Mysql, PostgreSQL 关系型数据库内, 采集指标数据存储在 TDengine, IotDB 等时序数据库内。

**升级前您需要保存备份好数据库的数据文件和监控模板文件**

### Docker部署方式的升级

1. 若使用了自定义监控模板
   - 需要备份 `docker cp hertzbeat:/opt/hertzbeat/define ./define` 当前运行 docker 容器里面的 `/opt/hertzbeat/define` 目录到当前主机下
   - `docker cp hertzbeat:/opt/hertzbeat/define ./define`
   - 然后在后续升级启动 docker 容器的时候需要挂载上这个 define 目录，`-v $(pwd)/define:/opt/hertzbeat/define`
   - `-v $(pwd)/define:/opt/hertzbeat/define`
2. 若使用内置默认 H2 数据库
   - 需挂载或备份 `-v $(pwd)/data:/opt/hertzbeat/data` 容器内的数据库文件目录 `/opt/hertzbeat/data`
   - 停止并删除容器，删除本地 HertzBeat docker 镜像，拉取新版本镜像
   - 参考 [Docker安装HertzBeat](docker-deploy) 使用新镜像创建新的容器，注意需要将数据库文件目录挂载 `-v $(pwd)/data:/opt/hertzbeat/data`
3. 若使用外置关系型数据库 Mysql, PostgreSQL
   - 无需挂载备份容器内的数据库文件目录
   - 停止并删除容器，删除本地 HertzBeat docker 镜像，拉取新版本镜像
   - 参考 [Docker安装HertzBeat](docker-deploy) 使用新镜像创建新的容器，`application.yml`配置数据库连接即可

### 安装包部署方式的升级

1. 若使用内置默认 H2 数据库
   - 备份安装包下的数据库文件目录 `/opt/hertzbeat/data`
   - 若有自定义监控模板，需备份 `/opt/hertzbeat/define` 下的模板YML
   - `bin/shutdown.sh` 停止 HertzBeat 进程，下载新安装包
   - 参考 [安装包安装HertzBeat](package-deploy) 使用新安装包启动
2. 若使用外置关系型数据库 Mysql, PostgreSQL
   - 无需备份安装包下的数据库文件目录
   - 若有自定义监控模板，需备份 `/opt/hertzbeat/define` 下的模板YML
   - `bin/shutdown.sh` 停止 HertzBeat 进程，下载新安装包
   - 参考 [安装包安装HertzBeat](package-deploy) 使用新安装包启动，`application.yml`配置数据库连接即可

**HAVE FUN**
