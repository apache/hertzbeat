---
title: Cloud Monitoring System HertzBeat v1.0 Officially Released   
author: tom  
author_title: tom   
author_url: https://github.com/tomsun28  
author_image_url: https://avatars.githubusercontent.com/u/24788200?s=400&v=4  
tags: [opensource]
---

HertzBeat, incubated by Dromara and open-sourced by TanCloud, is an open-source monitoring and alerting project that supports a variety of monitoring types including websites, APIs, PING, ports, databases, full-site, operating systems, middleware, etc.  
It supports threshold alarms and notification alerts (email, webhook, DingTalk, WeCom, Feishu robots) and has an easy-to-use, friendly visual operation interface.

Official Website: hertzbeat.com | tancloud.cn

From v1.0-beta.1 to v1.0-beta.8, after multiple iterations and improvements, we are excited to announce the official release of HertzBeat v1.0.

We would like to thank the HertzBeat Contributors for their contributions since version beta.1 and the community and users for their support. This version adds support for Redis monitoring (contributed by @gcdd1993), covering a comprehensive range of performance indicators such as Redis memory and CPU, to fully monitor Redis. Multiple bugs have been fixed to further enhance stability.

<table>
  <tr>
    <td align="center"><a href="https://github.com/tomsun28"><img src="https://avatars.githubusercontent.com/u/24788200?v=4?s=100" width="100px;" alt=""/><br /><sub><b>tomsun28</b></sub></a><br /><a href="https://github.com/tomsun28/hertzbeat/commits?author=tomsun28" title="Code">💻</a> <a href="https://github.com/tomsun28/hertzbeat/commits?author=tomsun28" title="Documentation">📖</a> <a href="#design-tomsun28" title="Design">🎨</a></td>
    <td align="center"><a href="https://github.com/wang1027-wqh"><img src="https://avatars.githubusercontent.com/u/71161318?v=4?s=100" width="100px;" alt=""/><br /><sub><b>会编程的王学长</b></sub></a><br /><a href="https://github.com/tomsun28/hertzbeat/commits?author=wang1027-wqh" title="Code">💻</a> <a href="https://github.com/tomsun28/hertzbeat/commits?author=wang1027-wqh" title="Documentation">📖</a> <a href="#design-wang1027-wqh" title="Design">🎨</a></td>
    <td align="center"><a href="https://www.maxkey.top/"><img src="https://avatars.githubusercontent.com/u/1563377?v=4?s=100" width="100px;" alt=""/><br /><sub><b>MaxKey</b></sub></a><br /><a href="https://github.com/tomsun28/hertzbeat/commits?author=shimingxy" title="Code">💻</a> <a href="#design-shimingxy" title="Design">🎨</a> <a href="#ideas-shimingxy" title="Ideas, Planning, & Feedback">🤔</a></td>
    <td align="center"><a href="https://blog.gcdd.top/"><img src="https://avatars.githubusercontent.com/u/26523525?v=4?s=100" width="100px;" alt=""/><br /><sub><b>观沧海</b></sub></a><br /><a href="https://github.com/tomsun28/hertzbeat/commits?author=gcdd1993" title="Code">💻</a> <a href="#design-gcdd1993" title="Design">🎨</a> <a href="https://github.com/tomsun28/hertzbeat/issues?q=author%3Agcdd1993" title="Bug reports">🐛</a></td>
    <td align="center"><a href="https://github.com/a25017012"><img src="https://avatars.githubusercontent.com/u/32265356?v=4?s=100" width="100px;" alt=""/><br /><sub><b>yuye</b></sub></a><br /><a href="https://github.com/tomsun28/hertzbeat/commits?author=a25017012" title="Code">💻</a> <a href="https://github.com/tomsun28/hertzbeat/commits?author=a25017012" title="Documentation">📖</a></td>
    <td align="center"><a href="https://github.com/jx10086"><img src="https://avatars.githubusercontent.com/u/5323228?v=4?s=100" width="100px;" alt=""/><br /><sub><b>jx10086</b></sub></a><br /><a href="https://github.com/tomsun28/hertzbeat/commits?author=jx10086" title="Code">💻</a> <a href="https://github.com/tomsun28/hertzbeat/issues?q=author%3Ajx10086" title="Bug reports">🐛</a></td>
    <td align="center"><a href="https://github.com/winnerTimer"><img src="https://avatars.githubusercontent.com/u/76024658?v=4?s=100" width="100px;" alt=""/><br /><sub><b>winnerTimer</b></sub></a><br /><a href="https://github.com/tomsun28/hertzbeat/commits?author=winnerTimer" title="Code">💻</a> <a href="https://github.com/tomsun28/hertzbeat/issues?q=author%3AwinnerTimer" title="Bug reports">🐛</a></td>
  </tr>
  <tr>
    <td align="center"><a href="https://github.com/goo-kits"><img src="https://avatars.githubusercontent.com/u/13163673?v=4?s=100" width="100px;" alt=""/><br /><sub><b>goo-kits</b></sub></a><br /><a href="https://github.com/tomsun28/hertzbeat/commits?author=goo-kits" title="Code">💻</a> <a href="https://github.com/tomsun28/hertzbeat/issues?q=author%3Agoo-kits" title="Bug reports">🐛</a></td>
    <td align="center"><a href="https://github.com/brave4Time"><img src="https://avatars.githubusercontent.com/u/105094014?v=4?s=100" width="100px;" alt=""/><br /><sub><b>brave4Time</b></sub></a><br /><a href="https://github.com/tomsun28/hertzbeat/commits?author=brave4Time" title="Code">💻</a> <a href="https://github.com/tomsun28/hertzbeat/issues?q=author%3Abrave4Time" title="Bug reports">🐛</a></td>
    <td align="center"><a href="https://github.com/walkerlee-lab"><img src="https://avatars.githubusercontent.com/u/8426753?v=4?s=100" width="100px;" alt=""/><br /><sub><b>WalkerLee</b></sub></a><br /><a href="https://github.com/tomsun28/hertzbeat/commits?author=walkerlee-lab" title="Code">💻</a> <a href="https://github.com/tomsun28/hertzbeat/issues?q=author%3Awalkerlee-lab" title="Bug reports">🐛</a></td>
    <td align="center"><a href="https://github.com/fullofjoy"><img src="https://avatars.githubusercontent.com/u/30247571?v=4?s=100" width="100px;" alt=""/><br /><sub><b>jianghang</b></sub></a><br /><a href="https://github.com/tomsun28/hertzbeat/commits?author=fullofjoy" title="Code">💻</a> <a href="https://github.com/tomsun28/hertzbeat/issues?q=author%3Afullofjoy" title="Bug reports">🐛</a></td>
    <td align="center"><a href="https://github.com/ChineseTony"><img src="https://avatars.githubusercontent.com/u/24618786?v=4?s=100" width="100px;" alt=""/><br /><sub><b>ChineseTony</b></sub></a><br /><a href="https://github.com/tomsun28/hertzbeat/commits?author=ChineseTony" title="Code">💻</a></td>
  </tr>
</table>

Feature：

1. [[monitor] feature: support redis protocol #142](https://github.com/apache/hertzbeat/pull/142)   contribute by @gcdd1993
2. Copyright & NOTICE contribute by @shimingxy
3. [[alerter]bugfix: support system alert trigger time #144](https://github.com/apache/hertzbeat/pull/144).
4. [[collector]feature: reuse redis connection cache #146](https://github.com/apache/hertzbeat/pull/146).
5. [[collector]handle sensitive info such as account and password in log #159](https://github.com/apache/hertzbeat/pull/159) idea from @goo-kits
6. [Feature add zookeeper help Doc #137](https://github.com/apache/hertzbeat/pull/137) contributr by @wang1027-wqh

Bug fix.

1. [[monitor]bugfix: fix load resource bundle error when local en.HK #131](https://github.com/apache/hertzbeat/pull/131).
2. [[web-app]bugfix:fix side menu invisible when theme is dark #132](https://github.com/apache/hertzbeat/pull/132).
3. [[monitor]bugfix: fix only one filter label can be set when notification #140](https://github.com/apache/hertzbeat/pull/140).  issue by @daqianxiaoyao
4. [[td-engine store]bugfix: fix log #150](https://github.com/apache/hertzbeat/pull/150). contribute by @ChineseTony
5. [[collector]bugfix: fix warehouse data queue consume error #153](https://github.com/apache/hertzbeat/pull/153).  issue by @daqianxiaoyao
6. [[web-app]bugfix:fix input blocking when input error in dark theme #157](https://github.com/apache/hertzbeat/pull/157). issue by @ConradWen

Online <https://console.tancloud.cn>.

-----------------------

> [HertzBeat](https://github.com/apache/hertzbeat), incubated by [Dromara](https://dromara.org) and open-sourced by [TanCloud](https://tancloud.cn), is an open-source monitoring and alerting project with a user-friendly visual interface that supports monitoring types such as websites, APIs, PING, ports, databases, operating systems, and more.
> Of course, we also provide a corresponding [SaaS cloud monitoring version](https://console.tancloud.cn), so small and medium-sized teams and individuals no longer need to deploy a cumbersome monitoring system to monitor their website resources; you can [log in](https://console.tancloud.cn) to start monitoring for free.
>
> HertzBeat supports custom monitoring; by configuring the YML file, we can customize the required monitoring types and metrics to meet common personalized needs.
> HertzBeat is modular, with manager, collector, scheduler, warehouse, alerter modules decoupled, making it easy to understand and customize for development.
> HertzBeat supports more flexible alarm configurations (calculation expressions), supports alarm notifications, alarm templates, and timely delivery of notifications via email, DingTalk, WeChat, Feishu, etc.
> Feel free to log in to HertzBeat's cloud environment, [TanCloud](https://console.tancloud.cn), to try it out and discover more.
> We are rapidly iterating and welcome participation in joining and contributing to the open-source ecosystem.
>
> The multi-type support, easy expansion, and low coupling of `HertzBeat` aim to help developers and small to medium-sized teams quickly build their own monitoring systems.

**Repository url**

[Github](https://github.com/apache/hertzbeat) <https://github.com/apache/hertzbeat>
[Gitee](https://gitee.com/hertzbeat/hertzbeat) <https://gitee.com/hertzbeat/hertzbeat>
