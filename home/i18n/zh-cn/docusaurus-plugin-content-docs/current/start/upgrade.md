---
id: upgrade  
title: HertzBeat 新版本更新指引
sidebar_label: 版本更新指引     
---

HertzBeat 的元数据信息保存在 H2 或 Mysql, PostgreSQL 关系型数据库内, 采集指标数据存储在 TDengine, IotDB 等时序数据库内。  

**升级前您需要保存备份好数据库的数据文件** 


### For Docker Deploy

1. 若使用内置默认 H2 数据库 
   - 需挂载或备份 `-v $(pwd)/data:/opt/hertzbeat/data` 容器内的数据库文件目录 `/opt/hertzbeat/data`
   - 停止并删除容器，删除本地 HertzBeat docker 镜像，拉取新版本镜像
   - 参考 [Docker安装HertzBeat](docker-deploy) 使用新镜像创建新的容器，注意需要将数据库文件目录挂载 `-v $(pwd)/data:/opt/hertzbeat/data`

2. 若使用外置关系型数据库 Mysql, PostgreSQL
   - 无需挂载备份容器内的数据库文件目录
   - 停止并删除容器，删除本地 HertzBeat docker 镜像，拉取新版本镜像
   - 参考 [Docker安装HertzBeat](docker-deploy) 使用新镜像创建新的容器，`application.yml`配置数据库连接即可


### For Package Deploy

1. 若使用内置默认 H2 数据库
   - 备份安装包下的数据库文件目录 `/opt/hertzbeat/data` 
   - 若有自定义监控模版，需备份 `/opt/hertzbeat/define` 下的模版YML
   - `bin/shutdown.sh` 停止 HertzBeat 进程，下载新安装包
   - 参考 [安装包安装HertzBeat](package-deploy) 使用新安装包启动

2. 若使用外置关系型数据库 Mysql, PostgreSQL
   - 无需备份安装包下的数据库文件目录
   - 若有自定义监控模版，需备份 `/opt/hertzbeat/define` 下的模版YML
   - `bin/shutdown.sh` 停止 HertzBeat 进程，下载新安装包
   - 参考 [安装包安装HertzBeat](package-deploy) 使用新安装包启动，`application.yml`配置数据库连接即可



**HAVE FUN**  
