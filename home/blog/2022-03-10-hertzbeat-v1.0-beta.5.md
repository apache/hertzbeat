---
title: HertzBeat v1.0.beta.5 Released, A User-Friendly Monitoring and Alert System  
author: tom  
author_title: tom   
author_url: https://github.com/tomsun28  
author_image_url: https://avatars.githubusercontent.com/u/24788200?s=400&v=4  
tags: [opensource]  
---

HertzBeat is an open-source monitoring and alert project that supports various monitoring types such as websites, APIs, PING, ports, databases, and full-site monitoring. It offers threshold alarms and notification alerts (email, webhook, DingTalk, WeChat Work, Feishu/Lark robot), and features a user-friendly visual operation interface. The project is incubated by Dromara and open-sourced by TanCloud.

Official websites: hertzbeat.com | tancloud.cn

This upgraded version includes a redesigned dashboard, support for multi-metric threshold expressions, enriched database monitoring types with the addition of MariaDB and PostgreSQL monitoring, and new help documentation on the console page. You are welcome to use it.

Version Features:

feature: Support for MariaDB monitoring type (#11)
feature: Dashboard reconstruction (#13)
feature: Alarm configuration supports multi-metric collections! Proposed by @pengliren, thanks (#10)
feature: Support for PostgreSQL database monitoring (#16)
New: Monitoring now starts with default probes.
New: Added MySQL collection metrics.
New: Added major monitoring categories, supporting custom monitoring page menu auto-rendering
New: Help links added to the operation page, improving custom and threshold help documentation
feat: Set the simulated browser to Chrome browser #Issues 14 contributed by @learning-code, thanks
BUG Fixes:

Changed '登陆' to '登录' to clarify confusion.
Documentation updated with FAQs, improved validation of HTTP parameters in the collector.
Optimized collector scheduling by canceling subsequent priorities if priority 0 fails.
bugfix: Illegal character in the website monitor path
bugfix: Adaptation issues with the dark theme (#10)
fix: Internationalization exception, release of authentication protection for the hierarchy interface

You are welcome to try it online at [https://console.tancloud.cn/](https://console.tancloud.cn/)

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
