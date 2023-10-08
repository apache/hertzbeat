---
id: upgrade  
title: HertzBeat New Version Upgrade
sidebar_label: Version Upgrade Guide     
---

HertzBeat's metadata information is stored in H2 or Mysql, PostgreSQL relational databases, and the collected indicator data is stored in time series databases such as TDengine and IotDB.

**You need to save and back up the data files of the database before upgrading**


### For Docker Deploy

1. If using the built-in default H2 database  
   - Need to mount or back up `-v $(pwd)/data:/opt/hertzbeat/data` database file directory in the container `/opt/hertzbeat/data`
   - Stop and delete the container, delete the local HertzBeat docker image, and pull the new version image
   - Refer to [Docker installation of HertzBeat] (docker-deploy) to create a new container using a new image. Note that the database file directory needs to be mounted `-v $(pwd)/data:/opt/hertzbeat/data`

2. If using external relational database Mysql, PostgreSQL  
   - No need to mount the database file directory in the backup container
   - Stop and delete the container, delete the local HertzBeat docker image, and pull the new version image
   - Refer to [Docker installation HertzBeat] (docker-deploy) to create a new container using the new image, and configure the database connection in `application.yml`


### For Package Deploy

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
