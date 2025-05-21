---
title: 云监控系统 HertzBeat v1.1.1 发布！   
author: tom  
author_title: tom   
author_url: https://github.com/tomsun28  
author_image_url: https://avatars.githubusercontent.com/u/24788200?s=400&v=4  
tags: [opensource]
---

[HertzBeat 赫兹跳动](https://github.com/apache/hertzbeat) 是由 [Dromara](https://dromara.org) 孵化，[TanCloud](https://tancloud.cn) 开源的一个支持网站，API，PING，端口，数据库，全站，操作系统，中间件等监控类型，支持阈值告警，告警通知 (邮箱，webhook，钉钉，企业微信，飞书机器人)，拥有易用友好的可视化操作界面的开源监控告警项目。

**官网: [hertzbeat.com](https://hertzbeat.com) | [tancloud.cn](https://tancloud.cn)**

大家好，HertzBeat v1.1.1 发布啦！这个版本带来了自定义监控增强，采集指标数据可以作为变量赋值给下一个采集。修复了若干bug，提升整体稳定性。

只需要一条docker命令即可安装体验hertzbeat ：
`docker run -d -p 1157:1157 --name hertzbeat apache/hertzbeat`

感谢hertzbeat贡献者们的贡献！👍👍

Feature：

1. [[script] feature 升级docker的基础镜像为 openjdk:11.0.15-jre-slim #205](https://github.com/apache/hertzbeat/pull/205)
2. [[monitor] 支持前置采集指标数据作为变量赋值给下一采集流程 #206](https://github.com/apache/hertzbeat/pull/206).
3. [[collector] 使用基本的http headers头实现basic auth替换前置模式 #212](https://github.com/apache/hertzbeat/pull/212)
4. [[manager,alerter] 支持告警通知设置钉钉机器人微信飞书自定义 webhook url  #213](https://github.com/apache/hertzbeat/pull/213)
5. [[monitor] feature 更新数值指标数据不带末尾为0的小数点 #217](https://github.com/apache/hertzbeat/pull/217)
6. [[web-app]feature:toggle [enable and cancel] button #218](https://github.com/apache/hertzbeat/pull/218)
7. [[manager] 更新监控define yml文件前缀名称 "app" or "param"，便于自定义监控区别 #221](https://github.com/apache/hertzbeat/pull/221)

Bugfix.

1. [[update] docker-compose 添加jpa自动执行脚本,删除sql脚本 #198](https://github.com/apache/hertzbeat/pull/198) contribute by @DevilX5  .
2. [修复自定义监控描述文档 #199](https://github.com/apache/hertzbeat/pull/199) contribute by @DevilX5
3. [[manager] bugfix oracle performance 指标采集异常问题 #201](https://github.com/apache/hertzbeat/pull/201).
4. [[common] bugfix 告警状态无法页面手动更新问题 #203](https://github.com/apache/hertzbeat/pull/203)
5. [[manager] bugfix windows监控类型名称错误问题 #204](https://github.com/apache/hertzbeat/pull/204)
6. [fix time zone todo issue #210](https://github.com/apache/hertzbeat/pull/210) contribute by @djzeng
7. [[common] bugfix 雪花算法生成ID大小超出 0x1FFFFFFFFFFFFFF 导致前端不识别问题 #211](https://github.com/apache/hertzbeat/pull/211)
8. [[manager] 修改监控页面取消监控功能再启动监控导致多生成jobId，原有监控项目并没有真实取消 #215](https://github.com/apache/hertzbeat/pull/215) contribute by @yangshihui
9. [[warehouse] 修复tdengine对特殊字段建表失败导致数据无法入库问题 #220](https://github.com/apache/hertzbeat/pull/220)

Online <https://console.tancloud.cn>.

Have Fun!

----

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
