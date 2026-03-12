---
id: quickstart  
title: HertzBeat Quick Start - Install in 5 Minutes
sidebar_label: Quick Start
description: Install Apache HertzBeat monitoring system in minutes using Docker, package, or source code. Step-by-step guide for X86 and ARM64 systems.
---

## How to Install HertzBeat?

Install Apache HertzBeat™ in under 5 minutes using Docker with a single command. HertzBeat supports Docker, binary packages, and source code installation on X86/ARM64 architectures.

**Quick Install Command:** `docker run -d -p 1157:1157 -p 1158:1158 --name hertzbeat apache/hertzbeat`

## Installation Methods

HertzBeat provides multiple installation options:

1. **Docker** (Recommended) - Fastest setup, production-ready
2. **Binary Package** - Traditional deployment with manual configuration
3. **Source Code** - For development and customization
4. **Docker Compose** - Full stack with database and time-series storage

### Installation Method Comparison

| Method | Setup Time | Difficulty | Use Case |
|--------|-----------|-----------|----------|
| Docker | 2 minutes | Easy | Production, testing |
| Package | 10 minutes | Medium | Custom configurations |
| Source Code | 30 minutes | Advanced | Development |
| Docker Compose | 5 minutes | Easy | Full stack deployment |

## Installation Instructions

##### 1：Install quickly via docker

1. Just one command to get started:

    ```docker run -d -p 1157:1157 -p 1158:1158 --name hertzbeat apache/hertzbeat```

2. Access `http://localhost:1157` to start, default account: `admin/hertzbeat`

3. Deploy collector clusters(Optional)

    ```shell
    docker run -d -e IDENTITY=custom-collector-name -e MANAGER_HOST=127.0.0.1 -e MANAGER_PORT=1158 --name hertzbeat-collector apache/hertzbeat-collector
    ```

   - `-e IDENTITY=custom-collector-name` : set the collector unique identity name.
   - `-e MODE=public` : set the running mode(public or private), public cluster or private cloud-edge.
   - `-e MANAGER_HOST=127.0.0.1` : set the main hertzbeat server ip.
   - `-e MANAGER_PORT=1158` : set the main hertzbeat server port, default 1158.

Detailed config refer to [Install HertzBeat via Docker](https://hertzbeat.apache.org/docs/start/docker-deploy)

##### 2：Install via package

1. Download the release package `apache-hertzbeat-xx-bin.tar.gz` [Download Page](https://hertzbeat.apache.org/docs/download)
2. Configure the HertzBeat configuration yml file `hertzbeat/config/application.yml` (optional)
3. Run command `$ ./bin/startup.sh` or `bin/startup.bat`
4. Access `http://localhost:1157` to start, default account: `admin/hertzbeat`
5. Deploy collector clusters(Optional)
   - If you do not need MySQL, OceanBase, Oracle, DB2, or other `ext-lib` JDBC drivers, prefer the native collector package for faster startup and lower memory usage. See [Native Collector Guide](native-collector).
   - Download the release package `apache-hertzbeat-collector-xx-bin.tar.gz` (JVM collector) or the native collector package for your target platform, such as `apache-hertzbeat-collector-native-xx-linux-amd64-bin.tar.gz` or `apache-hertzbeat-collector-native-xx-windows-amd64-bin.zip`, to the new machine [Download Page](https://hertzbeat.apache.org/docs/download)
   - Configure the collector configuration yml file `hertzbeat-collector/config/application.yml`: unique `identity` name, running `mode` (public or private), hertzbeat `manager-host`, hertzbeat `manager-port`

     ```yaml
     collector:
       dispatch:
         entrance:
           netty:
             enabled: true
             identity: ${IDENTITY:}
             mode: ${MODE:public}
             manager-host: ${MANAGER_HOST:127.0.0.1}
             manager-port: ${MANAGER_PORT:1158}
     ```

   - Native collector trade-offs: platform-specific packages, no runtime `ext-lib` JDBC loading, and less suitable for JVM-style runtime classpath extension. See [Native Collector Guide](native-collector).
   - If you need MySQL, OceanBase, Oracle, or DB2 monitoring with external JDBC drivers from `ext-lib`, use the JVM collector package.
   - Run command `$ ./bin/startup.sh` or `bin/startup.bat` for the JVM collector package. Run `$ ./bin/startup.sh` for Linux or macOS native collector packages, and `bin\\startup.bat` for the Windows native collector package.
   - Access the HertzBeat server dashboard at `http://localhost:1157` and confirm the new collector is registered.

Detailed config refer to [Install HertzBeat via Package](package-deploy)

##### 3：Start via source code

1. Local source code debugging needs to start the back-end project `manager` and the front-end project `web-app`.
2. Backend：need `maven3+`, `java25`, `lombok`, start the `hertzbeat-startup` service.
3. Web：need `nodejs npm angular-cli` environment, Run `ng serve --open` in `web-app` directory after backend startup.
4. Access `http://localhost:4200` to start, default account: `admin/hertzbeat`

Detailed steps refer to [CONTRIBUTING](../community/contribution)

##### 4：Install All(hertzbeat+postgresql+tsdb) via Docker-compose

Install and deploy the postgresql/mysql database, victoria-metrics/iotdb/tdengine database and hertzbeat at one time through [docker-compose deployment script](https://github.com/apache/hertzbeat/tree/master/script/docker-compose).

Detailed steps refer to [Install via Docker-Compose](https://github.com/apache/hertzbeat/tree/master/script/docker-compose)

##### 5. Install All(hertzbeat+collector+postgresql+tsdb) via kubernetes helm charts

Install HertzBeat cluster in a Kubernetes cluster by Helm chart.

Detailed steps refer to [Artifact Hub](https://artifacthub.io/packages/helm/hertzbeat/hertzbeat)

## Installation FAQ

### What are HertzBeat's system requirements?

**Minimum Requirements:**
- 2 CPU cores
- 4GB RAM
- 10GB disk space
- Docker 20.10+ or Java 25+

**Operating Systems:** Linux, macOS, Windows (via Docker or WSL)

### What ports does HertzBeat use?

- **1157** - Web UI and API
- **1158** - Collector communication (cluster mode only)

### How do I verify HertzBeat is running?

1. Check container status: `docker ps | grep hertzbeat`
2. Access web UI: http://localhost:1157
3. Login with: admin/hertzbeat

### Can I change the default password?

Yes. After first login, navigate to Settings → Account Management to change the password.

### How do I upgrade HertzBeat?

**Docker upgrade:**
```bash
docker stop hertzbeat
docker rm hertzbeat
docker pull apache/hertzbeat:latest
docker run -d -p 1157:1157 -p 1158:1158 --name hertzbeat apache/hertzbeat
```

### What database does HertzBeat use?

HertzBeat uses H2 embedded database by default. For production, configure external databases:
- **Metadata:** MySQL, PostgreSQL
- **Time-series data:** VictoriaMetrics, IoTDB, TDengine, InfluxDB

### How do I add my first monitor?

1. Login to web UI
2. Click "Monitors" → "New Monitor"
3. Select monitoring type (e.g., MySQL, Linux, Website)
4. Enter IP, port, credentials
5. Click "Confirm" to start monitoring

### Where can I get help?

- **Documentation:** https://hertzbeat.apache.org/docs/
- **GitHub Issues:** https://github.com/apache/hertzbeat/issues
- **Community:** https://hertzbeat.apache.org/docs/community/contact

**HAVE FUN**
