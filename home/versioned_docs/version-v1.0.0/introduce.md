---
id: introduce  
title: HertzBeat赫兹跳动     
sidebar_label: 介绍
slug: /
---

> 易用友好的监控告警系统。

![tan-cloud](https://cdn.jsdelivr.net/gh/dromara/hertzbeat@gh-pages/img/badge/web-monitor.svg)
![tan-cloud](https://cdn.jsdelivr.net/gh/dromara/hertzbeat@gh-pages/img/badge/ping-connect.svg)
![tan-cloud](https://cdn.jsdelivr.net/gh/dromara/hertzbeat@gh-pages/img/badge/port-available.svg)
![tan-cloud](https://cdn.jsdelivr.net/gh/dromara/hertzbeat@gh-pages/img/badge/database-monitor.svg)
![tan-cloud](https://cdn.jsdelivr.net/gh/dromara/hertzbeat@gh-pages/img/badge/os-monitor.svg)
![tan-cloud](https://cdn.jsdelivr.net/gh/dromara/hertzbeat@gh-pages/img/badge/custom-monitor.svg)
![tan-cloud](https://cdn.jsdelivr.net/gh/dromara/hertzbeat@gh-pages/img/badge/threshold.svg)
![tan-cloud](https://cdn.jsdelivr.net/gh/dromara/hertzbeat@gh-pages/img/badge/alert.svg)

## 📫 前言   

> 毕业后投入很多业余时间也做了一些开源项目,[Sureness](https://github.com/dromara/sureness) [Bootshiro](https://gitee.com/tomsun28/bootshiro) [Issues-translate-action](https://github.com/usthe/issues-translate-action) ,
> 当时上班有空就回答网友问题，下班回家写开源代码，远程帮人看问题，还总感觉时间不够用，当时想如果不去上班能做自己热爱的该多好。  
> 年轻就要折腾，何况还是自己很想做的。于是乎，21年底我放弃激励裸辞开始全职开源了(这里感谢老婆大人的全力支持)，也是第一次全职创业。
> 自己在APM领域做了多年，当然这次创业加开源的方向也就是老本行APM监控系统，我们开发一个支持多种监控指标(更多监控类型指标正在适配中)，拥有自定义监控，支持阈值告警通知等功能，面向开发者友好的开源监控项目-HertzBeat赫兹跳动。
> 想到很多开发者和团队拥有云上资源，可能只需要使用监控服务而并不想部署监控系统，我们也提供了可以直接登录使用的SAAS云监控版本-[TanCloud探云](https://console.tancloud.cn)。   
> 希望大家多多支持点赞，非常感谢。 

## 🎡 <font color="green">介绍</font>

> [HertzBeat赫兹跳动](https://github.com/dromara/hertzbeat) 是由[Dromara](https://dromara.org)孵化，[TanCloud](https://tancloud.cn)开源的一个支持网站，API，PING，端口，数据库，操作系统等监控类型，拥有易用友好的可视化操作界面的开源监控告警项目。  
> 当然，我们也提供了对应的[SAAS云监控版本](https://console.tancloud.cn)，中小团队和个人无需再为了监控自己的网站资源，而去部署一套繁琐的监控系统，[登录即可免费开始](https://console.tancloud.cn)监控之旅。  
> HertzBeat 支持自定义监控，只用通过配置YML文件我们就可以自定义需要的监控类型和指标，来满足常见的个性化需求。
> HertzBeat 模块化，`manager, collector, scheduler, warehouse, alerter` 各个模块解耦合，方便理解与定制开发。    
> HertzBeat 支持更自由化的告警配置(计算表达式)，支持告警通知，告警模版，邮件钉钉微信飞书等及时通知送达  
> 欢迎登录 HertzBeat 的 [云环境TanCloud](https://console.tancloud.cn) 试用发现更多。   
> 我们正在快速迭代中，欢迎参与加入共建项目开源生态。

> `HertzBeat`的多类型支持，易扩展，低耦合，希望能帮助开发者和中小团队快速搭建自有监控系统。


## 🥐 模块  

- **[manager](https://github.com/dromara/hertzbeat/tree/master/manager)** 提供监控管理,系统管理基础服务
> 提供对监控的管理，监控应用配置的管理，系统用户租户后台管理等。
- **[collector](https://github.com/dromara/hertzbeat/tree/master/collector)** 提供监控数据采集服务
> 使用通用协议远程采集获取对端指标数据。
- **[warehouse](https://github.com/dromara/hertzbeat/tree/master/warehouse)** 提供监控数据仓储服务
> 采集指标结果数据管理，数据落盘，查询，计算统计。
- **[alerter](https://github.com/dromara/hertzbeat/tree/master/alerter)** 提供告警服务
> 告警计算触发，任务状态联动，告警配置，告警通知。
- **[web-app](https://github.com/dromara/hertzbeat/tree/master/web-app)** 提供可视化控制台页面
> 监控告警系统可视化控制台前端(angular+ts+zorro)  

![hertzBeat](https://tancloud.gd2.qingstor.com/img/docs/hertzbeat-stru.svg)   

