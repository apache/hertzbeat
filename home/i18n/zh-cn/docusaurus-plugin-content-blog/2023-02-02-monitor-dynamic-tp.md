---
title: 使用 HertzBeat 对 线程池框架 DynamicTp 的监控实践    
author: tom  
author_title: tom   
author_url: https://github.com/tomsun28  
tags: [tutorials]
image: /img/blog/covers/monitor-dynamictp.jpg
---

## 使用 HertzBeat 对 线程池框架 DynamicTp 进行监控实践，5分钟搞定

### 线程池框架 DynamicTp 介绍

> DynamicTp 是Jvm语言的基于配置中心的轻量级动态线程池，内置监控告警功能，可通过SPI自定义扩展实现。

- 支持对运行中线程池参数的动态修改，实时生效。
- 实时监控线程池的运行状态，触发设置的报警策略时报警，报警信息推送办公平台。
- 定时采集线程池指标数据，配合像 grafana 这种可视化监控平台做大盘监控。

### HertzBeat 介绍

> HertzBeat 是一款开源，易用友好的实时监控工具，无需Agent，拥有强大自定义监控能力。

- 支持对应用服务，数据库，操作系统，中间件，云原生等监控，阈值告警，告警通知(邮件微信钉钉飞书短信 Slack Discord Telegram)。
- 其将Http, Jmx, Ssh, Snmp, Jdbc, Prometheus等协议规范可配置化，只需配置YML就能使用这些协议去自定义采集任何您想要采集的指标。您相信只需配置YML就能立刻适配一个K8s或Docker等新的监控类型吗？
- HertzBeat 的强大自定义，多类型支持，易扩展，低耦合，希望能帮助开发者和中小团队快速搭建自有监控系统。

### 在 HertzBeat 5分钟搞定监控 DynamicTp

#### 操作前提，您已拥有 DynamicTp 环境和 HertzBeat 环境

- DynamicTp [集成接入文档](https://dynamictp.cn/guide/use/quick-start.html)
- HertzBeat [部署安装文档](https://hertzbeat.apache.org/docs/start/docker-deploy)

#### 一. 在 DynamicTp 端暴露出`DynamicTp`指标接口 `/actuator/dynamic-tp`，它将提供 metrics 接口数据

1. 开启 SpringBoot Actuator Endpoint 暴露出`DynamicTp`指标接口

    ```yaml
    management:
      endpoints:
        web:
          exposure:
            include: '*'
    ```

2. 重启后测试访问指标接口 `ip:port/actuator/dynamic-tp` 是否有响应json数据如下:

    ```json
    [
      {
        "poolName": "commonExecutor",
        "corePoolSize": 1,
        "maximumPoolSize": 1,
        "queueType": "LinkedBlockingQueue",
        "queueCapacity": 2147483647,
        "queueSize": 0,
        "fair": false,
        "queueRemainingCapacity": 2147483647,
        "activeCount": 0,
        "taskCount": 0,
        "completedTaskCount": 0,
        "largestPoolSize": 0,
        "poolSize": 0,
        "waitTaskCount": 0,
        "rejectCount": 0,
        "rejectHandlerName": null,
        "dynamic": false,
        "runTimeoutCount": 0,
        "queueTimeoutCount": 0
      },
      {
        "maxMemory": "4 GB",
        "totalMemory": "444 MB",
        "freeMemory": "250.34 MB",
        "usableMemory": "3.81 GB"
      }
    ]
    ```

#### 二. 在 HertzBeat 监控页面添加 DynamicTp 线程池监控

1. 点击新增 DynamicTp 监控

    路径：菜单 -> 中间件监控 -> DynamicTp监控 -> 新增DynamicTp监控

    ![HertzBeat](/img/blog/monitor-dynamic-tp-1.png)

2. 配置监控 DynamicTp 所需参数

    在监控页面填写 DynamicTp **服务IP**，**监控端口**(默认8080)，最后点击确定添加即可。
    其他参数如**采集间隔**，**超时时间**等可以参考[帮助文档](https://hertzbeat.apache.org/docs/help/dynamic_tp/) [https://hertzbeat.apache.org/docs/help/dynamic_tp/](https://hertzbeat.apache.org/docs/help/dynamic_tp/)

    ![HertzBeat](/img/blog/monitor-dynamic-tp-2.png)

3. 完成✅,现在我们已经添加好对 DynamicTp 的监控了，查看监控列表即可看到我们的添加项。

    ![HertzBeat](/img/blog/monitor-dynamic-tp-1.png)

4. 点击监控列表项的**操作**->**监控详情图标** 即可浏览 DynamicTp线程池 的实时监控指标数据。

    ![HertzBeat](/img/blog/monitor-dynamic-tp-3.png)

5. 点击**监控历史详情TAB** 即可浏览 DynamicTp线程池 的历史监控指标数据图表📈。

    ![HertzBeat](/img/blog/monitor-dynamic-tp-4.png)

    ![HertzBeat](/img/blog/monitor-dynamic-tp-5.png)

**DONE！完成啦！通过上面几步，总结起来其实也就只用两步**  

- **第一步暴露 DynamicTp 端`metrics`端点`/actuator/dynamic-tp`**
- **第二步在 HertzBeat 监控页面配置IP端口添加监控即可**

:::tip
通过上面的两步我们就完成了对 DynamicTp 的监控，我们可以在 HertzBeat 随时查看监控详情指标信息来观测其服务状态。
当然只是看肯定是不完美的，监控往往伴随着告警阈值，当 DynamicTp 的线程池指标超出我们的期望值或异常时，能及时的通知到我们对应的负责人，负责人收到通知处理问题，这样才是一个完整的监控告警流程。
:::

**接下来我们就来一步一步演示如何配置 HertzBeat 系统里的阈值告警通知，让 DynamicTp线程池 的指标异常时，及时通知给我们**

#### 三. 在 HertzBeat 系统添加 DynamicTp线程池 指标阈值告警

1. 对某个重要指标配置告警阈值

    路径：菜单 -> 告警阈值 -> 新增阈值

   - 选择配置的指标对象，DynamicTp监控主要是一些线程池相关指标，我们举例对 `运行超时线程数量` `thread_pool_running` -> `run_timeout_count` 这个指标进行阈值设置， 当线程运行超时数量大于1时发出告警。
   - 这里我们就配置当此指标`thread_pool_running` 的 `run_timeout_count>1` 时发出告警，告警级别为**严重告警**，三次即触发，具体如下图。

    ![HertzBeat](/img/blog/monitor-dynamic-tp-6.png)

2. 新增消息通知接收人

    > 配置接收人，让告警消息知道要发给谁，用什么方式发。

    路径：菜单 -> 告警通知 -> 告警接收人 -> 新增接收人

    消息通知方式支持 **邮件，钉钉，企业微信，飞书，WebHook，短信**等，我们这里以常用的钉钉为例。

   - 参照此[帮助文档](https://hertzbeat.apache.org/docs/help/alert_dingtalk) [https://hertzbeat.apache.org/docs/help/alert_dingtalk](https://hertzbeat.apache.org/docs/help/alert_dingtalk) 在钉钉端配置机器人，设置安全自定义关键词`HertzBeat`，获取对应`access_token`值。
   - 在 HertzBeat 配置接收人参数如下。

    【告警通知】->【新增接收人】 ->【选择钉钉机器人通知方式】->【设置钉钉机器人ACCESS_TOKEN】-> 【确定】

    ![HertzBeat](/img/blog/alert-notice-1.png)

3. 配置关联的告警通知策略⚠️ 【新增通知策略】-> 【将刚设置的接收人关联】-> 【确定】

    > 配置告警通知策略，让告警消息与接收人绑定，这样就能决定哪些告警发给哪个人。

    ![HertzBeat](/img/blog/alert-notice-2.png)

### 完毕，现在坐等告警消息过来啦。叮叮叮叮

```text
[HertzBeat告警通知]
告警目标对象 : dynamic_tp.thread_pool_running.run_timeout_count
所属监控任务ID : 205540620349493
所属任务名称 : DynamicTp_localhost
告警级别 : 严重告警
告警触发时间 : 2023-02-02 22:17:06
内容详情 : DynamicTp has run timeout thread, count is 2
```

## 小结

:::tip
这篇实践文章带我们体验了如何使用 HertzBeat 监控 DynamicTp线程池 指标数据，可以发现集 `监控-告警-通知` 的 HertzBeat 在操作与使用方面更加的便捷，只需页面上简单点一点就能把 DynamicTp线程池 纳入监控并告警通知，再也不需要部署多个组件写YML配置文件那些繁琐操作了。  
:::

DynamicTp Github: [https://github.com/dromara/dynamic-tp](https://github.com/dromara/dynamic-tp)
HertzBeat Github: [https://github.com/apache/hertzbeat](https://github.com/apache/hertzbeat)

**欢迎了解使用Star支持哦！**

只需要一条docker命令即可安装体验heartbeat ：
`docker run -d -p 1157:1157 --name hertzbeat apache/hertzbeat`
