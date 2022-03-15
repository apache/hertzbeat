---
id: contributing  
title: 参与贡献    
sidebar_label: 参与贡献    
---

参与贡献
=======================================

非常欢迎参与项目贡献，我们致力于维护一个互相帮助的快乐社区。

### 模块

- **[manager](https://github.com/dromara/hertzbeat/tree/master/manager)** 提供监控管理,系统管理基础服务
> 提供对监控的管理，监控应用配置的管理，系统用户租户后台管理等。
- **[collector](https://github.com/dromara/hertzbeat/tree/master/collector)** 提供监控数据采集服务
> 使用通用协议远程采集获取对端指标数据。
- **[scheduler](https://github.com/dromara/hertzbeat/tree/master/scheduler)** 提供监控任务调度服务
> 采集任务管理，一次性任务和周期性任务的调度分发。
- **[warehouse](https://github.com/dromara/hertzbeat/tree/master/warehouse)** 提供监控数据仓储服务
> 采集指标结果数据管理，数据落盘，查询，计算统计。
- **[alerter](https://github.com/dromara/hertzbeat/tree/master/alerter)** 提供告警服务
> 告警计算触发，监控状态联动，告警配置，告警通知。
- **[web-app](https://github.com/dromara/hertzbeat/tree/master/web-app)** 提供可视化控制台页面
> 监控告警系统可视化控制台前端

![hertzBeat](https://cdn.jsdelivr.net/gh/dromara/hertzbeat@gh-pages/img/docs/hertzbeat-stru.svg)

## 如何贡献?

我们不仅仅接收代码的贡献提交，您也可以通过提交文档的更新或者BUG的报告来参与社区贡献。

如果是新的贡献者，请首先了解参考仓库提交Issues,提交Pull Requests如何工作。

https://github.com/dromara/hertzbeat/issues     
https://github.com/dromara/hertzbeat/pulls   
https://gitee.com/dromara/hertzbeat/issues   
https://gitee.com/dromara/hertzbeat/pulls

## 本地代码工程启动

此为前后端分离项目，本地代码启动需将后端 [manager](https://github.com/dromara/hertzbeat/tree/master/manager) 和前端 [web-app](https://github.com/dromara/hertzbeat/tree/master/web-app) 分别启动生效。

### 后端启动

1. 部署启动依赖服务`MYSQL`和`TDengine`数据库
2. 需要`maven3+`和`java8+`环境
3. 修改配置文件的依赖服务地址等信息-`manager/src/main/resources/application.yml`
4. 启动`manager`服务 `manager/src/main/java/com/usthe/manager/Manager.java`

### 前端启动

1. 需要nodejs npm环境   
   下载地址：https://nodejs.org/en/download
2. 安装yarn `npm install -g yarn`
3. 在前端工程目录web-app下执行 `yarn install`
4. 全局安装angular-cli `npm install -g @angular/cli@12 --registry=https://registry.npm.taobao.org`
5. 待本地后端启动后，在web-app目录下启动本地前端 `ng serve --open`
6. 浏览器访问 localhost:4200 即可开始

## 加入交流

[Github Discussion](https://github.com/dromara/hertzbeat/discussions)               
加微信号 tan-cloud 拉您进微信交流群      
加QQ群号 718618151 进QQ交流群, 验证信息: tancloud      
微信公众号：tancloudtech        
[Dromara社区网站](https://dromara.org/)      
[HertzBeat用户网站](https://support.qq.com/products/379369)  
