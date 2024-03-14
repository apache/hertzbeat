---
title: HertzBeat Heartbeat v1.0.beta.6 Released, Linux Monitoring is Coming 
author: tom  
author_title: tom   
author_url: https://github.com/tomsun28  
author_image_url: https://avatars.githubusercontent.com/u/24788200?s=400&v=4  
tags: [opensource]  
---

HertzBeat Heartbeat, incubated by Dromara and open-sourced by TanCloud, is an open-source monitoring and alerting project that supports various monitoring types including websites, APIs, PING, ports, databases, operating systems, and full-site monitoring. It features threshold alarms and notification methods (email, webhook, DingTalk, WeChat Work, Feishu bots), and provides a user-friendly visual interface for easy operation.

Official websites: hertzbeat.com | tancloud.cn

This updated version includes much-requested support for Linux operating system monitoring, covering metrics such as CPU, memory, disk, network interfaces, and importantly, it also introduces SSH custom support. This makes it convenient to script and monitor the desired Linux metrics. Additionally, there's new support for mainstream database monitoring like Microsoft SQL Server, and more features are available for use.

Version Features:

Feature: Added support for Linux operating system monitoring type (supports monitoring metrics such as CPU, memory, disk, network cards) (#20)
Feature: Added support for Microsoft SQL Server database monitoring type (#37)
Feature: Added docker-compose deployment solution (#27) contributed by @jx10086, thanks
Feature: Monitoring list now supports status filtering and field search functions (#29)
Feature: Added timeout setting for database queries like MySQL, PostgreSQL, etc. (#18) contributed by @学习代码的小白
Changed [纳管] to [监控] and [探测] to [测试] in the user interface
Feature: Add GitHub build and translate action (#22)
Feature: Added contribution guide, documentation for starting local code
Docs: Specified MySQL and TDengine versions to avoid environmental issues
Bug Fixes:

Fix: Issues with creating too many links due to poor link reuse leading to abnormal monitoring (#26)
Fix: Global monitoring search result anomalies on the page (#28) issue by @Suremotoo
Code optimization #I4U9BT contributed by @学习代码的小白
Fix: Occasional misjudgment of port occupation by service startup scripts
Timezone formatting to local timezone (#35)
Fix: JDBC parsing exception introduced in this version (#36)
Fix: Deadlock issue with concurrent JDBC registration loading due to SPI mechanism (#40)

Welcome to try it online at https://console.tancloud.cn.

-----------------------

> [HertzBeat](https://github.com/dromara/hertzbeat), incubated by [Dromara](https://dromara.org) and open-sourced by [TanCloud](https://tancloud.cn), is an open-source monitoring and alerting project with a user-friendly visual interface that supports monitoring types such as websites, APIs, PING, ports, databases, operating systems, and more.
> Of course, we also provide a corresponding [SAAS cloud monitoring version](https://console.tancloud.cn), so small and medium-sized teams and individuals no longer need to deploy a cumbersome monitoring system to monitor their website resources; you can [log in](https://console.tancloud.cn) to start monitoring for free.

> HertzBeat supports custom monitoring; by configuring the YML file, we can customize the required monitoring types and metrics to meet common personalized needs.
> HertzBeat is modular, with manager, collector, scheduler, warehouse, alerter modules decoupled, making it easy to understand and customize for development.
> HertzBeat supports more flexible alarm configurations (calculation expressions), supports alarm notifications, alarm templates, and timely delivery of notifications via email, DingTalk, WeChat, Feishu, etc.
> Feel free to log in to HertzBeat's cloud environment, [TanCloud](https://console.tancloud.cn), to try it out and discover more.
> We are rapidly iterating and welcome participation in joining and contributing to the open-source ecosystem.

> The multi-type support, easy expansion, and low coupling of `HertzBeat` aim to help developers and small to medium-sized teams quickly build their own monitoring systems.

You can get a clear understanding of the functionality through the demo video: [https://www.bilibili.com/video/BV1DY4y1i7ts](https://www.bilibili.com/video/BV1DY4y1i7ts)



##### Welcome to contact us! 

**WeChat Group**   

Add WeChat `tan-cloud` or scan the QR code below to be added to the WeChat group. 
<img alt="tan-cloud" src="https://cdn.jsdelivr.net/gh/dromara/hertzbeat@gh-pages/img/docs/help/tan-cloud-wechat.jpg" width="200"/>

**QQ Group**  

Join QQ group `236915833` or scan the QR code below to join the

<img alt="tan-cloud" src="https://cdn.jsdelivr.net/gh/dromara/hertzbeat@gh-pages/img/docs/help/qq-qr.jpg" width="200"/>

**Repository url**      

[Github](https://github.com/dromara/hertzbeat) https://github.com/dromara/hertzbeat      
[Gitee](https://gitee.com/dromara/hertzbeat) https://gitee.com/dromara/hertzbeat    

If you have read this far, why not give us a star? We would greatly appreciate it, thank you!
