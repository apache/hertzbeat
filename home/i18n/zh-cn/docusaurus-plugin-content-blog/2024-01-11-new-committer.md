---
title: 热烈欢迎 HertzBeat 三位小伙伴新晋社区 Committer!
author: tom
author_title: tom
author_url: https://github.com/tomsun28
author_image_url: https://avatars.githubusercontent.com/u/24788200?s=400&v=4
tags: [opensource, practice]
keywords: [open source monitoring system, alerting system]
---


![hertzBeat](/img/blog/new-committer.png)

> 热烈欢迎 HertzBeat 有三位小伙伴新晋社区 Committer, 让我们来了解下他们的开源经历吧！

# New Committer - vinci

**姓名：王佳宁**

**浙江大学计算机学院研究生一年级**

**Github ID: vinci-897**

## 初识Hertzbeat

2023年3月，我关注到了Hertzbeat的项目，于是直接给社区的Tom老哥发了邮件咨询是否可以加入，老哥很爽快的给了回复。刚好我当时正是大四时间比较充裕，就果断挑了一个issue解决，在hertzbeat有了第一个pull request。

## 开始提交PR

在之后一段时间里，我花了一段时间阅读Hertzbeat的代码，又断断续续的交了几个pr。直到4月份，我了解到开源之夏相关活动，刚好Hertzbeat也在参加，所以提交了报名信息后便顺利入选。我的任务主要是负责实现一个推送方式的采集器，在编写代码的过程中，我得到了许多社区的郑晨鑫导师和Tom老哥帮助，最终能够顺利完成代码，整个过程还是比较顺利的。

## 开源贡献

- 新增push module，暴露接口供用户推送数据。
- 在collector模块中实现对推送数据的采集。
- 在前端中实现展示用户自定义的数据。

## 收获

- 接触到了很优秀的开源社区，提升了相关领域的技术水平。


感谢Tom哥和我的ospp导师郑晨鑫，他们在我接触开源社区的过程中给出了许多帮助和建议。目前我仍然在社区中负责部分代码的开发，希望Hertzbeat以后可以越来越好！



----

# New Committer - 淞筱



**姓名：周书胜**

**河南师范大学大三学生**

## 初识Hertzbeat

今年三月份，在小宝学长的影响下，对开源项目有了些许概念，并为后来学习开源项目奠定了基础，但由于当时只学习了一些Java基础，所以并没有再深入了解。

## 开始提交PR

在今年七月份，基本完成Java框架开发的学习后，在小宝学长的鼓励下，我开始尝试拉取issue，并在7月20日提交了第一个PR。在此期间，也咨询了Hertzbeat作者和东风学长一些相关问题，实在感谢。

## 开源贡献

* 支持Spring Gateway、Apache Spark、Apache Hive等服务指标采集
* 自定义nginx、pop3协议，对Nginx，POP3邮箱服务器进行指标采集，并添加相应帮助文档


## 收获

* 接触了更加优秀、结构更加复杂的大型项目，提高了编程和解决问题的能力
* 将理论知识付诸于实践，收获了JUC，微服务相关的开发经验，以及宝贵的项目经历


## 感谢社区小伙伴

感谢HertzBeat的作者、HertzBeat/Sms4j Committer铁甲小宝同学、Sms4j Committer东风同学，在我遇到自己不能解决的问题时，常常向三位哥哥请教，他们也总是不厌其烦，耐心的帮助我解决问题，实在是无以言表。

感谢社区的其它小伙伴，在与他们交流讨论的过程中收获满满，也感受到了社区活跃的开源氛围。

## 给新人的一些建议

* 初次参与开源项目时，可以从简单的任务开始。逐渐熟悉项目的代码和流程，并逐步承担更复杂的任务。
* 如果遇到自己无法解决的问题时，可以多多请教社区的小伙伴们。



----

# New Committer - 东风



**姓名：张洋**

**河南师范大学应届生**

## 初识hertzbeat

今年6月份开始对项目进行深入了解，我是经朋友推荐了解该项目的，一直对开源项目和社区有所探索，很喜欢这种大家互相分享、讨论并改进的氛围。同时之前在项目中也尝试实现一些监控，所以对于该项目比较感兴趣。

## 开始提交PR

在今年7月起，我发现hertzbeat的issue和pr很活跃，于是就通过他们的issue和pr来了解如何实现某个协议的监控。随后我发现有关于smtp协议监控的task，就在issue上与作者进行讨论，随后通过文档和代码完成了自己的pr。

## 开源贡献

- 实现smtp、ntp、websocket可用性的监控。
- 实现memcached 、NebulaGraph的监控指标。
- 为实现的监控添加相关文档。

## 收获

- 收获了监控相关的开发经验，新增了一个宝贵的项目经历。
- 对于网络协议有了更深刻的了解。
- 对于开源项目的贡献流程有了初步认识。

## 感谢社区小伙伴

感谢hertzbeat的作者提供的相关文档和帮助。感谢朋友的带领，为我提供了勇气，让我敢于尝试进入开源项目进行贡献。感谢社区中其他的小伙伴的issue和pr，加快了我对于该项目的了解。

## 对新人的一点建议

- issue和pr是你了解的项目的敲门砖，一点要敢于讨论并发表观点。
- 贡献不分大小，要敢于尝试，并不断提升自己。


----

## 什么是 HertzBeat?

[HertzBeat 赫兹跳动](https://github.com/apache/hertzbeat) 是一个拥有强大自定义监控能力，高性能集群，兼容 Prometheus，无需 Agent 的开源实时监控告警系统。

### 特点

- 集 **监控+告警+通知** 为一体，支持对应用服务，应用程序，数据库，缓存，操作系统，大数据，中间件，Web服务器，云原生，网络，自定义等监控阈值告警通知一步到位。
- 易用友好，无需 `Agent`，全 `WEB` 页面操作，鼠标点一点就能监控告警，零上手学习成本。
- 将 `Http, Jmx, Ssh, Snmp, Jdbc, Prometheus` 等协议规范可配置化，只需在浏览器配置监控模版 `YML` 就能使用这些协议去自定义采集想要的指标。您相信只需配置下就能立刻适配一款 `K8s` 或 `Docker` 等新的监控类型吗？
- 兼容 `Prometheus` 的系统生态并且更多，只需页面操作就可以监控 `Prometheus` 所能监控的。
- 高性能，支持多采集器集群横向扩展，支持多隔离网络监控，云边协同。
- 自由的告警阈值规则，`邮件` `Discord` `Slack` `Telegram` `钉钉` `微信` `飞书` `短信` `Webhook` `Server酱` 等方式消息及时送达。


> `HertzBeat`的强大自定义，多类型支持，高性能，易扩展，低耦合，希望能帮助开发者和团队快速搭建自有监控系统。


**Github: https://github.com/apache/hertzbeat**

**Gitee: https://gitee.com/hertzbeat/hertzbeat**

欢迎更多小伙伴参与到HertzBeat的开源协作中来，不管是一个错别字还是标点符号我们都非常欢迎，大家一起学习进步，目标做一个世界级开源软件。
