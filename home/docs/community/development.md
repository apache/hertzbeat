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

1. Requires `maven3+`, `java25` and `lombok` environments
2. (Optional) Modify the configuration file: `hertzbeat-startup/src/main/resources/application.yml`
3. Execute under the project root directory: `mvn clean install -DskipTests`
4. Add VM Options: `--add-opens=java.base/java.nio=org.apache.arrow.memory.core,ALL-UNNAMED`
5. Start `springboot startup` service: `hertzbeat-startup/src/main/java/org/apache/hertzbeat/startup/HertzBeatApplication.java`

### Frontend start

1. Requires `Node.js 22.x` and `pnpm 10.x` environments

2. Cd to the `web-app` directory: `cd web-app`

3. Install pnpm: `npm install -g pnpm@10.9.0`

4. Install Dependencies: `pnpm install` or `pnpm install --registry=https://registry.npmmirror.com` in `web-app`

5. After the local backend is started, start the local frontend in the `web-app` directory: `pnpm dev`

6. Open localhost:4200 in your browser and complete the initial setup to get started.

## Build HertzBeat binary package

> Requires `maven3+`, `java25`, `Node.js 22.x` and `pnpm 10.x` environments.

### Frontend build

1. Requires `Node.js 22.x` and `pnpm 10.x` environments

2. Cd to the `web-app` directory: `cd web-app`

3. Install pnpm: `npm install -g pnpm@10.9.0`

4. Install Dependencies: `pnpm install` or `pnpm install --registry=https://registry.npmmirror.com` in `web-app`

5. Build web-app: `pnpm build`. The build output is generated in `web-app/dist`

### Backend build

1. Requires `maven3+`, `java25` environments

2. Execute under the project root directory: `mvn clean package -Prelease`

The HertzBeat install package will be generated at `dist/apache-hertzbeat-{version}-bin.tar.gz`

### Collector build

1. Requires `maven3+`, `java25` environments

2. Execute under the project root directory: `mvn clean install`

3. Cd to the `hertzbeat-collector` directory: `cd hertzbeat-collector`

4. Build the JVM collector package under `hertzbeat-collector` directory: `mvn clean package -Pcluster`
5. Build the native collector package under `hertzbeat-collector` directory: `mvn clean package -pl hertzbeat-collector-collector -am -Pnative`

> Native collector packaging requires GraalVM for JDK 25 with the `native-image` tool available in `PATH`.

The HertzBeat collector packages will be generated at `dist/apache-hertzbeat-collector-{version}-bin.tar.gz` and a platform-specific native package such as `dist/apache-hertzbeat-collector-native-{version}-linux-amd64-bin.tar.gz`
