---
id: quickstart  
title: Quick Start    
sidebar_label: Quick Start
---

### 🐕 Quick Start

- If you wish to deploy Apache HertzBeat (incubating) locally, please refer to the following Deployment Documentation for instructions.

#### 🍞 Install HertzBeat

> Apache HertzBeat (incubating) supports installation through source code, docker or package, cpu support X86/ARM64.

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

1. Download the release package `hertzbeat-xx.tar.gz` [Download Page](https://hertzbeat.apache.org/docs/download)
2. Configure the HertzBeat configuration yml file `hertzbeat/config/application.yml` (optional)
3. Run command `$ ./bin/startup.sh` or `bin/startup.bat`
4. Access `http://localhost:1157` to start, default account: `admin/hertzbeat`
5. Deploy collector clusters(Optional)
   - Download the release package `hertzbeat-collector-xx.tar.gz` to new machine [Download Page](https://hertzbeat.apache.org/docs/download)
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

   - Run command `$ ./bin/startup.sh` or `bin/startup.bat`
   - Access `http://localhost:1157` and you will see the registered new collector in dashboard

Detailed config refer to [Install HertzBeat via Package](package-deploy)

##### 3：Start via source code

1. Local source code debugging needs to start the back-end project `manager` and the front-end project `web-app`.
2. Backend：need `maven3+`, `java17`, `lombok`, start the `manager` service.
3. Web：need `nodejs npm angular-cli` environment, Run `ng serve --open` in `web-app` directory after backend startup.
4. Access `http://localhost:4200` to start, default account: `admin/hertzbeat`

Detailed steps refer to [CONTRIBUTING](../community/contribution)

##### 4：Install All(hertzbeat+postgresql+tsdb) via Docker-compose

Install and deploy the postgresql/mysql database, victoria-metrics/iotdb/tdengine database and hertzbeat at one time through [docker-compose deployment script](https://github.com/apache/hertzbeat/tree/master/script/docker-compose).

Detailed steps refer to [Install via Docker-Compose](https://github.com/apache/hertzbeat/tree/master/script/docker-compose)

##### 5. Install All(hertzbeat+collector+postgresql+tsdb) via kubernetes helm charts

Install HertzBeat cluster in a Kubernetes cluster by Helm chart.

Detailed steps refer to [Artifact Hub](https://artifacthub.io/packages/helm/hertzbeat/hertzbeat)

**HAVE FUN**
