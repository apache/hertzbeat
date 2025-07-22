---
title: 使用 HertzBeat 对物联网数据库 IoTDB 进行监控实践    
author: tom  
author_title: tom   
author_url: https://github.com/tomsun28  
author_image_url: https://avatars.githubusercontent.com/u/24788200?s=400&v=4  
tags: [opensource, practice]
keywords: [开源监控系统, 开源数据库监控, IotDB数据库监控]
---

## 使用 HertzBeat 对物联网数据库 IoTDB 进行监控实践，5分钟搞定

### IoTDB 介绍

> Apache IoTDB (Internet of Things Database) 是一款时序数据库管理系统，可以为用户提供数据收集、存储和分析等服务。
> IoTDB由于其轻量级架构、高性能和高可用的特性，以及与 Hadoop 和 Spark 生态的无缝集成，满足了工业 IoT 领域中海量数据存储、高吞吐量数据写入和复杂数据查询分析的需求。

### HertzBeat 介绍

> HertzBeat 是一款开源，易用友好的实时监控工具，无需Agent，拥有强大自定义监控能力。
> 支持对应用服务，数据库，操作系统，中间件，云原生等监控，阈值告警，告警通知(邮件微信钉钉飞书)。
> HertzBeat 的强大自定义，多类型支持，易扩展，低耦合，希望能帮助开发者和中小团队快速搭建自有监控系统。

### 在 HertzBeat 5分钟搞定监控 IoTDB

#### 操作前提，您已拥有 IoTDB 环境和 HertzBeat 环境

- IoTDB [部署安装文档](https://iotdb.apache.org/UserGuide/V0.13.x/QuickStart/QuickStart.html)
- HertzBeat [部署安装文档](https://hertzbeat.apache.org/docs/start/docker-deploy)

#### 一. 在 IoTDB 端开启`metrics`功能，它将提供 prometheus metrics 形式的接口数据

1. metric 采集默认是关闭的，需要先到 `conf/iotdb-metric.yml` 中修改参数打开后重启 server

    ```yaml
    # 是否启动监控模块，默认为false
    enableMetric: true
    
    # 数据提供方式，对外部通过jmx和prometheus协议提供metrics的数据, 可选参数：[JMX, PROMETHEUS, IOTDB],IOTDB是默认关闭的。
    metricReporterList:
      - JMX
      - PROMETHEUS
    ```

2. 重启 IoTDB, 打开浏览器或者用curl 访问 <http://ip:9091/metrics>, 就能看到metric数据了。

#### 二. 在 HertzBeat 监控页面添加 IoTDB 监控

1. 点击新增IoTDB监控

    路径：菜单 -> 数据库监控 -> IoTDB监控 -> 新增IoTDB监控

    ![HertzBeat](/img/blog/monitor-iotdb-1.png)

2. 配置监控IoTDB所需参数

    在监控页面填写 IoTDB **服务IP**，**监控端口**(默认9091)，最后点击确定添加即可。
    其他参数如**采集间隔**，**超时时间**等可以参考[帮助文档](https://hertzbeat.apache.org/docs/help/iotdb/) <https://hertzbeat.apache.org/docs/help/iotdb/>

    ![HertzBeat](/img/blog/monitor-iotdb-2.png)

3. 完成✅,现在我们已经添加好对 IoTDB 的监控了，查看监控列表即可看到我们的添加项。

    ![HertzBeat](/img/blog/monitor-iotdb-3.png)

4. 点击监控列表项的**操作**->**监控详情图标** 即可浏览 IoTDB的实时监控指标数据。

    ![HertzBeat](/img/blog/monitor-iotdb-4.png)

5. 点击**监控历史详情TAB** 即可浏览 IoTDB的历史监控指标数据图表📈。

    ![HertzBeat](/img/blog/monitor-iotdb-5.png)

**完成DONE！通过上面几步，总结起来其实也就是两步**  

- **一步开启 IoTDB 端`metrics`功能**
- **另一步在 HertzBeat 监控页面配置IP端口添加监控即可**

**这样我们就完成了对 IoTDB 的监控，我们可以随时查看监控详情指标信息来观测其服务状态，但人不可能是一直去看，总有要休息的时候，监控往往伴随着告警，当监控指标发生异常，监控系统需要能及时通知到负责人**

**接下来我们就来一步一步教您配置 HertzBeat 系统里的阈值告警通知**

#### 三. 在 HertzBeat 系统添加 IoTDB 指标阈值告警

1. 对某个重要指标配置阈值告警

    路径：菜单 -> 告警阈值 -> 新增阈值

   - 选择配置的指标对象，IotDB监控有非常多的指标，其中有个指标关系到节点的状态 `cluster_node_status` -> `status` (节点状态，1=online 2=offline)。
   - 这里我们就配置当此指标 `status==2` 时发出告警，告警级别为**紧急告警**，一次即触发，具体如下图。

    ![HertzBeat](/img/blog/monitor-iotdb-6.png)

2. 新增消息通知接收人

    路径：菜单 -> 告警通知 -> 告警接收人 -> 新增接收人

    消息通知方式支持 **邮件，钉钉，企业微信，飞书，WebHook，短信**等，我们这里以常用的钉钉为例。

   - 参照此[帮助文档](https://hertzbeat.apache.org/docs/help/alert_dingtalk) <https://hertzbeat.apache.org/docs/help/alert_dingtalk> 在钉钉端配置机器人，设置安全自定义关键词`HertzBeat`，获取对应`access_token`值。
   - 在 HertzBeat 配置接收人参数如下。

    【告警通知】->【新增接收人】 ->【选择钉钉机器人通知方式】->【设置钉钉机器人ACCESS_TOKEN】-> 【确定】

    ![HertzBeat](/img/blog/alert-notice-1.png)

3. 配置关联的告警通知策略⚠️ 【新增通知策略】-> 【将刚设置的接收人关联】-> 【确定】

    ![HertzBeat](/img/blog/alert-notice-2.png)

### 完毕，现在坐等告警消息过来了。叮叮叮叮

```text
[HertzBeat告警通知]
告警目标对象 : iotdb.cluster_node_status.status
所属监控任务ID : 205540620349696
所属任务名称 : IOTDB_localhost
告警级别 : 紧急告警
告警触发时间 : 2023-01-05 22:17:06
内容详情 : 监控到 IOTDB 节点 127.0.0.1 状态 OFFLINE, 请及时处理。
```

## 小结

这篇实践文章带我们体验了如何使用 HertzBeat 监控 IoTDB 数据库指标数据，可以发现将 监控-告警-通知 集一体的 HertzBeat 在操作与使用方面更加的便捷，在页面上简单点一点就能把 IoTDB 纳入监控，再也不需要部署多个组件，写多个有门槛的YML配置文件了。

IoTDB Github: <https://github.com/apache/iotdb>
HertzBeat Github: <https://github.com/apache/hertzbeat>

**欢迎了解使用Star支持哦！**

只需要一条docker命令即可安装体验heartbeat ：
`docker run -d -p 1157:1157 --name hertzbeat apache/hertzbeat`

注意⚠️HertzBeat v1.2.3 版本支持 IoTDB v0.12 v0.13, 由于其v1.0刚发布, 暂未对此版本全部指标兼容。
