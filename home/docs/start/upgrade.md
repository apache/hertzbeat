---
id: upgrade  
title: HertzBeat New Version Upgrade
sidebar_label: Version Upgrade Guide
---

**HertzBeat Release Version List**

- [Download Page](https://hertzbeat.apache.org/docs/download)
- [Github Release](https://github.com/apache/hertzbeat/releases)
- [DockerHub Release](https://hub.docker.com/r/apache/hertzbeat/tags)

Apache HertzBeat's metadata information is stored in H2 or Mysql, PostgreSQL relational databases, and the collected metric data is stored in time series databases such as TDengine and IotDB.

**You need to save and back up the data files of the database and monitoring templates yml files before upgrading**

## Upgrade For Docker Deploy

1. If using custom monitoring templates
   - Need to back up docker templates directory `docker cp hertzbeat:/opt/hertzbeat/define ./define` in the container `/opt/hertzbeat/define`
   - `docker cp hertzbeat:/opt/hertzbeat/define ./define`
   - And mount the template define directory when docker start `-v $(pwd)/define:/opt/hertzbeat/define`
   - `-v $(pwd)/define:/opt/hertzbeat/define`
2. If using the built-in default H2 database
   - Need to mount or back up `-v $(pwd)/data:/opt/hertzbeat/data` database file directory in the container `/opt/hertzbeat/data`
   - Stop and delete the container, delete the local HertzBeat docker image, and pull the new version image
   - Refer to [Docker installation of HertzBeat](./docker-deploy) to create a new container using a new image. Note that the database file directory needs to be mounted `-v $(pwd)/data:/opt/hertzbeat/data`
3. If using external relational database Mysql, PostgreSQL
   - No need to mount the database file directory in the backup container
   - Stop and delete the container, delete the local HertzBeat docker image, and pull the new version image
   - Refer to [Docker installation HertzBeat](./docker-deploy) to create a new container using the new image, and configure the database connection in `application.yml`

### Upgrade For Package Deploy

1. If using the built-in default H2 database
   - Back up the database file directory under the installation package `/opt/hertzbeat/data`
   - If there is a custom monitoring template, you need to back up the template YML under `/opt/hertzbeat/define`
   - `bin/shutdown.sh` stops the HertzBeat process and downloads the new installation package
   - Refer to [Installation package to install HertzBeat](./package-deploy) to start using the new installation package
2. If using external relational database Mysql, PostgreSQL
   - No need to back up the database file directory under the installation package
   - If there is a custom monitoring template, you need to back up the template YML under `/opt/hertzbeat/define`
   - `bin/shutdown.sh` stops the HertzBeat process and downloads the new installation package
   - Refer to [Installation package to install HertzBeat](./package-deploy) to start with the new installation package and configure the database connection in `application.yml`

## Cluster Authentication Upgrade

Before upgrading to a version that requires authenticated Manager and
Collector messages:

1. Back up the metadata database and your existing secret configuration.
2. Establish the AES `COMMON_SECRET` shared by Manager and every standalone
   Collector:
   - For a fresh installation, generate a valid 32-byte value with
     `openssl rand -hex 16`.
   - For an existing installation, preserve its current valid
     `common.secret` exactly. If Manager previously bootstrapped the AES value
     into the database, recover that existing `aesSecret` through restricted
     administrator access and move it into the deployment secret manager.
     Do not replace it with a newly generated value during an ordinary upgrade;
     changing it can make encrypted data unreadable.
3. Generate a separate cluster authentication secret. Its 64-character output
   is deliberately independent and is not a valid replacement for
   `COMMON_SECRET`.

   ```shell
   openssl rand -hex 32
   ```

4. Provision the same `COMMON_SECRET` and the same independent
   `CLUSTER_AUTH_ACTIVE_SECRET` on Manager and every standalone Collector.
   Preserve both across all future restarts and upgrades.
5. Set `CLUSTER_AUTH_MODE=optional` on every node before replacing binaries.
6. Upgrade Collectors first, then Managers.
7. After all nodes are upgraded and legacy-acceptance metrics remain at zero,
   remove the optional override. The shipped `required` mode then rejects
   unsigned messages.

Fresh Docker Compose installations must create the documented `.env` before
`docker compose up`; Compose fails interpolation with an actionable message
when either secret is absent. Existing Compose installations must preserve the
current AES key, add both variables to the private `.env`, and back it up before
pulling the new image.

**HAVE FUN**
