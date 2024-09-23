---
title: 使用开源实时监控工具 HertzBeat 对 Mysql 数据库监控告警实践    
author: tom  
author_title: tom   
author_url: https://github.com/tomsun28  
author_image_url: https://avatars.githubusercontent.com/u/24788200?s=400&v=4  
tags: [opensource, practice]
keywords: [开源监控系统, 开源数据库监控, Mysql数据库监控]
---

## 使用开源实时监控工具 HertzBeat 对 Mysql 数据库监控告警实践，5分钟搞定

### Mysql 数据库介绍

> MySQL是一个开源关系型数据库管理系统，由瑞典MySQL AB 公司开发，属于 Oracle 旗下产品。MySQL 是最流行的开源关系型数据库管理系统之一，在 WEB 应用方面，MySQL是最好的 RDBMS (Relational Database Management System，关系数据库管理系统) 应用软件之一。

### HertzBeat 介绍

> HertzBeat 是一款开源，易用友好的实时监控工具，无需Agent，拥有强大自定义监控能力。

- 集**监控-告警-通知为一体**，支持对应用服务，数据库，操作系统，中间件，云原生等监控，阈值告警，告警通知(邮件微信钉钉飞书短信 Slack Discord Telegram)。
- 其将Http, Jmx, Ssh, Snmp, Jdbc, Prometheus等协议规范可配置化，只需配置YML就能使用这些协议去自定义采集任何您想要采集的指标。您相信只需配置YML就能立刻适配一个K8s或Docker等新的监控类型吗？
- HertzBeat 的强大自定义，多类型支持，易扩展，低耦合，希望能帮助开发者和中小团队快速搭建自有监控系统。

### 在 HertzBeat 5分钟搞定对 Mysql 数据库监控

#### 操作前提，您已拥有 Mysql 环境和 HertzBeat 环境

- Mysql [安装部署文档](https://www.runoob.com/mysql/mysql-install.html)
- HertzBeat [安装部署文档](https://hertzbeat.com/docs/start/docker-deploy)

#### 在开源监控系统 HertzBeat 监控页面添加对 Mysql 数据库监控

1. 点击新增 Mysql 监控

    路径：菜单 -> 数据库监控 -> Mysql数据库 -> 新增Mysql数据库监控

    ![HertzBeat](/img/blog/monitor-mysql-1.png)

2. 配置新增监控 Mysql 数据库所需参数

    在监控页面填写 Mysql **服务IP**，**监控端口**(默认3306)，**账户密码等**，最后点击确定添加即可。
    其他参数如**采集间隔**，**超时时间**等可以参考[帮助文档](https://hertzbeat.com/docs/help/mysql/) <https://hertzbeat.com/docs/help/mysql/>

    ![HertzBeat](/img/blog/monitor-mysql-2.png)

3. 完成✅,现在我们已经添加好对 Mysql数据库 的监控了，查看监控列表即可看到我们的添加项。

    ![HertzBeat](/img/blog/monitor-mysql-1.png)

4. 点击监控列表项的**操作**->**监控详情图标** 即可浏览 Mysql数据库 的实时监控指标数据。

    ![HertzBeat](/img/blog/monitor-mysql-3.png)

5. 点击**监控历史详情TAB** 即可浏览 Mysql数据库 的历史监控指标数据图表📈。

    ![HertzBeat](/img/blog/monitor-mysql-4.png)

**DONE！完成啦！通过上面几步，总结起来其实也就只用一步即可**

- **在 HertzBeat 监控页面配置IP端口账户密码添加 Mysql 监控即可**

:::tip
通过上面的两步我们就完成了对 Mysql数据库 的监控，我们可以在 HertzBeat 随时查看监控详情指标信息来观测其服务状态。  
当然只是看肯定是不完美的，监控往往伴随着告警阈值，当 Mysql 数据库的指标超出我们的期望值或异常时，能及时的通知到我们对应的负责人，负责人收到通知处理问题，这样才是一个完整的监控告警流程。
:::

**接下来我们就来一步一步演示如何配置 HertzBeat 系统里的阈值告警通知，让及时发现 Mysql 数据库的指标异常时，及时通知给我们**

#### 三. 在 HertzBeat 系统添加 Mysql 数据库指标阈值告警

1. 对某个重要指标配置告警阈值

    路径：菜单 -> 阈值规则 -> 新增阈值

   - 选择配置的指标对象，Mysql 数据库监控主要是数据库性能等相关指标，我们举例对 `查询缓存命中率` `cache` -> `query_cache_hit_rate` 这个指标进行阈值设置， 当Mysql的查询缓存命中率很低小于30%时发出告警。
   - 这里我们就配置当此指标`cache` 的 `query_cache_hit_rate<30` 时发出告警，告警级别为**严重告警**，三次即触发，具体如下图。

    ![HertzBeat](/img/blog/monitor-mysql-5.png)

    ![HertzBeat](/img/blog/monitor-mysql-6.png)

2. 新增消息通知接收人

    > 配置接收人，让告警消息知道要发给谁，用什么方式发。

    路径：菜单 -> 告警通知 -> 告警接收人 -> 新增接收人

    消息通知方式支持 **邮件，钉钉，企业微信，飞书，WebHook，短信**等，我们这里以常用的钉钉为例。

   - 参照此[帮助文档](https://hertzbeat.com/docs/help/alert_dingtalk) <https://hertzbeat.com/docs/help/alert_dingtalk> 在钉钉端配置机器人，设置安全自定义关键词`HertzBeat`，获取对应`access_token`值。
   - 在 HertzBeat 配置接收人参数如下。

    【告警通知】->【新增接收人】 ->【选择钉钉机器人通知方式】->【设置钉钉机器人ACCESS_TOKEN】-> 【确定】

    ![HertzBeat](/img/blog/alert-notice-1.png)

3. 配置关联的告警通知策略⚠️ 【新增通知策略】-> 【将刚设置的接收人关联】-> 【确定】

    > 配置告警通知策略，让告警消息与接收人绑定，这样就能决定哪些告警发给哪个人。

    ![HertzBeat](/img/blog/alert-notice-2.png)

### 完毕，现在坐等告警消息过来啦。叮叮叮叮

```text
[HertzBeat告警通知]
告警目标对象 : mysql.cahce.query_cache_hit_rate
所属监控任务ID : 205540620394932
所属任务名称 : Mysql_localhost
告警级别 : 严重告警
告警触发时间 : 2023-02-11 21:13:44
内容详情 : mysql db query_cache_hit_rate is too low, now is 20.
```

## 小结

:::tip
这篇实践文章带我们体验了如何使用开源实时监控工具 HertzBeat 来监控 Mysql 数据库指标数据，可以发现集 `监控-告警-通知` 的 HertzBeat 在操作与使用方面更加的便捷，只需页面上简单点一点就能把 Mysql 数据库纳入监控并告警通知，再也不需要部署多个组件编写配置文件那些繁琐操作了。  
:::

Mysql Github: <https://github.com/mysql/mysql-server>
HertzBeat Github: <https://github.com/apache/hertzbeat>

**欢迎了解使用支持Star哦！**

> 只需要一条docker命令即可安装体验heartbeat:

`docker run -d -p 1157:1157 --name hertzbeat apache/hertzbeat`
