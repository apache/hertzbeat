---
title: HertzBeat Enters GVP and Releases v1.0.beta.7, An Easy-to-Use, Friendly Real-time Monitoring Tool     
author: tom  
author_title: tom   
author_url: https://github.com/tomsun28  
author_image_url: https://avatars.githubusercontent.com/u/24788200?s=400&v=4  
tags: [opensource]
---

HertzBeat is an open-source monitoring and alerting project incubated by Dromara. It supports various types of monitoring, including websites, APIs, PING, ports, databases, the entire site, operating systems, etc., with threshold alerts, notification alerts (email, webhook, DingTalk, WeChat Work, Lark robots), and a user-friendly visual interface.

We're excited to announce that HertzBeat has been designated as a GVP - Gitee's Most Valuable Open Source Project!

![Screenshot 2022-04-08 at 09.14.44](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/8899bc4e836943dba2ec9efeec4ff629~tplv-k3u1fbpfcp-watermark.image?)

Brothers, help us STAR on Gitee, let's go! https://gitee.com/dromara/hertzbeat

Official Website: hertzbeat.com | tancloud.cn

Let's talk about the latest version. Looking at so many features, simply put, the main updates are:

- Support for ORACLE database monitoring, including basic information, tablespace, connection count, TPS, QPS, etc.
- Support for LINUX's CPU utilization rate, memory utilization rate, disk occupation related indicators, making LINUX monitoring more aligned with actual business needs.
- Front-end parameters now support KEY-VALUE. We can configure HTTP Headers and similar parameters on the page. Additionally, the parameter configuration has been optimized and revamped, hiding less commonly used alarm parameters for a cleaner look. Support for Windows batch startup scripts has also been added. The rest includes stability enhancements and some other minor fixes and requests.

Version Features:

1. Feature: Support for ORACLE database monitoring type-xgf, contributed by @gf-8, thanks.
2. Feature: ORACLE monitoring supports tablespaces, connections, qps, tps indicators.
3. Feature: LINUX monitoring supports setting timeout (#49).
4. Feature: Check if the website SSL certificate is expired (#50), suggested by @weihongbin, thanks.
5. Feature: Page configuration parameters support KEY-VALUE array (#57).
6. Feature: API and website monitoring support page configuration Headers and Params (#58)(#59).
7. Feature: API and website monitoring support page configuration basic auth, digest auth (#60).
8. Feature: HTTP port changes to 443 or 80 depending on whether SSL is enabled (#61).
9. Feature: Change default timeout from 3000 milliseconds to 6000 milliseconds (#55).
10. Feature: Make TDengine optional, not required (#62).
11. Feature: Support win bat service (#65).
12. Feature: Support hide advanced params define (#68).
13. Feature: Enable auto-redirect when 301 302 http code (#69).
14. Feature: Only collect available metrics when detect (#70).
15. Feature: [website api]monitor support keyword match (#72).
16. Feature: Support LINUX cpu usage, memory usage, disk free (#76).

BUG Fixes:
1. Add SQLServer related documentation, fix connection metrics failing to store in TDengine (#41).
2. Use Docker to deploy TDengine, opening TCP access port!16 contributed by @老姜bei, thanks.
3. Supplement Sureness configuration documentation to avoid misconfiguration leading to authority exceptions.
4. Bugfix: monitors always timeout alert (#67).
5. Code format and optimization contributed by @学习代码的小白, thanks.
6. Bugfix: remove oracle field - database_type due 11g not support contributed by @syongaaa, thanks.
7. Bugfix: fix Linux interface metrics no instance (#75).

Welcome to try it online at https://console.tancloud.cn.

-----------------------

> [HertzBeat](https://github.com/dromara/hertzbeat) is an open-source monitoring and alerting project supporting websites, APIs, PING, ports, databases, operating systems, etc., with a user-friendly visual interface.  
> We also offer a **[SAAS version monitoring cloud](https://console.tancloud.cn)**, so small teams and individuals no longer need to deploy a complicated monitoring system to monitor their web resources, **[log in to start](https://console.tancloud.cn)** for free.     
> HertzBeat supports [custom monitoring](https://hertzbeat.com/docs/advanced/extend-point), allowing the customization of monitoring types and metrics through YML file configuration to meet common personalized needs.   
> HertzBeat is modular, with `manager, collector, scheduler, warehouse, alerter` modules decoupled, facilitating understanding and custom development.       
> HertzBeat supports more flexible alarm configurations (calculation expressions), supporting alarm notifications, templates, and timely delivery through email, DingTalk, WeChat, Lark, etc.          
> Welcome to try and discover more in HertzBeat's [cloud environment TanCloud](https://console.tancloud.cn).          
> We are rapidly iterating and welcome participation in co-building the open-source ecosystem.

> HertzBeat's support for multiple types, easy expansion, and low coupling hopes to assist developers and small teams in quickly building their own monitoring systems.

You can understand the functionality through a demo video: https://www.bilibili.com/video/BV1DY4y1i7ts

Welcome to try it online [https://console.tancloud.cn](https://gitee.com/link?target=https%3A%2F%2Fconsole.tancloud.cn)

Optimized parameter input interface:
![Parameter Input Interface](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/c4b07908ba5a4b50a094a02dde6a38f3~tplv-k3u1fbpfcp-zoom-1.image "截屏2022-04-07 21.32.52.png")

New LINUX metrics:
![LINUX Metrics](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/92828224f8cd4cac84245aa4217b29e7~tplv-k3u1fbpfcp-zoom-1.image "截屏2022-04-07 17.50.22.png")

ORACLE Monitoring:   
Oh no! The oracle environment is gone, I didn't take a screenshot before, imagine one for now!

**Repository Addresses**

[Github](https://github.com/dromara/hertzbeat) https://github.com/dromara/hertzbeat      
[Gitee](https://gitee.com/dromara/hertzbeat) https://gitee.com/dromara/hertzbeat

If you've made it this far, consider giving a Star to support us, much appreciated, thank you!
