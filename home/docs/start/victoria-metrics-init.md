---
id: victoria-metrics-init
title: Use Time Series Database VictoriaMetrics to Store Metrics Data (Recommended)
sidebar_label: Metrics Store VictoriaMetrics (Recommended)
---

Apache HertzBeat (incubating)'s historical data storage relies on the time series database, you can choose one of them to install and initialize, or not to install (note ⚠️ but it is strongly recommended to configure in the production environment)

> It is recommended to use VictoriaMetrics as metrics storage.

VictoriaMetrics is a fast, cost-effective and scalable monitoring solution and time series database.Recommend Version(VictoriaMetrics:v1.95.1+, HertzBeat:v1.4.3+)

**Note⚠️ Time series database is optional, but production environment configuration is strongly recommended to provide more complete historical chart functions and high performance**
**⚠️ If you do not configure a time series database, only the last hour of historical data is retained.**

> If you already have an VictoriaMetrics environment, you can skip directly to the YML configuration step.

### Install VictoriaMetrics via Docker

1. Download and install Docker environment
Docker tools download refer to [Docker official document](https://docs.docker.com/get-docker/).
After the installation you can check if the Docker version normally output at the terminal.

   ```shell
   $ docker -v
   Docker version 20.10.12, build e91ed57
   ```

2. Install VictoriaMetrics via Docker

   ```shell
   $ docker run -d -p 8428:8428 \
       -v $(pwd)/victoria-metrics-data:/victoria-metrics-data \
       --name victoria-metrics \
       victoriametrics/victoria-metrics:v1.95.1
   ```

   `-v $(pwd)/victoria-metrics-data:/victoria-metrics-data` is local persistent mount of VictoriaMetrics data directory
   use```$ docker ps``` to check if the database started successfully

3. Configure the database connection in hertzbeat `application.yml`configuration file

   Modify `hertzbeat/config/application.yml` configuration file
   Note⚠️The docker container way need to mount application.yml file locally, while you can use installation package way to unzip and modify `hertzbeat/config/application.yml`
   Config the `warehouse.store.jpa.enabled` `false`. Replace `warehouse.store.victoria-metrics` data source parameters, HOST account and password.

   ```yaml
   warehouse:
     store:
        # disable JPA
       jpa:
         enabled: false
       # enable victoria-metrics
       victoria-metrics:
          enabled: true
          url: http://localhost:8428
          username: root
          password: root
   ```

4. Restart HertzBeat

### Use VictoriaMetrics in Cluster Mode

VictoriaMetrics provides a **cluster mode** with separate components for ingestion (`vminsert`), storage (`vmstorage`), and querying (`vmselect`). The following section explains how to deploy VictoriaMetrics in cluster mode and integrate it with HertzBeat.

#### 1. Deploy VictoriaMetrics Cluster via Docker Compose

Create a `docker-compose.yml` file with the following content:

```yaml
version: "3"

services:
  vmstorage1:
    image: victoriametrics/vmstorage
    command:
      - "-retentionPeriod=1"
      - "-storageDataPath=/storage"
    volumes:
      - vmstorage-data:/storage
    ports:
      - "8400:8400"  # vminsert connects here
      - "8401:8401"  # vmselect connects here

  vminsert:
    image: victoriametrics/vminsert
    command:
      - "-storageNode=vmstorage1:8400"
      - "-httpAuth.username=root"
      - "-httpAuth.password=root"
    ports:
      - "8480:8480"  # ingestion endpoint

  vmselect:
    image: victoriametrics/vmselect
    command:
      - "-storageNode=vmstorage1:8401"
      - "-httpAuth.username=root"
      - "-httpAuth.password=root"
    ports:
      - "8481:8481"  # query endpoint

volumes:
  vmstorage-data:
```

Start the cluster with:

```shell
docker-compose up -d
```

Check all components are running via:

```shell
docker ps
```

#### 2. Configure HertzBeat for Cluster Mode

Edit the `hertzbeat/config/application.yml` configuration file as follows:

```yaml
warehouse:
  store:
    jpa:
      enabled: false
    victoria-metrics:
      cluster:
        enabled: true
        select:
          url: http://127.0.0.1:8481
          username: root
          password: root
        insert:
          url: http://127.0.0.1:8480
          username: root
          password: root
```

**Note:**

- Set `enabled: true` under `cluster` to enable cluster mode.
- Ensure the URLs match your Docker Compose network or deployment addresses.

#### 3. Restart HertzBeat

Once configured, restart HertzBeat to connect to the VictoriaMetrics cluster.

### FAQ

1. Do both the time series databases need to be configured? Can they both be used?

   > You don't need to configure all of them, you can choose one of them. Use the enable parameter to control whether it is used or not. You can also install and configure neither, which can affects the historical chart data.
