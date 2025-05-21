---
id: ssl-cert-practice
title: SSL证书过期监控使用案例
sidebar_label: SSL证书过期监控使用案例
---

:::tip
现在大部分网站都默认支持 HTTPS，我们申请的证书一般是3个月或者1年，很容易随着时间的流逝SSL证书过期了我们却没有第一时间发现，或者在过期之前没有及时更新证书。
:::

这篇文章介绍如果使用 hertzbeat 监控系统来检测我们网站的SSL证书有效期，当证书过期时或证书快过期前几天，给我们发告警消息。

## HertzBeat 是什么

Apache HertzBeat (incubating) 一个拥有强大自定义监控能力，无需Agent的实时监控工具。网站监测，PING连通性，端口可用性，数据库，操作系统，中间件，API监控，阈值告警，告警通知(邮件微信钉钉飞书)。

github: <https://github.com/apache/hertzbeat>

## 安装 HertzBeat

1. `docker` 环境仅需一条命令即可安装

   `docker run -d -p 1157:1157 -p 1158:1158 --name hertzbeat apache/hertzbeat`

2. 安装成功浏览器访问 `localhost:1157` 即可开始，默认账号密码 `admin/hertzbeat`

:::note
生产环境建议完整部署方式, 参考 <https://hertzbeat.apache.org/docs/start/docker-compose-deploy>
:::

## 监控 SSL 证书

1. 新增 SSL 证书监控

   > 系统页面 -> 监控菜单 -> 新增监控 -> 服务监控 -> SSL 证书 -> 新增 SSL 证书

   ![HertzBeat](/img/docs/start/ssl_1.png)

2. 配置监控网站

   > 我们这里举例监控百度网站, 配置监控host域名，名称，采集间隔等。

   ![HertzBeat](/img/docs/start/ssl_2.png)

3. 查看检测指标数据

   > 在监控列表可以查看任务状态，进监控详情可以查看指标数据图表等。

   ![HertzBeat](/img/docs/start/ssl_3.png)

   ![HertzBeat](/img/docs/start/ssl_4.png)

4. 设置阈值(证书过期时触发)

   > 系统页面 -> 告警 -> 告警阈值 -> 新增阈值 -> 新增实时阈值规则  
   > 配置阈值，选择SSL证书指标对象，配置告警表达式-当指标`expired`为`true`触发，即`equals(expired,"true")` , 设置告警级别通知模板信息等。

   ![HertzBeat](/img/docs/start/ssl_5.png)

   > 阈值规则还有其它功能可以配置, 比如阈值关联指定监控, 触发次数, 关联标签等等。

5. 设置阈值(证书过期前一周触发)

   > 同理如上，选择代码阈值规则，新增配置阈值，配置告警表达式-当指标有效期时间戳 `end_timestamp`，`now()`函数为当前时间戳，若配置提前一周触发告警即：`end_timestamp <= (now()  + 604800000)` , 其中 `604800000` 为7天总时间差毫秒值。

   ![HertzBeat](/img/docs/start/ssl_6.png)

   > 最终可以在告警中心看到已触发的告警。

   ![HertzBeat](/img/docs/start/ssl_7.png)

6. 告警通知(通过钉钉微信飞书等及时通知)

   > 系统页面 -> 消息通知 -> 通知媒介 -> 新增接收对象

   ![HertzBeat](/img/docs/start/notice_receiver_1.png)

   钉钉微信飞书等 token 配置可以参考帮助文档

   <https://hertzbeat.apache.org/docs/help/alert_feishu>

   > 消息通知 -> 通知策略 -> 新增告警通知策略 -> 将刚才配置的接收人启用通知

   ![HertzBeat](/img/docs/start/notice_policy_1.png)

7. OK 当阈值触发后我们就可以收到对应告警消息啦，如果没有配通知，也可以在告警中心查看告警信息。

----  

## 结束搞定

监控SSL证书的实践就到这里，当然对hertzbeat来说这个功能只是冰山一角，如果您觉得hertzbeat这个开源项目不错的话欢迎给我们在GitHub Gitee star哦，灰常感谢。感谢老铁们的支持。笔芯！

**github: <https://github.com/apache/hertzbeat>**
