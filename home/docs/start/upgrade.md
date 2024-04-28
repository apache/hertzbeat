---
id: upgrade  
title: HertzBeat New Version Upgrade
sidebar_label: Version Upgrade Guide     
---

**HertzBeat Release Version List**

- [Github Release](https://github.com/apache/hertzbeat/releases)
- [Gitee Release](https://gitee.com/hertzbeat/hertzbeat/releases)
- [DockerHub Release](https://hub.docker.com/r/tancloud/hertzbeat/tags)
- [Docker quay.io Release](https://quay.io/repository/tancloud/hertzbeat?tab=tags)

Apache HertzBeat(Incubating)'s metadata information is stored in H2 or Mysql, PostgreSQL relational databases, and the collected metric data is stored in time series databases such as TDengine and IotDB.

**You need to save and back up the data files of the database and monitoring templates yml files before upgrading**


### Upgrade For Docker Deploy

1. If using custom monitoring templates
   - Need to back up docker templates directory `docker cp hertzbeat:/opt/hertzbeat/define ./define` in the container `/opt/hertzbeat/define`
   - `docker cp hertzbeat:/opt/hertzbeat/define ./define`
   - And mount the template define directory when docker start `-v $(pwd)/define:/opt/hertzbeat/define`
   - `-v $(pwd)/define:/opt/hertzbeat/define`

2. If using the built-in default H2 database  
   - Need to mount or back up `-v $(pwd)/data:/opt/hertzbeat/data` database file directory in the container `/opt/hertzbeat/data`
   - Stop and delete the container, delete the local HertzBeat docker image, and pull the new version image
   - Refer to [Docker installation of HertzBeat] (docker-deploy) to create a new container using a new image. Note that the database file directory needs to be mounted `-v $(pwd)/data:/opt/hertzbeat/data`

3. If using external relational database Mysql, PostgreSQL  
   - No need to mount the database file directory in the backup container
   - Stop and delete the container, delete the local HertzBeat docker image, and pull the new version image
   - Refer to [Docker installation HertzBeat] (docker-deploy) to create a new container using the new image, and configure the database connection in `application.yml`


### Upgrade For Package Deploy

1. If using the built-in default H2 database  
   - Back up the database file directory under the installation package `/opt/hertzbeat/data`
   - If there is a custom monitoring template, you need to back up the template YML under `/opt/hertzbeat/define`
   - `bin/shutdown.sh` stops the HertzBeat process and downloads the new installation package
   - Refer to [Installation package to install HertzBeat](package-deploy) to start using the new installation package

2. If using external relational database Mysql, PostgreSQL  
   - No need to back up the database file directory under the installation package
   - If there is a custom monitoring template, you need to back up the template YML under `/opt/hertzbeat/define`
   - `bin/shutdown.sh` stops the HertzBeat process and downloads the new installation package
   - Refer to [Installation package to install HertzBeat](package-deploy) to start with the new installation package and configure the database connection in `application.yml`

**HAVE FUN**  
