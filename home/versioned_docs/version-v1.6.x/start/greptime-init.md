---
id: greptime-init  
title: Use Time Series Database GreptimeDB to Store Metrics Data (Optional)       
sidebar_label: Metrics Store GreptimeDB
---

Apache HertzBeat (incubating)'s historical data storage relies on the time series database, you can choose one of them to install and initialize, or not to install (note ⚠️ but it is strongly recommended to configure in the production environment)

> It is recommended to use VictoriaMetrics as metrics storage.

[GreptimeDB](https://github.com/GreptimeTeam/greptimedb) is an open-source time-series database with a special focus on scalability, analytical capabilities and efficiency.

It's designed to work on infrastructure of the cloud era, and users benefit from its elasticity and commodity storage.

**⚠️ If you do not configure a time series database, only the last hour of historical data is retained.**

### Install GreptimeDB via Docker

1. Download and install Docker environment
Docker tools download refer to [Docker official document](https://docs.docker.com/get-docker/).
After the installation you can check if the Docker version normally output at the terminal.

   ```shell
   $ docker -v
   Docker version 20.10.12, build e91ed57
   ```

2. Install GreptimeDB with Docker

    ```shell
    $ docker run -d -p 127.0.0.1:4000-4003:4000-4003 \
    v "$(pwd)/greptimedb:/tmp/greptimedb" \
    --name greptime \
    greptime/greptimedb:latest standalone start \
    --http-addr 0.0.0.0:4000 \
    --rpc-addr 0.0.0.0:4001 \
    --mysql-addr 0.0.0.0:4002 \
    --postgres-addr 0.0.0.0:4003
    ```

`-v "$(pwd)/greptimedb:/tmp/greptimedb"` is local persistent mount of greptimedb data directory. `$(pwd)/greptimedb` should be replaced with the actual local directory, default is the `greptimedb` directory under the current directory.
use```$ docker ps``` to check if the database started successfully

### Configure the database connection in hertzbeat `application.yml` configuration file

1. Configure HertzBeat's configuration file
   Modify `hertzbeat/config/application.yml` configuration file [/script/application.yml](https://github.com/apache/hertzbeat/raw/master/script/application.yml)
   Note⚠️The docker container way need to mount application.yml file locally, while you can use installation package way to unzip and modify `hertzbeat/config/application.yml`
   Replace `warehouse.store.greptime` data source parameters, URL account and password.

   ```yaml
   warehouse:
      store:
         jpa:
            enabled: false
         greptime:
            enabled: true
            grpc-endpoints: localhost:4001
            http-endpoint: http://localhost:4000
            database: public
            username: greptime
            password: greptime
   ```

   The default database is `public`, if you specify another database name, you need to create it in `greptimeDB` in advance.  
   eg: Create a database named `hertzbeat` with a validity period of 90 days SQL: `CREATE DATABASE IF NOT EXISTS hertzbeat WITH(ttl='90d')`

2. Restart HertzBeat

### FAQ

1. Do both the time series databases Greptime, IoTDB or TDengine need to be configured? Can they both be used?

   > You don't need to configure all of them, you can choose one of them. Use the enable parameter to control whether it is used or not. You can also install and configure neither, which only affects the historical chart data.
