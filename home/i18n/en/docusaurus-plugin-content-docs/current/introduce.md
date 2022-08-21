---
id: introduce  
title: HertzBeat     
sidebar_label: Introduce
slug: /
---

> An open-source, real-time monitoring system with custom-monitor and agentless.  

![tan-cloud](https://img.shields.io/badge/web-monitor-4EB1BA)
![tan-cloud](https://img.shields.io/badge/api-monitor-lightgrey)
![tan-cloud](https://img.shields.io/badge/ping-connect-brightgreen)
![tan-cloud](https://img.shields.io/badge/port-available-green)
![tan-cloud](https://img.shields.io/badge/database-monitor-yellowgreen)
![tan-cloud](https://img.shields.io/badge/os-monitor-yellow)
![tan-cloud](https://img.shields.io/badge/custom-monitor-orange)
![tan-cloud](https://img.shields.io/badge/threshold-red)
![tan-cloud](https://img.shields.io/badge/alert-notify-bule)


## 🎡 <font color="green">Introduction</font>

> [HertzBeat](https://github.com/dromara/hertzbeat) is an open-source, real-time monitoring system with custom-monitor and agentless. Support web service, database, os, middleware and more.          
> We also provide **[Monitoring Cloud For Saas](https://console.tancloud.cn)**, people no longer need to deploy a cumbersome monitoring system in order to monitor their website resources. **[Sign in to get started for free](https://console.tancloud.cn)**.   
> HertzBeat supports more liberal threshold alarm configuration (calculation expression), supports alarm notification, alarm template, email, dingDing, weChat, feiShu, webhook and more.    
> Most important is HertzBeat supports [Custom Monitoring](https://hertzbeat.com/docs/advanced/extend-point), just by configuring the YML file, we can customize the monitoring types and metrics what we need.      
> HertzBeat is modular, `manager, collector, scheduler, warehouse, alerter` modules are decoupled for easy understanding and custom development.   
> Welcome to join us to build hertzbeat together.  

> `HertzBeat`'s multi-type support, easy expansion, low coupling, hope to help developers and micro teams to quickly build their own monitoring system.

----   

## 🥐 Architecture

- **[manager](https://github.com/dromara/hertzbeat/tree/master/manager)** Provide monitoring management, system management basic services.
> Provides monitoring management, monitoring configuration management, system user management, etc.
- **[collector](https://github.com/dromara/hertzbeat/tree/master/collector)** Provide metrics data collection services.
> Use common protocols to remotely collect and obtain peer-to-peer metrics data.
- **[scheduler](https://github.com/dromara/hertzbeat/tree/master/scheduler)** Provide monitoring task scheduling service.
> Collection task management, scheduling and distribution of one-time tasks and periodic tasks.
- **[warehouse](https://github.com/dromara/hertzbeat/tree/master/warehouse)** Provide monitoring data warehousing services.
> Metrics data management, data query, calculation and statistics.
- **[alerter](https://github.com/dromara/hertzbeat/tree/master/alerter)** Provide alert service.
> Alarm calculation trigger, monitoring status linkage, alarm configuration, and alarm notification.
- **[web-app](https://github.com/dromara/hertzbeat/tree/master/web-app)** Provide web ui.
> Angular Web UI.   

![hertzBeat](https://cdn.jsdelivr.net/gh/dromara/hertzbeat/home/static/img/docs/hertzbeat-stru-en.svg)     

