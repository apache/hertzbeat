---
title: HertzBeat Monitoring System v1.1.0 Released! Start Your Monitoring Journey with Just One Command!    
author: tom  
author_title: tom   
author_url: https://github.com/tomsun28
author_image_url: https://avatars.githubusercontent.com/u/24788200?s=400&v=4
tags: [opensource]
---

[HertzBeat](https://github.com/apache/hertzbeat), incubated by [Dromara](https://dromara.org) and open-sourced by [TanCloud](https://tancloud.cn), is an open-source monitoring and alerting project that supports website, API, PING, port, database, site-wide, operating system, middleware monitoring types, and more. It features threshold alarms, alarm notifications (email, webhook, DingTalk, WeChat Work, Feishu bot), and a user-friendly visual interface.

**Official Website: [hertzbeat.com](https://hertzbeat.apache.org) | [tancloud.cn](https://tancloud.cn)**

Hello everyone, HertzBeat v1.1.0 is here! In this version, we've added support for the SNMP protocol and enabled application monitoring for Windows operating systems using SNMP.  
Another major change is that we've switched from using MYSQL to H2 database by default for storage, making it easier for users to install and deploy. Now, you can get started with HertzBeat using just a single docker command: `docker run -d -p 1157:1157 --name hertzbeat apache/hertzbeat`
Let's Try It!

Thanks to all contributors of HertzBeat! 👍👍

Features:

1. [[monitor]feature: Support for SNMP protocol and Windows operating system monitoring #192](https://github.com/apache/hertzbeat/pull/192). Contributed by @ChineseTony
2. [[monitor] Default switch to H2 database instead of MYSQL #191](https://github.com/apache/hertzbeat/pull/191)
3. [[manager] Support for English internationalization of monitoring parameters, making internationalization a step closer #184](https://github.com/apache/hertzbeat/pull/184).
4. [[script] Support for amd64 and arm64 versions of the docker image #189](https://github.com/apache/hertzbeat/pull/189).
5. [[monitor]feature: Support for collecting multiple tablespace metrics from Oracle #163](https://github.com/apache/hertzbeat/pull/163) Contributed by @brave4Time
6. [[monitor] Database tables now have a unified prefix hzb_ #193](https://github.com/apache/hertzbeat/pull/193) Issue raised by @shimingxy

Bugfixes:

1. [[monitor] Fixed an issue where CPU metrics could not be collected on Tencent's CentOS version #164](https://github.com/apache/hertzbeat/pull/164) Contributed by @wyt199905.
2. [[manager] Fixed an issue with percentage metric collection for Oracle monitoring #168](https://github.com/apache/hertzbeat/pull/168)
3. [[monitor] bugfix: Fixed an issue with Elasticsearch monitoring failing under basic authentication #174](https://github.com/apache/hertzbeat/pull/174) Contributed by @weifuqing
4. [Fixed an issue where Oracle monitoring failed due to ambiguous database name parameter #182](https://github.com/apache/hertzbeat/pull/182) @zklmcookle

Online at [https://console.tancloud.cn](https://console.tancloud.cn).

---
⚠️ ⚠️⚠️⚠️Please note that upgrading to v1.1.0 from other versions requires running the following SQL script. Now, our table names have a unified prefix hzb_prefix.

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

> [HertzBeat](https://github.com/apache/hertzbeat), incubated by [Dromara](https://dromara.org) and open-sourced by [TanCloud](https://tancloud.cn), is an open-source monitoring and alerting project that supports monitoring types such as websites, APIs, PING, ports, databases, operating systems, etc., with a user-friendly and easy-to-use visual interface.  
> We also offer a [SaaS cloud monitoring version](https://console.tancloud.cn) for small and medium teams and individuals, eliminating the need to deploy a complicated monitoring system to monitor their web resources. [Sign up to start](https://console.tancloud.cn) your monitoring journey for free.  
> HertzBeat supports custom monitoring; by configuring the YML file, we can customize the required monitoring types and metrics to meet common personalized needs.  
> HertzBeat is modular, with `manager, collector, scheduler, warehouse, alerter` modules decoupled, making it easy to understand and customize development.  
> HertzBeat supports more flexible alarm configurations (calculation expressions) and alarm notifications, including alarm templates, emails, DingTalk, WeChat, Feishu, etc., for timely delivery of notifications.  
> Welcome to log in to HertzBeat's [cloud environment TanCloud](https://console.tancloud.cn) to try and discover more.  
> We are in rapid iteration and welcome participation in co-building the open-source ecosystem.
>
> HertzBeat's support for multiple types, easy expansion, and low coupling aims to help developers and small and medium teams quickly build their own monitoring systems.

**Repository Addresses**

[Github](https://github.com/apache/hertzbeat) <https://github.com/apache/hertzbeat>
[Gitee](https://gitee.com/hertzbeat/hertzbeat) <https://gitee.com/hertzbeat/hertzbeat>
