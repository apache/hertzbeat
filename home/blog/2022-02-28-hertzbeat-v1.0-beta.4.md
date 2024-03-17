---
title: HertzBeat Hertz Beat v1.0.beta.4 Released, User-Friendly Monitoring and Alert System   
author: tom  
author_title: tom   
author_url: https://github.com/tomsun28  
author_image_url: https://avatars.githubusercontent.com/u/24788200?s=400&v=4  
tags: [opensource]  
---

HertzBeat is an open-source monitoring and alert project incubated by Dromara and released by TanCloud. It supports various monitoring types such as websites, APIs, PING, ports, databases, and full-site. It features threshold alarms and notification alerts (email, webhook, DingTalk, WeCom, Feishu/Lark robots), and has a user-friendly and easy-to-use visual interface.

Official Website: hertzbeat.com | tancloud.cn

This upgrade version includes a large number of features and fixes, such as urgently needed account user configurations, enriched mainstream third-party notification alerts (WeCom robots, DingTalk robots, Feishu/Lark robots), better-looking email templates, and custom mail servers. Welcome to use.

Version Features:

1. Alert Notifications: Integrated Feishu official WebHook to push alert information #PR9 contributed by @learning-code thanks
2. Alert Notifications: Implemented WeCom WebHook for alert information push #PR8 contributed by @learning-code thanks
3. Alert Notifications: Optimized alert email notification templates contributed by @learning-code thanks
4. Alert Notifications: Integrated DingTalk group robot to push alert information
5. Accounts: Exposed support for YML file configuration of login user account information
6. Support for custom mail servers
7. Added Help Center, help documentation for monitoring alerts and other functions during use. [https://tancloud.cn/docs/help/guide](https://tancloud.cn/docs/help/guide)
8. DOC other document updates, local startup help
9. New LOGO update
10. Monitoring collection interval time extended to 7 days
11. Added controller interface input parameter limiting modifier contributed by @learning-code thanks

BUG Fixes
1. Fixed the validation of the monitoring host parameter.
2. fixBug with custom mail server not taking effect
3. Email page optimization, fix alert level not translated
4. fix after deleting monitoring, the associated alert definition was not deleted
5. Adjusted JVM startup memory size, fix OOM
6. fixbug after restart, the state of abnormal monitoring could not trigger recovery alerts
7. fix pmd error
8. bugfix after setting alert, the button was still spinning
9. fix redundant tenant ID dependency
10. fix email type error in receiver, adjusted pop-up box size
11. fixbug when alert definition association monitoring does not exist, an exception occurs

Welcome to try it online at https://console.tancloud.cn

Upgrade Notice ⚠️

For upgrades from 1.0-beta2, the MYSQL database needs to execute:
ALTER TABLE alert_define_monitor_bind DROP monitor_name;

For upgrades from 1.0-beta2 and 1.0-beta3, the MYSQL database needs to execute:
ALTER TABLE notice_receiver ADD access_token varchar(255);

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
