---
title: 开源实时监控 HertzBeat v1.3.2 发布, 更稳定更易用
author: tom  
author_title: tom   
author_url: https://github.com/tomsun28  
author_image_url: https://avatars.githubusercontent.com/u/24788200?s=400&v=4  
tags: [opensource, practice]
keywords: [open source monitoring system, alerting system, Linux monitoring]
---

官网: hertzbeat.com | tancloud.cn


![](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/a9629ef5bb6e486cacddb899f1495c6e~tplv-k3u1fbpfcp-zoom-1.image)


### HertzBeat 介绍

> HertzBeat赫兹跳动 是一个拥有强大自定义监控能力，无需 Agent 的开源实时监控告警工具。      
> 致力于**易用友好**，全 WEB 页面操作，鼠标点一点就能监控告警，零上手学习成本。   
> 集 **监控+告警+通知** 为一体，支持对应用服务，数据库，操作系统，中间件，云原生，网络等指标监控，阈值告警通知一步到位。   
> 支持更自由化的阈值规则(计算表达式)，`邮件` `Discord` `Slack` `Telegram` `钉钉` `微信` `飞书` `短信` `Webhook` 等方式及时送达。

> 我们将`Http,Jmx,Ssh,Snmp,Jdbc`等协议规范可配置化，您只需配置`YML`就能使用这些协议去自定义采集任何您想要的指标。


![](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/4236e748f5ac4352b7cf4bb65ccf97aa~tplv-k3u1fbpfcp-zoom-1.image)


**Github: https://github.com/dromara/hertzbeat**

**Gitee: https://gitee.com/dromara/hertzbeat**

### v1.3.2 来了

**这次累计 27 位小伙伴们的辛苦贡献才出来了这个令人欣喜的版本。 感谢他们！爱心💗**

这个版本我们支持对**freebsd, debian, opensuse, redhat, apache doris**等新的监控类型和指标。    

- 支持WEB页面配置邮件服务器，取代之前的文件配置
- 支持告警收敛，是否遇到了重复告警频繁发送，有了告警收敛马上解决
- 公共消息队列支持Kafka，除了我们默认的内置内存消息队列，也支持了外置Kafka消息队列，提升系统性能。
- 新的监控中心页面，聚合所有监控类型，不用像之前那样切来切去了。
- 支持标签分组展示，把同一业务类别的监控们分组标记，统一管理。
- 阈值配置不仅仅有表达式，还支持更人性化的操作UI，之前的表达式对新人不太友好很容易出错，现在可以直接UI操作啦，它可以和表达式互相切换。
- 还有HTTP ipv6等更多功能。   

修复了大量BUG，完善文档代码，提高了整体的稳定可用性。更多新功能欢迎探索！   



只需要一条docker命令即可安装体验hertzbeat:    
`docker run -d -p 1157:1157 --name hertzbeat tancloud/hertzbeat`

若dockerhub网络超时，可以使用下面命令:   
`docker run -d -p 1157:1157 --name hertzbeat quay.io/tancloud/hertzbeat`

----

## ⛄ 已支持

> 我们将监控采集类型(mysql,jvm,k8s)都定义为yml监控模版，用户可以导入这些模版来支持对应类型的监控!   
> 欢迎大家一起贡献你使用过程中自定义的通用监控类型监控模版。

- Website, Port Telnet, Http Api, Ping Connect, Jvm, SiteMap, Ssl Certificate, SpringBoot2, FTP Server, SpringBoot3
- Mysql, PostgreSQL, MariaDB, Redis, ElasticSearch, SqlServer, Oracle, MongoDB, DM, OpenGauss, ClickHouse, IoTDB, Redis Cluster, Redis Sentinel
- Linux, Ubuntu, CentOS, Windows, EulerOS, Fedora CoreOS, OpenSUSE, Rocky Linux, Red Hat, FreeBSD, AlmaLinux, Debian Linux
- Tomcat, Nacos, Zookeeper, RabbitMQ, Flink, Kafka, ShenYu, DynamicTp, Jetty, ActiveMQ
- Kubernetes, Docker
- CiscoSwitch, HpeSwitch, HuaweiSwitch, TpLinkSwitch, H3cSwitch
- 和更多自定义监控模版。
- 通知支持 Discord Slack Telegram 邮件 钉钉 微信 飞书 短信 Webhook。

----

**欢迎star三连来支持我们**     

**Github: https://github.com/dromara/hertzbeat**      
**Gitee: https://gitee.com/dromara/hertzbeat**  

