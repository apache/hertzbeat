---
id: development  
title: How to Run or Build HertzBeat?    
sidebar_label: Development
---

## Getting HertzBeat code up and running

> To get HertzBeat code running on your development tools, and able to debug with breakpoints.
> This is a front-end and back-end separation project.
> To start the local code, the back-end [manager](https://github.com/apache/hertzbeat/tree/master/hertzbeat-manager) and the front-end [web-app](https://github.com/apache/hertzbeat/tree/master/web-app) must be started separately.

### Backend start

1. Requires `maven3+`, `java17` and `lombok` environments

2. (Optional) Modify the configuration file: `manager/src/main/resources/application.yml`

3. Execute under the project root directory: `mvn clean install -DskipTests`

4. Start `springboot manager` service: `manager/src/main/java/org/apache/hertzbeat/hertzbeat-manager/Manager.java`

### Frontend start

1. Need `Node Yarn` Environment, Make sure `Node.js >= 18`

2. Cd to the `web-app` directory: `cd web-app`

3. Install yarn if not existed `npm install -g yarn`

4. Install Dependencies: `yarn install` or `yarn install --registry=https://registry.npmmirror.com` in `web-app`

5. Install angular-cli globally: `yarn global add @angular/cli@15` or `yarn global add @angular/cli@15 --registry=https://registry.npmmirror.com`

6. After the local backend is started, start the local frontend in the web-app directory: `ng serve --open`

7. Browser access to localhost:4200 to start, default account/password is *admin/hertzbeat*

## Build HertzBeat binary package

> Requires `maven3+`, `java17`, `node` and `yarn` environments.

### Frontend build

1. Need `Node Yarn` Environment, Make sure `Node.js >= 18`

2. Cd to the `web-app` directory: `cd web-app`

3. Install yarn if not existed `npm install -g yarn`

4. Install Dependencies: `yarn install` or `yarn install --registry=https://registry.npmmirror.com` in `web-app`

5. Build web-app: `yarn package`

### Backend build

1. Requires `maven3+`, `java17` environments

2. Execute under the project root directory: `mvn clean package -Prelease`

The HertzBeat install package will at `dist/hertzbeat-{version}.tar.gz`

### Collector build

1. Requires `maven3+`, `java17` environments

2. Execute under the project root directory: `mvn clean install`

3. Cd to the `collector` directory: `cd collector`

4. Execute under `collector` directory: `mvn clean package -Pcluster`

The HertzBeat collector package will at `dist/hertzbeat-collector-{version}.tar.gz`
