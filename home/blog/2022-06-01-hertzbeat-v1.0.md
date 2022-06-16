---
title: 云监控系统 HertzBeat v1.0 正式发布啦    
author: tom  
author_title: tom   
author_url: https://github.com/tomsun28  
author_image_url: https://avatars.githubusercontent.com/u/24788200?s=400&v=4  
tags: [opensource]  
---

[HertzBeat 赫兹跳动](https://github.com/dromara/hertzbeat) 是由 [Dromara](https://dromara.org) 孵化，[TanCloud](https://tancloud.cn) 开源的一个支持网站，API，PING，端口，数据库，全站，操作系统，中间件等监控类型，支持阈值告警，告警通知 (邮箱，webhook，钉钉，企业微信，飞书机器人)，拥有易用友好的可视化操作界面的开源监控告警项目。  

**官网: [hertzbeat.com](https://hertzbeat.com) | [tancloud.cn](https://tancloud.cn)**  

从v1.0-beta.1到v1.0-beat.8，经过多个版本的迭代完善，我们很高兴宣布hertzbeat v1.0正式发布。  

感谢从beat.1版本以来 HertzBeat Contributors 的贡献，社区同学和用户们的支持。  此版本更新支持了Redis的监控( @gcdd1993 贡献)，覆盖Redis的内存CPU等各个性能指标，全方面监控Redis。修复了多个bug进一步增强稳定性。  

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

特性：

1. [monitor feature:支持redis监控协议 #142](https://github.com/dromara/hertzbeat/pull/142)   contribute by @gcdd1993
2. Copyright & NOTICE contribute by @shimingxy
3. [alerter bugfix: 支持系统告警设置触发次数 #144](https://github.com/dromara/hertzbeat/pull/144).
4. [collector feature: redis复用单连接 #146](https://github.com/dromara/hertzbeat/pull/146).
5. [collector 隐藏日志中IP、账号与密码等敏感信息 #159](https://github.com/dromara/hertzbeat/pull/159) idea from @goo-kits
6. [支持 zookeeper 监控帮助文档 #137](https://github.com/dromara/hertzbeat/pull/137) contributr by @wang1027-wqh

Bug修复.

1. [[monitor]bugfix: 修复resource bundle在en.HK加载资源错误问题 #131](https://github.com/dromara/hertzbeat/pull/131).
2. [[web-app]bugfix:修复当主题为dark时部分菜单不可见 #132](https://github.com/dromara/hertzbeat/pull/132).
3. [[monitor]bugfix: 修复通知策略过滤标签时只能选择一个 #140](https://github.com/dromara/hertzbeat/pull/140).  issue by @daqianxiaoyao
4. [[td-engine store]bugfix: 修复tdengine入库指标数据时无table报错日志#150](https://github.com/dromara/hertzbeat/pull/150). contribute by @ChineseTony
5. [[collector]bugfix: 修复 warehouse data queue 未消费异常 #153](https://github.com/dromara/hertzbeat/pull/153).  issue by @daqianxiaoyao
7. [[web-app]bugfix: 修复黑暗主题时页面输入框校验出错时不可见 #157](https://github.com/dromara/hertzbeat/pull/157). issue by @ConradWen

**Full Changelog**: https://github.com/dromara/hertzbeat/compare/v1.0-beta.8...v1.0

Online https://console.tancloud.cn.

-----------------------    

Redis监控来啦：

<img width="1910" alt="2022-05-29 20 23 58" src="https://user-images.githubusercontent.com/24788200/170868079-325ccc08-165f-4d0e-9ebb-18b0b5c9db3f.png"/>

<img width="959" alt="2022-05-29 20 24 21" src="https://user-images.githubusercontent.com/24788200/170868094-3c4de70f-934a-4a13-ae1a-0744c30f14f3.png"/>


> [HertzBeat赫兹跳动](https://github.com/dromara/hertzbeat) 是由 [Dromara](https://dromara.org) 孵化，[TanCloud](https://tancloud.cn)开源的一个支持网站，API，PING，端口，数据库，操作系统等监控类型，拥有易用友好的可视化操作界面的开源监控告警项目。  
> 当然，我们也提供了对应的[SAAS云监控版本](https://console.tancloud.cn)，中小团队和个人无需再为了监控自己的网站资源，而去部署一套繁琐的监控系统，[登录即可免费开始](https://console.tancloud.cn)监控之旅。  
> HertzBeat 支持自定义监控，只用通过配置YML文件我们就可以自定义需要的监控类型和指标，来满足常见的个性化需求。
> HertzBeat 模块化，`manager, collector, scheduler, warehouse, alerter` 各个模块解耦合，方便理解与定制开发。    
> HertzBeat 支持更自由化的告警配置(计算表达式)，支持告警通知，告警模版，邮件钉钉微信飞书等及时通知送达  
> 欢迎登录 HertzBeat 的 [云环境TanCloud](https://console.tancloud.cn) 试用发现更多。   
> 我们正在快速迭代中，欢迎参与加入共建项目开源生态。

> `HertzBeat` 的多类型支持，易扩展，低耦合，希望能帮助开发者和中小团队快速搭建自有监控系统。

老铁们可以通过演示视频来直观了解功能： [https://www.bilibili.com/video/BV1DY4y1i7ts](https://www.bilibili.com/video/BV1DY4y1i7ts)


**仓库地址**

[Github](https://github.com/dromara/hertzbeat) https://github.com/dromara/hertzbeat      
[Gitee](https://gitee.com/dromara/hertzbeat) https://gitee.com/dromara/hertzbeat

