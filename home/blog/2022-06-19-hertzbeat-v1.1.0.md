---
title: Cloud Monitoring System HertzBeat v1.1.0 Released! Start Your Monitoring Journey with Just One Command!    
author: tom  
author_title: tom   
author_url: https://github.com/tomsun28  
author_image_url: https://avatars.githubusercontent.com/u/24788200?s=400&v=4  
tags: [opensource]
---

[HertzBeat](https://github.com/apache/hertzbeat), incubated by [Dromara](https://dromara.org) and open-sourced by [TanCloud](https://tancloud.cn), is an open-source monitoring and alerting project that supports various monitoring types such as websites, APIs, PING, ports, databases, entire sites, operating systems, middleware, etc. It features threshold alarms, notification alerts (email, webhook, DingTalk, WeChat Work, Lark robots), and a user-friendly visual interface.

**Official Website: [hertzbeat.com](https://hertzbeat.com) | [tancloud.cn](https://tancloud.cn)**

Hello everyone, HertzBeat v1.1.0 is released! In this version, we've added support for the SNMP protocol and implemented application monitoring for Windows operating systems using SNMP.
Another significant change is our default switch to using the H2 database instead of MYSQL for storage, making it easier for users to install and deploy. Now, you can install and experience HertzBeat with just a single Docker command: `docker run -d -p 1157:1157 --name hertzbeat apache/hertzbeat`
Let's Try It!

Thanks to all HertzBeat contributors! 👍👍

Features:

1. [[monitor]feature: Support for SNMP protocol and Windows OS monitoring #192](https://github.com/apache/hertzbeat/pull/192). Contributed by @ChineseTony
2. [[monitor] Default use of H2 database instead of MYSQL #191](https://github.com/apache/hertzbeat/pull/191)
3. [[manager] Support for internationalization of monitoring parameters, making internationalization more accessible #184](https://github.com/apache/hertzbeat/pull/184).
4. [[script] Support for amd64 and arm64 versions of Docker images #189](https://github.com/apache/hertzbeat/pull/189).
5. [[monitor]feature: Support for collecting multiple tablespaces metrics from Oracle #163](https://github.com/apache/hertzbeat/pull/163) Contributed by @brave4Time
6. [[monitor] Unified prefix "hzb_" added to database tables #193](https://github.com/apache/hertzbeat/pull/193) Issue from @shimingxy

Bugfixes:

1. [[monitor] Fix for the inability to collect CPU metrics on Tencent's CentOS version #164](https://github.com/apache/hertzbeat/pull/164) Contributed by @wyt199905.
2. [[manager] Fix for Oracle monitoring percentage metric collection issue #168](https://github.com/apache/hertzbeat/pull/168)
3. [[monitor] bugfix: Fix for Elasticsearch monitoring failure under basic authentication #174](https://github.com/apache/hertzbeat/pull/174) Contributed by @weifuqing
4. [Fix for monitoring failure due to ambiguous Oracle monitoring parameter "database name" #182](https://github.com/apache/hertzbeat/pull/182) @zklmcookle

Online at <https://console.tancloud.cn>.

---

⚠️ ⚠️⚠️⚠️Please note that upgrading to v1.1.0 from other versions requires running the following SQL script. Now, our table names have a unified prefix "hzb_prefix".

```properties
ALTER  TABLE alert RENAME TO hzb_alert;
ALTER  TABLE alert_define RENAME TO hzb_alert_define;
ALTER  TABLE alert_define_monitor_bind RENAME TO hzb_alert_define_monitor_bind;
ALTER  TABLE monitor RENAME TO hzb_monitor;
ALTER  TABLE notice_receiver RENAME TO hzb_notice_receiver;
ALTER  TABLE notice_rule RENAME TO hzb_notice_rule;
ALTER  TABLE param RENAME TO hzb_param;
ALTER  TABLE param_define RENAME TO hzb_param_define;
ALTER  TABLE tag RENAME TO hzb_tag;
ALTER  TABLE tag_monitor_bind RENAME TO hzb_tag_monitor_bind;
commit;
```

Have Fun!

---

> [HertzBeat](https://github.com/apache/hertzbeat), incubated by [Dromara](https://dromara.org) and open-sourced by [TanCloud](https://tancloud.cn), is an open-source project supporting monitoring for websites, APIs, PING, ports, databases, operating systems, and more, with a user-friendly visual interface.  
> We also offer a [SAAS cloud monitoring version](https://console.tancloud.cn), allowing small and medium teams and individuals to start monitoring their web resources without deploying a complicated monitoring system, simply [log in to start](https://console.tancloud.cn) your monitoring journey for free.  
> HertzBeat supports custom monitoring; you can customize the monitoring types and metrics you need through configuration of the YML file to meet common personalized needs.  
> HertzBeat is modular, with `manager, collector, scheduler, warehouse, alerter` modules decoupled, facilitating understanding and custom development.  
> HertzBeat supports more flexible alarm configurations (calculation expressions), notification alerts, templates, and real-time delivery via email, DingTalk, WeChat, Lark, etc.  
> Welcome to try and discover more in HertzBeat's [cloud environment TanCloud](https://console.tancloud.cn).  
> We are rapidly iterating and welcome participation to join in co-building the open-source ecosystem.
>
> HertzBeat's support for multiple types, easy expansion, and low coupling hopes to help developers and small and medium teams quickly build their own monitoring systems.

**Repository Addresses**

[Github](https://github.com/apache/hertzbeat) <https://github.com/apache/hertzbeat>
[Gitee](https://gitee.com/hertzbeat/hertzbeat) <https://gitee.com/hertzbeat/hertzbeat>
