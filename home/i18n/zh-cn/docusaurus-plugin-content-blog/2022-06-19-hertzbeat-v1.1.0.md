---
title: 云监控系统 HertzBeat v1.1.0 发布！一条命令即可开启监控之旅！    
author: tom  
author_title: tom   
author_url: https://github.com/tomsun28  
author_image_url: https://avatars.githubusercontent.com/u/24788200?s=400&v=4  
tags: [opensource]
---

[HertzBeat 赫兹跳动](https://github.com/apache/hertzbeat) 是由 [Dromara](https://dromara.org) 孵化，[TanCloud](https://tancloud.cn) 开源的一个支持网站，API，PING，端口，数据库，全站，操作系统，中间件等监控类型，支持阈值告警，告警通知 (邮箱，webhook，钉钉，企业微信，飞书机器人)，拥有易用友好的可视化操作界面的开源监控告警项目。

**官网: [hertzbeat.com](https://hertzbeat.apache.org) | [tancloud.cn](https://tancloud.cn)**

大家好，HertzBeat v1.1.0 发布啦！这个版本我们支持了SNMP协议，并使用SNMP协议监控支持了windwos操作系统的应用监控。
另一个重大变更是我们默认使用了H2数据库来替换MYSQL数据库作为存储，来方便使用者们的安装部署，现在只需要一条docker命令即可安装体验hertzbeat ： `docker run -d -p 1157:1157 --name hertzbeat apache/hertzbeat`
Let's Try It!

感谢hertzbeat贡献者们的贡献！👍👍

Feature：

1. [[monitor]feature: 支持SNMP协议和Windows操作系统监控 #192](https://github.com/apache/hertzbeat/pull/192).  contribute by @ChineseTony
2. [[monitor]默认使用H2数据库替换MYSQL数据库 #191](https://github.com/apache/hertzbeat/pull/191)
3. [[manager]支持监控参数的英文国际化，国际化更近一步 #184](https://github.com/apache/hertzbeat/pull/184).
4. [[script]支持了amd64和arm64版本的docker 镜像 #189](https://github.com/apache/hertzbeat/pull/189).
5. [[monitor]feature: 支持采集oracle多表空间指标数据 #163](https://github.com/apache/hertzbeat/pull/163) contribute by @brave4Time
6. [[monitor]数据库表统一添加前缀 hzb_ #193](https://github.com/apache/hertzbeat/pull/193) issue from @shimingxy

Bugfix.

1. [[monitor]修改在tencent centos版本下无法采集CPU指标问题 #164](https://github.com/apache/hertzbeat/pull/164) contribute by @wyt199905 .
2. [[manager]修复oracle监控percentage指标采集问题 #168](https://github.com/apache/hertzbeat/pull/168)
3. [[monitor] bugfix: 修复elasticsearch监控在basic认证情况下采集失败 #174](https://github.com/apache/hertzbeat/pull/174) contribute by @weifuqing
4. [修改oracle监控参数[数据库名称]有歧义导致的监控失败 #182](https://github.com/apache/hertzbeat/pull/182) @zklmcookle

Online <https://console.tancloud.cn>.

---

⚠️ ⚠️⚠️⚠️请注意其它版本升级到v1.1.0需要先执行下面的SQL脚本.  现在我们的表名称有个统一前缀 hzb_ prefix.

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

> [HertzBeat赫兹跳动](https://github.com/apache/hertzbeat) 是由 [Dromara](https://dromara.org) 孵化，[TanCloud](https://tancloud.cn)开源的一个支持网站，API，PING，端口，数据库，操作系统等监控类型，拥有易用友好的可视化操作界面的开源监控告警项目。  
> 当然，我们也提供了对应的[SAAS云监控版本](https://console.tancloud.cn)，中小团队和个人无需再为了监控自己的网站资源，而去部署一套繁琐的监控系统，[登录即可免费开始](https://console.tancloud.cn)监控之旅。  
> HertzBeat 支持自定义监控，只用通过配置YML文件我们就可以自定义需要的监控类型和指标，来满足常见的个性化需求。
> HertzBeat 模块化，`manager, collector, scheduler, warehouse, alerter` 各个模块解耦合，方便理解与定制开发。
> HertzBeat 支持更自由化的告警配置(计算表达式)，支持告警通知，告警模板，邮件钉钉微信飞书等及时通知送达  
> 欢迎登录 HertzBeat 的 [云环境TanCloud](https://console.tancloud.cn) 试用发现更多。
> 我们正在快速迭代中，欢迎参与加入共建项目开源生态。
>
> `HertzBeat` 的多类型支持，易扩展，低耦合，希望能帮助开发者和中小团队快速搭建自有监控系统。

**仓库地址**

[Github](https://github.com/apache/hertzbeat) <https://github.com/apache/hertzbeat>
[Gitee](https://gitee.com/hertzbeat/hertzbeat) <https://gitee.com/hertzbeat/hertzbeat>
