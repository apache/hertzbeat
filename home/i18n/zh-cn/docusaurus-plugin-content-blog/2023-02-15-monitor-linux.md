---
title: 使用开源实时监控 HertzBeat 监控 Linux 操作系统
author: tom  
author_title: tom   
author_url: https://github.com/tomsun28  
author_image_url: https://avatars.githubusercontent.com/u/24788200?s=400&v=4  
tags: [opensource, practice]
keywords: [开源监控系统, 操作系统监控, Linux监控]
---

## 使用开源实时监控工具 HertzBeat 对 Linux 操作系统的监控告警实践，5分钟搞定

### HertzBeat 介绍

> HertzBeat 是一款开源，易用友好的实时监控工具，无需Agent，拥有强大自定义监控能力。

- 集**监控-告警-通知为一体**，支持对应用服务，数据库，操作系统，中间件，云原生等监控，阈值告警，告警通知(邮件微信钉钉飞书短信 Slack Discord Telegram)。
- 其将Http, Jmx, Ssh, Snmp, Jdbc, Prometheus等协议规范可配置化，只需配置YML就能使用这些协议去自定义采集任何您想要采集的指标。您相信只需配置YML就能立刻适配一个K8s或Docker等新的监控类型吗？
- HertzBeat 的强大自定义，多类型支持，易扩展，低耦合，希望能帮助开发者和中小团队快速搭建自有监控系统。

Github: <https://github.com/apache/hertzbeat>

### 在 HertzBeat 5分钟搞定对 Linux 的监控

#### 操作前提，您已拥有 Linux 环境和 HertzBeat 环境

- HertzBeat [安装部署文档](https://hertzbeat.apache.org/docs/start/docker-deploy)

#### 在开源监控系统 HertzBeat 监控页面添加对 Linux 操作系统监控

1. 点击新增 Linux 监控

    路径：菜单 -> 操作系统监控 -> Linux操作系统 -> 新增Linux操作系统监控

    ![HertzBeat](/img/blog/monitor-linux-1.png)

2. 配置新增监控 Linux 所需参数

    在监控页面填写 Linux **对端IP**，**SSH端口**(默认22)，**账户密码等**，最后点击确定添加即可。
    其他参数如**采集间隔**，**超时时间**等可以参考帮助文档 <https://hertzbeat.apache.org/docs/help/mysql/>

    ![HertzBeat](/img/blog/monitor-linux-2.png)

3. 完成✅,现在我们已经添加好对 Linux 的监控了，查看监控列表即可看到我们的添加项。

    ![HertzBeat](/img/blog/monitor-linux-3.png)

4. 点击监控列表项的**操作**->**监控详情图标** 即可浏览 Linux 的实时监控指标数据。

    ![HertzBeat](/img/blog/monitor-linux-4.png)

    ![HertzBeat](/img/blog/monitor-linux-7.png)

5. 点击**监控历史详情TAB** 即可浏览 Linux 的历史监控指标数据图表📈。

    ![HertzBeat](/img/blog/monitor-linux-5.png)

    ![HertzBeat](/img/blog/monitor-linux-6.png)

**DONE！完成啦！不需要我们去部署agent或者各种繁琐操作，是不是很简单**

- **只需一步在 HertzBeat 监控页面配置IP端口账户密码添加 Linux 监控即可**

### Linux 采集指标

#### 指标集合：basic

|   指标名称   | 指标单位 | 指标帮助描述 |
|----------|------|--------|
| hostname | 无    | 主机名称   |
| version  | 无    | 操作系统版本 |
| uptime   | 无    | 系统运行时间 |

#### 指标集合：cpu

|      指标名称      | 指标单位 |       指标帮助描述       |
|----------------|------|--------------------|
| info           | 无    | CPU型号              |
| cores          | 核数   | CPU内核数量            |
| interrupt      | 个数   | CPU中断数量            |
| load           | 无    | CPU最近1/5/15分钟的平均负载 |
| context_switch | 个数   | 当前上下文切换数量          |
| usage          | %    | CPU使用率             |

#### 指标集合：memory

|    指标名称    | 指标单位 |  指标帮助描述  |
|------------|------|----------|
| total      | Mb   | 总内存容量    |
| used       | Mb   | 用户程序内存量  |
| free       | Mb   | 空闲内存容量   |
| buff_cache | Mb   | 缓存占用内存   |
| available  | Mb   | 剩余可用内存容量 |
| usage      | %    | 内存使用率    |

#### 指标集合：disk

|     指标名称      | 指标单位 |  指标帮助描述   |
|---------------|------|-----------|
| disk_num      | 块数   | 磁盘总数      |
| partition_num | 分区数  | 分区总数      |
| block_write   | 块数   | 写入磁盘的总块数  |
| block_read    | 块数   | 从磁盘读出的块数  |
| write_rate    | iops | 每秒写磁盘块的速率 |

#### 指标集合：interface

|      指标名称      | 指标单位 |    指标帮助描述     |
|----------------|------|---------------|
| interface_name | 无    | 网卡名称          |
| receive_bytes  | byte | 入站数据流量(bytes) |
| transmit_bytes | byte | 出站数据流量(bytes) |

#### 指标集合：disk_free

|    指标名称    | 指标单位 | 指标帮助描述  |
|------------|------|---------|
| filesystem | 无    | 文件系统的名称 |
| used       | Mb   | 已使用磁盘大小 |
| available  | Mb   | 可用磁盘大小  |
| usage      | %    | 使用率     |
| mounted    | 无    | 挂载点目录   |

:::tip
通过上面我们就完成了对 Linux 的监控，我们可以在 HertzBeat 随时查看Linux的各种指标状态和可用性。  
当然不可能人工一直实时查看指标，监控往往伴随着告警阈值，当 Linux 的性能指标超出我们的阈值或Linux本身异常时，能及时的通知到我们对应的负责人，负责人收到通知处理，这样才是一个完整的监控告警流程。
:::

**接下来我们就来一步一步演示如何配置 HertzBeat 系统里的阈值告警通知，当 Linux 的指标异常时，及时通知给我们**

#### 三. 在 HertzBeat 系统添加 Linux 指标阈值告警

1. 对某个重要指标配置告警阈值

    路径：菜单 -> 阈值规则 -> 新增阈值

   - 选择配置的指标对象，Linux 监控主要是cpu 内存 磁盘 网络性能等相关指标，我们举例对 `CPU利用率` `cpu` -> `usage` 这个指标进行阈值设置， 当Linux cpu利用率大于90%时发出告警。
   - 这里我们就配置当此指标`cpu` 的 `usage>90` 时发出告警，告警级别为**警告告警**，三次即触发，具体如下图。

    ![HertzBeat](/img/blog/monitor-linux-8.png)

    ![HertzBeat](/img/blog/monitor-linux-9.png)

2. 新增消息通知接收人

    > 配置接收人，让告警消息知道要发给谁，用什么方式发。

    路径：菜单 -> 告警通知 -> 告警接收人 -> 新增接收人

    消息通知方式支持 **邮件，钉钉，企业微信，飞书，WebHook，短信**等，我们这里以常用的钉钉为例。

   - 参照此[帮助文档](https://hertzbeat.apache.org/docs/help/alert_dingtalk) <https://hertzbeat.apache.org/docs/help/alert_dingtalk> 在钉钉端配置机器人，设置安全自定义关键词`HertzBeat`，获取对应`access_token`值。
   - 在 HertzBeat 配置接收人参数如下。

    【告警通知】->【新增接收人】 ->【选择钉钉机器人通知方式】->【设置钉钉机器人ACCESS_TOKEN】-> 【确定】

    ![HertzBeat](/img/blog/alert-notice-1.png)

3. 配置关联的告警通知策略⚠️ 【新增通知策略】-> 【将刚设置的接收人关联】-> 【确定】

    > 配置告警通知策略，让告警消息与接收人绑定，这样就能决定哪些告警发给哪个人。

    ![HertzBeat](/img/blog/alert-notice-2.png)

### 完毕，现在坐等告警消息过来啦。叮叮叮叮

```text
[HertzBeat告警通知]
告警目标对象 : linux.cpu.usage
所属监控任务ID : 483783444839382
所属任务名称 : Linux_182.33.34.2
告警级别 : 警告告警
告警触发时间 : 2023-02-15 21:13:44
内容详情 : The linux cpu usage is too high. now is 95.
```

## 小结

:::tip
这篇实践文章带我们体验了如何使用开源实时监控工具 HertzBeat 来监控 Linux 指标数据，可以发现集 `监控-告警-通知` 的 HertzBeat 在操作与使用方面更加的便捷，只需页面上简单点一点就能把 Linux 纳入监控并告警通知，再也不需要部署多个组件编写配置文件那些繁琐操作了。  
:::

> 只需要一条docker命令即可安装体验heartbeat:

`docker run -d -p 1157:1157 --name hertzbeat apache/hertzbeat`

## What is HertzBeat?

> [HertzBeat赫兹跳动](https://github.com/apache/hertzbeat) 是一个拥有强大自定义监控能力，无需Agent的实时监控告警工具。应用服务，数据库，操作系统，中间件，云原生等监控，阈值告警，告警通知(邮件微信钉钉飞书短信 Discord Slack Telegram)。
>
> 我们将`Http, Jmx, Ssh, Snmp, Jdbc, Prometheus`等协议规范可配置化，只需配置YML就能使用这些协议去自定义采集任何您想要采集的指标。
> 您相信只需配置YML就能立刻适配一个K8s或Docker等新的监控类型吗？
>
> `HertzBeat`的强大自定义，多类型支持，易扩展，低耦合，希望能帮助开发者和中小团队快速搭建自有监控系统。

**Github: <https://github.com/apache/hertzbeat>**
**Gitee: <https://gitee.com/hertzbeat/hertzbeat>**

## ⛄ Supported

- 网站监控, 端口可用性, Http Api, Ping连通性, Jvm, SiteMap全站, Ssl证书, SpringBoot, FTP服务器
- Mysql, PostgreSQL, MariaDB, Redis, ElasticSearch, SqlServer, Oracle, MongoDB, 达梦, OpenGauss, ClickHouse, IoTDB
- Linux, Ubuntu, CentOS, Windows
- Tomcat, Nacos, Zookeeper, RabbitMQ, Flink, Kafka, ShenYu, DynamicTp, Jetty, ActiveMQ
- Kubernetes, Docker
- 和更多您的自定义监控。
- 通知支持 `Discord` `Slack` `Telegram` `邮件` `钉钉` `微信` `飞书` `短信` `Webhook`。
