---
title: 使用 HertzBeat 5分钟搞定 SpringBoot2 监控告警
author: tom  
author_title: tom   
author_url: https://github.com/tomsun28  
author_image_url: https://avatars.githubusercontent.com/u/24788200?s=400&v=4  
tags: [opensource, practice]
keywords: [开源监控系统, SpringBoot监控, 监控告警]
---

## 使用开源实时监控工具 HertzBeat 对 SpringBoot2 应用的监控告警实践，5分钟搞定！

### HertzBeat 介绍  

> HertzBeat 是一款开源，易用友好的实时监控工具，无需Agent，拥有强大自定义监控能力。    

- 集**监控-告警-通知为一体**，支持对应用服务，应用程序，数据库，缓存，操作系统，大数据，中间件，Web服务器，云原生，网络，自定义等监控，阈值告警，告警通知(邮件微信钉钉飞书短信 Slack Discord Telegram)。    
- 其将Http, Jmx, Ssh, Snmp, Jdbc, Prometheus等协议规范可配置化，只需配置YML就能使用这些协议去自定义采集任何您想要采集的指标。您相信只需配置YML就能立刻适配一个K8s或Docker等新的监控类型吗？   
- HertzBeat 的强大自定义，多类型支持，易扩展，低耦合，希望能帮助开发者和中小团队快速搭建自有监控系统。  

Github: https://github.com/dromara/hertzbeat 

### 在 HertzBeat 5分钟搞定对 SpringBoot2 应用的监控   

#### 操作前提，您已拥有 SpringBoot2 应用环境和 HertzBeat 环境。  

- HertzBeat [安装部署文档](https://hertzbeat.com/docs/start/docker-deploy) 

#### 一. 在 SpringBoot2 应用端暴露出`actuator`指标接口，它将提供 metrics 接口数据。

1. 开启 SpringBoot Actuator Endpoint 暴露出`metrics health env`指标接口

```yaml
management:
  endpoints:
    web:
      exposure:
        include:
          - 'metrics'
          - 'health'
          - 'env'
    enabled-by-default: on
```

2. 重启后测试访问指标接口 `ip:port/actuator` 是否有响应json数据如下:

```json
{
  "_links": {
    "self": {
      "href": "http://localhost:1157/actuator",
      "templated": false
    },
    "health-path": {
      "href": "http://localhost:1157/actuator/health/{*path}",
      "templated": true
    },
    "health": {
      "href": "http://localhost:1157/actuator/health",
      "templated": false
    },
    "env": {
      "href": "http://localhost:1157/actuator/env",
      "templated": false
    },
    "env-toMatch": {
      "href": "http://localhost:1157/actuator/env/{toMatch}",
      "templated": true
    },
    "metrics-requiredMetricName": {
      "href": "http://localhost:1157/actuator/metrics/{requiredMetricName}",
      "templated": true
    },
    "metrics": {
      "href": "http://localhost:1157/actuator/metrics",
      "templated": false
    }
  }
}
```

#### 在开源监控系统 HertzBeat 监控页面添加对 SpringBoot2 应用监控   

1. 点击新增 SpringBoot2 监控  

路径：菜单 -> 应用服务监控 -> SpringBoot2 -> 新增SpringBoot2监控  

![hertzbeat](/img/blog/monitor-springboot2-1.png)

2. 配置新增监控 SpringBoot2 所需参数   

在监控页面填写 SpringBoot2应用 **对端IP**，**服务端口**(默认8080)，**账户密码等**，最后点击确定添加即可。   
其他参数如**采集间隔**，**超时时间**等可以参考帮助文档 https://hertzbeat.com/docs/help/   

![hertzbeat](/img/blog/monitor-springboot2-2.png)    

3. 完成✅,现在我们已经添加好对 SpringBoot2应用 的监控了，查看监控列表即可看到我们的添加项。  

![hertzbeat](/img/blog/monitor-springboot2-3.png)  

4. 点击监控列表项的**操作**->**监控详情图标** 即可浏览 SpringBoot2应用 的实时监控指标数据。  

![hertzbeat](/img/blog/monitor-springboot2-4.png)

5. 点击**监控历史详情TAB** 即可浏览 SpringBoot2应用 的历史监控指标数据图表📈。  

![hertzbeat](/img/blog/monitor-springboot2-5.png)

**DONE！完成啦！不需要我们去部署agent或者各种繁琐操作，是不是很简单**

- **只需一步在 HertzBeat 监控页面配置IP端口添加 SpringBoot2应用 监控即可**         


:::tip
通过上面我们就完成了对 SpringBoot2应用 的监控，我们可以在 HertzBeat 随时查看SpringBoot2应用的各种指标状态和可用性。  
当然不可能人工一直实时查看指标，监控往往伴随着告警阈值，当 SpringBoot2应用 的性能指标超出我们的阈值或SpringBoot2应用本身异常时，能及时的通知到我们对应的负责人，负责人收到通知处理，这样才是一个完整的监控告警流程。
:::

**接下来我们就来一步一步演示如何配置 HertzBeat 系统里的阈值告警通知，当 SpringBoot2应用 的指标异常时，及时通知给我们**     

#### 三. 在 HertzBeat 系统添加 SpringBoot2应用 指标阈值告警   

1. 对某个重要指标配置告警阈值     

路径：菜单 -> 阈值规则 -> 新增阈值  

- 选择配置的指标对象，SpringBoot2应用 监控主要是 堆栈内存 线程等相关指标，我们举例对 `状态线程数` `threads` -> `threads` 这个指标进行阈值设置， 当`runnable`状态的线程数量大于300时发出告警。       
- 这里我们就配置当此指标`size`,`state` 的 `equals(state,"runnable"") && size>300` 时发出告警，告警级别为**警告告警**，三次即触发，具体如下图。  

![hertzbeat](/img/blog/monitor-springboot2-6.png)     

![hertzbeat](/img/blog/monitor-springboot2-7.png)


2. 新增消息通知接收人

> 配置接收人，让告警消息知道要发给谁，用什么方式发。  

路径：菜单 -> 告警通知 -> 告警接收人 -> 新增接收人  

消息通知方式支持 **邮件，钉钉，企业微信，飞书，WebHook，短信**等，我们这里以常用的钉钉为例。  

- 参照此[帮助文档](https://hertzbeat.com/docs/help/alert_dingtalk) https://hertzbeat.com/docs/help/alert_dingtalk 在钉钉端配置机器人，设置安全自定义关键词`HertzBeat`，获取对应`access_token`值。 
- 在 HertzBeat 配置接收人参数如下。  

【告警通知】->【新增接收人】 ->【选择钉钉机器人通知方式】->【设置钉钉机器人ACCESS_TOKEN】-> 【确定】

![hertzbeat](/img/blog/alert-notice-1.png)    

3. 配置关联的告警通知策略⚠️ 【新增通知策略】-> 【将刚设置的接收人关联】-> 【确定】 

> 配置告警通知策略，让告警消息与接收人绑定，这样就能决定哪些告警发给哪个人。

![hertzbeat](/img/blog/alert-notice-2.png)    


### 完毕，现在坐等告警消息过来啦。叮叮叮叮 

```
[HertzBeat告警通知]
告警目标对象 : springboot2.threads.size
所属监控任务ID : 483783444839322
所属任务名称 : SPRINGBOOT2_localhost
告警级别 : 警告告警
告警触发时间 : 2023-03-22 21:13:44
内容详情 : The springboot2 service's runnable state threads num is over 300, now is 444.
```

## 小结   

:::tip
这篇实践文章带我们体验了如何使用开源实时监控工具 HertzBeat 来监控 SpringBoot2应用 指标数据，可以发现集 `监控-告警-通知` 的 HertzBeat 在操作与使用方面更加的便捷，只需页面上简单点一点就能把 SpringBoot2应用 纳入监控并告警通知，再也不需要部署多个组件编写配置文件那些繁琐操作了。  
:::

> 只需要一条docker命令即可安装体验heartbeat:   

`docker run -d -p 1157:1157 --name hertzbeat tancloud/hertzbeat`

## 更强大  

> 通过上面的简单步骤我们实现了对SpringBoot2的监控，但里面的内置指标固定不满足需要，是否能自定义监控更多SpringBoot2的指标呢？答案当然是可以的，通过在页面上的**监控定义**->**SpringBoot2**随时通过编辑如下的YML配置文件自定义添加修改想要监控的性能指标。

![hertzbeat](/img/blog/monitor-springboot2-8.png)

## What is HertzBeat?

> [HertzBeat赫兹跳动](https://github.com/dromara/hertzbeat) 是一个拥有强大自定义监控能力，无需Agent的实时监控告警工具。应用服务，数据库，操作系统，中间件，云原生，网络等监控，阈值告警，告警通知(邮件微信钉钉飞书短信 Discord Slack Telegram)。

> 我们将`Http, Jmx, Ssh, Snmp, Jdbc, Prometheus`等协议规范可配置化，只需配置YML就能使用这些协议去自定义采集任何您想要采集的指标。    
> 您相信只需配置YML就能立刻适配一个K8s或Docker等新的监控类型吗？

> `HertzBeat`的强大自定义，多类型支持，易扩展，低耦合，希望能帮助开发者和中小团队快速搭建自有监控系统。

**Github: https://github.com/dromara/hertzbeat**        
**Gitee: https://gitee.com/dromara/hertzbeat**

## ⛄ Supported

-   网站监控, 端口可用性, Http Api, Ping连通性, Jvm, SiteMap全站, Ssl证书, SpringBoot, FTP服务器
-   Mysql, PostgreSQL, MariaDB, Redis, ElasticSearch, SqlServer, Oracle, MongoDB, 达梦, OpenGauss, ClickHouse, IoTDB
-   Linux, Ubuntu, CentOS, Windows
-   Tomcat, Nacos, Zookeeper, RabbitMQ, Flink, Kafka, ShenYu, DynamicTp, Jetty, ActiveMQ
-   Kubernetes, Docker
-   CiscoSwitch, HpeSwitch, HuaweiSwitch, TpLinkSwitch
-   和更多的自定义监控。
-   通知支持 `Discord` `Slack` `Telegram` `邮件` `钉钉` `微信` `飞书` `短信` `Webhook`。
