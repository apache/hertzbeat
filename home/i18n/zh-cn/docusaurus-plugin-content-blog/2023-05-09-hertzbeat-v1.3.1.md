---
title: 50天36位贡献者，开源实时监控工具 HertzBeat v1.3.1 发布
author: tom  
author_title: tom   
author_url: https://github.com/tomsun28  
author_image_url: https://avatars.githubusercontent.com/u/24788200?s=400&v=4  
tags: [opensource, practice]
keywords: [open source monitoring system, alerting system, Linux monitoring]
---

官网: hertzbeat.com | tancloud.cn

### What is HertzBeat?

> HertzBeat赫兹跳动 是一个拥有强大自定义监控能力，无需 Agent 的开源实时监控告警工具。
> 集 **监控+告警+通知** 为一体，支持对应用服务，应用程序，数据库，缓存，操作系统，大数据，中间件，Web服务器，云原生，网络，自定义等指标监控，阈值告警通知一步到位。
> 支持更自由化的阈值规则(计算表达式)，`邮件` `Discord` `Slack` `Telegram` `钉钉` `微信` `飞书` `短信` `Webhook` 等方式及时送达。
>
> 我们将`Http, Jmx, Ssh, Snmp, Jdbc, Prometheus`等协议规范可配置化，您只需配置`YML`就能使用这些协议去自定义采集任何您想要的指标。
>
> 您相信只需定义YML就能立刻适配一款K8s或Docker等新的监控类型吗？

**Github: <https://github.com/apache/hertzbeat>**

**Gitee: <https://gitee.com/hertzbeat/hertzbeat>**

### v1.3.1 来了

嗨，伙计们，重磅更新，HertzBeat v1.3.1发布啦！很激动这个版本有超三十位小伙伴们一起贡献。  
这个版本我们支持**greptimeDB, tedgine3.0和opengauss influxdb**来存储度量数据。  
新功能**监控导出和导入支持excel json yaml**， **告警静默功能**，**新的监控模板**和更多。  
支持监控EulerOS指标和SpringBoot3指标。修复若干BUG，完善了文档，重构了代码，提高了整体的稳定可用性还有更多新功能欢迎探索！快来体验下吧!

只需要一条docker命令即可安装体验hertzbeat ：  
`docker run -d -p 1157:1157 --name hertzbeat apache/hertzbeat`

## 升级注意⚠️

若之前使用的TDengine时序数据库，需升级至TDengine3.0+

需要执行SQL升级脚本

```shell
ALTER table hzb_alert_define modify field varchar(255) default null;
COMMIT;
```

---

## ⛄ 已支持

> 我们将监控采集类型(mysql,jvm,k8s)都定义为yml监控模板，用户可以导入这些模板来支持对应类型的监控!
> 欢迎大家一起贡献你使用过程中自定义的通用监控类型监控模板。

- Website, Port Telnet, Http Api, Ping Connect, Jvm, SiteMap, Ssl Certificate, SpringBoot2, FTP Server, SpringBoot3
- Mysql, PostgreSQL, MariaDB, Redis, ElasticSearch, SqlServer, Oracle, MongoDB, DM, OpenGauss, ClickHouse, IoTDB, Redis Cluster, Redis Sentinel
- Linux, Ubuntu, CentOS, Windows, EulerOS
- Tomcat, Nacos, Zookeeper, RabbitMQ, Flink, Kafka, ShenYu, DynamicTp, Jetty, ActiveMQ
- Kubernetes, Docker
- CiscoSwitch, HpeSwitch, HuaweiSwitch, TpLinkSwitch, H3cSwitch
- 和更多自定义监控模板。
- 通知支持 Discord Slack Telegram 邮件 钉钉 微信 飞书 短信 Webhook。

---

**Github: <https://github.com/apache/hertzbeat>**
**Gitee: <https://gitee.com/hertzbeat/hertzbeat>**
