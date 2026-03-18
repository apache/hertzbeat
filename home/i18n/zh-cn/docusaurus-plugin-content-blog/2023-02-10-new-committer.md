---
title: 恭喜 HertzBeat 又迎来了两位新晋社区 Committer   
author: tom  
author_title: tom   
author_url: https://github.com/tomsun28  
tags: [opensource]
---

![hertzBeat](/img/blog/new-committer.png)

## 欢迎 HertzBeat 新晋两位 Committer

> 非常高兴 HertzBeat 开源社区又迎来了两位新晋社区 Committer, 有来自一线的研发小组leader，也有来自大厂的实习生，让我们来了解下他们的开源经历吧！

## 第一位 进击的阿晨

姓名：高晨

现从事：帆软软件Java研发

HertzBeat Committer

github：gcdd1993 (进击的阿晨)

### 初识HertzBeat

2022年4月开始接触HertzBeat，当时公司出现了一次宕机事故，网站无法访问，直到用户反馈才得知，急需一款能监控网站在线率，并及时告警的监控平台。浏览了几款监控平台后，最后敲定了HertzBeat，因为它功能强大，满足需求的同时还有些惊喜，最重要的是代码规范，注释清晰，技术栈吻合，便于企业二次开发。结合强大的自定义通知，我们对数据库、中间件、网站进行了监控，对公司平台的稳定运行起到了至关重要的作用。

### 开始提交PR

2022年4月17日提交了第一个PR，主要是针对使用过程发现的TDEngine时区错误的问题，虽然是简单的配置修改，但是也让我更加地了解HertzBeat，并且随着对源码的深入了解，学到了很多东西。

### 持续的开源贡献与收获

到目前为止，参与hertzbeat开源项目已有半年多时间，贡献了许多，也成长收获了许多。具体如下：

* 基于策略模式重构了告警模块
* 实现了对`Redis`数据库的指标监控
* 优化`spring.factories` 配置项
* 实现支持了 `Telegram`、`Discord`、`Slack` 的消息通知渠道
* 使用 `Thymeleaf` 重构了告警文本，告警通知模板更规范化

### 感谢社区小伙伴

感谢无偿帮助过我或给过我启发的小伙伴：tomsun28，在贡献过程中遇到的每一个问题，都能耐心指导。

### 对新人的一点建议

* HertzBeat的源码对新人非常友好，代码规范，注释丰富，非常适合作为学习项目。
* 开源贡献绝不是一蹴而就的，每一个想法，每一次疑问/解答都是一次贡献，迈出第一步才是最重要的！

## 下一位 🌻 铁甲小宝

姓名：高兴存

现从事：河南师范大学大三学生, 阿里巴巴实习

HertzBeat Committer

github：TJxiaobao

### 🌻 初识hertzbeat

首先要在这里感谢🙏花城师兄，因为当时自己想学习一些优秀的 `Java` 项目。然后在吃饭的时候向师兄请教了一下有没有好的项目推荐，恰好这时师兄把我推荐给了tom哥。当我亲自使用了 `hertzbeat` 的时候真的是发现了新的大陆，相比较于自己之前接触简单的 `Java` 项目，不论是 `hertzbeat` 的架构设计，还是它的实用功能都深深折服了我。此时一颗 `想要贡献自己的一份力量` 的种子已经在我的心中种下。

### 🌻 开始提交PR

在 Oct 20, 2022 是我第一次提交 `PR` 的时间，虽然本次 `PR` 是简单的翻译注释，看着技术含量不是很高。但是他也能让我更快的熟悉项目的业务逻辑和架构设计，能为以后的贡献打下坚实的基础。而这次 `PR` 也是我迈向开源的第一步，也是让我爱上开源的起点！

### 🌻 持续的开源贡献和收获

从第一次 `PR` 到现在，参加 `hertzbeat` 开源项目已经有一段时间了，也贡献了一小部分，也成长收获了很多。具体如下。

**贡献：**

* 1、实现对 docker 容器的监控。
* 2、完成 国产数据库 DM 监控
* 3、编写相对应业务的单测。
* 4、部分注释的英文翻译。

**收获：**

* 1、技术能力得到进一步的提升。
* 2、开阔自己的眼界。
* 3、从大佬们身上学到了很多知识。

### 🌻 感谢社区小伙伴

感谢无偿帮助过我或给过我启发的小伙伴(排名不分先后)：tomsun28（tom哥），花城（师兄）

### 🌻 对新人的一点建议

首先我也是一枚新手村的萌新啦，但是我可以把我的一些经验分享给大家，希望能给大家有所帮助。

* 1、不要过于心急，要沉静身心了解各个模块的大致实现逻辑。
* 2、通过使用不同的功能，并 debug 来看看各个功能的底层实现原理。
* 3、慢慢的尝试阅读源码，并理解。
* 4、如果遇见bug，可以直接反馈到 isses，也可以自己尝试解决嘿嘿。

## What is HertzBeat?

> [HertzBeat赫兹跳动](https://github.com/apache/hertzbeat) 是一个拥有强大自定义监控能力，无需Agent的实时监控告警工具。应用服务，数据库，操作系统，中间件，云原生等监控，阈值告警，告警通知(邮件微信钉钉飞书短信 Discord Slack Telegram)。
>
> 我们将`Http, Jmx, Ssh, Snmp, Jdbc, Prometheus`等协议规范可配置化，只需配置YML就能使用这些协议去自定义采集任何您想要采集的指标。
> 您相信只需配置YML就能立刻适配一个K8s或Docker等新的监控类型吗？
>
> `HertzBeat`的强大自定义，多类型支持，易扩展，低耦合，希望能帮助开发者和中小团队快速搭建自有监控系统。

**Github: [https://github.com/apache/hertzbeat](https://github.com/apache/hertzbeat)**
**Gitee: [https://gitee.com/hertzbeat/hertzbeat](https://gitee.com/hertzbeat/hertzbeat)**

## ⛄ Supported

* 网站监控, 端口可用性, Http Api, Ping连通性, Jvm, SiteMap全站, Ssl证书, SpringBoot, FTP服务器
* Mysql, PostgreSQL, MariaDB, Redis, ElasticSearch, SqlServer, Oracle, MongoDB, 达梦, OpenGauss, ClickHouse, IoTDB
* Linux, Ubuntu, CentOS, Windows
* Tomcat, Nacos, Zookeeper, RabbitMQ, Flink, Kafka, ShenYu, DynamicTp, Jetty, ActiveMQ
* Kubernetes, Docker
* 和更多您的自定义监控。
* 通知支持 `Discord` `Slack` `Telegram` `邮件` `钉钉` `微信` `飞书` `短信` `Webhook`。
