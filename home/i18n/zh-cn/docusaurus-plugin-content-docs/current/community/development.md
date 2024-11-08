---
id: development  
title: 如何将 HertzBeat 运行编译?    
sidebar_label: 运行编译
---

## 让 HertzBeat 运行起来

> 让 HertzBeat 的代码在您的开发工具上运行起来，并且能够断点调试。
> 此为前后端分离项目，本地代码启动需将后端 [manager](https://github.com/apache/hertzbeat/tree/master/hertzbeat-manager) 和前端 [web-app](https://github.com/apache/hertzbeat/tree/master/web-app) 分别启动生效。

### 后端启动

1. 需要 `maven3+`, `java17` 和 `lombok` 环境

2. (可选)修改配置文件配置信息-`manager/src/main/resources/application.yml`

3. 在项目根目录运行编译: `mvn clean install -DskipTests`

4. 启动`springboot manager`服务 `manager/src/main/java/org/apache/hertzbeat/hertzbeat-manager/Manager.java`

### 前端启动

1. 需要 `nodejs yarn` 环境, 版本要求 `Node.js >= 18`

2. 进入 `web-app` 目录: `cd web-app`

3. 安装yarn: `npm install -g yarn`

4. 在前端工程目录 `web-app` 下执行: `yarn install` 或者 `yarn install --registry=https://registry.npmmirror.com`

5. 全局安装 `angular-cli`: `yarn global add @angular/cli@15` or `yarn global add @angular/cli@15 --registry=https://registry.npmmirror.com`

6. 待本地后端启动后，在web-app目录下启动本地前端 `ng serve --open`

7. 浏览器访问 localhost:4200 即可开始，默认账号密码 admin/hertzbeat

## 生成二进制包

> 需要 `maven3+`, `java17`, `node` 和 `yarn` 环境.

### 前端打包

1. 需要 `Node Yarn` 环境, 版本要求 `Node.js >= 18`

2. 切换到 `web-app` 目录: `cd web-app`

3. 安装 yarn: `npm install -g yarn`

4. 安装本项目依赖: `yarn install` 或 `yarn install --registry=https://registry.npmmirror.com`

5. 打包: `yarn package`

### 后端打包

1. 需要 `maven3+`, `java17` 环境

2. 在项目根目录运行: `mvn clean package -Prelease`

HertzBeat 包将生成为 `dist/hertzbeat-{version}.tar.gz`

### 采样器打包

1. 需要 `maven3+`, `java17` 环境

2. 在项目根目录运行: `mvn clean install`

3. 切换到 `collector` 目录: `cd collector`

4. 在 `collector` 目录下执行: `mvn clean package -Pcluster`

HertzBeat 采样器包将生成为 `dist/hertzbeat-collector-{version}.tar.gz`
