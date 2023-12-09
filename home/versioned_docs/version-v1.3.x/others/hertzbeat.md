---
id: hertzbeat  
title: HertzBeat 开源监控   
sidebar_label: HertzBeat 开源监控    
---


> 易用友好的开源实时监控告警系统，无需Agent，强大自定义监控能力。

[![discord](https://img.shields.io/badge/chat-on%20discord-brightgreen)](https://discord.gg/Fb6M73htGr)
[![Gitter](https://badges.gitter.im/hertzbeat/community.svg)](https://gitter.im/hertzbeat/community?utm_source=badge&utm_medium=badge&utm_campaign=pr-badge)
[![QQ](https://img.shields.io/badge/qq-236915833-orange)](https://jq.qq.com/?_wv=1027&k=aVIVB2K9)
![hertzbeat](https://cdn.jsdelivr.net/gh/dromara/hertzbeat@gh-pages/img/badge/web-monitor.svg)
![hertzbeat](https://cdn.jsdelivr.net/gh/dromara/hertzbeat@gh-pages/img/badge/ping-connect.svg)
![hertzbeat](https://cdn.jsdelivr.net/gh/dromara/hertzbeat@gh-pages/img/badge/port-available.svg)
![hertzbeat](https://cdn.jsdelivr.net/gh/dromara/hertzbeat@gh-pages/img/badge/database-monitor.svg)
![hertzbeat](https://cdn.jsdelivr.net/gh/dromara/hertzbeat@gh-pages/img/badge/os-monitor.svg)
![hertzbeat](https://img.shields.io/badge/monitor-cloud%20native-brightgreen)
![hertzbeat](https://img.shields.io/badge/monitor-middleware-blueviolet)
![hertzbeat](https://img.shields.io/badge/monitor-network-red)
![hertzbeat](https://cdn.jsdelivr.net/gh/dromara/hertzbeat@gh-pages/img/badge/custom-monitor.svg)
![hertzbeat](https://cdn.jsdelivr.net/gh/dromara/hertzbeat@gh-pages/img/badge/alert.svg)


## 🎡 <font color="green">介绍</font>

> [HertzBeat赫兹跳动](https://github.com/dromara/hertzbeat) 是一个拥有强大自定义监控能力，无需 Agent 的开源实时监控告警系统。     
> 集 **监控+告警+通知** 为一体，支持对应用服务，应用程序，数据库，缓存，操作系统，大数据，中间件，Web服务器，云原生，网络，自定义等监控，阈值告警通知一步到位。   
> 更自由化的阈值规则(计算表达式)，`邮件` `Discord` `Slack` `Telegram` `钉钉` `微信` `飞书` `短信` `Webhook` 等方式及时送达。

> 我们将`Http, Jmx, Ssh, Snmp, Jdbc, Prometheus`等协议规范可配置化，您只需在浏览器配置`YML`就能使用这些协议去自定义采集任何您想要的指标。    
> 您相信只需配置下就能立刻适配一款`K8s`或`Docker`等新的监控类型吗？

> `HertzBeat`的强大自定义，多类型支持，易扩展，低耦合，希望能帮助开发者和中小团队快速搭建自有监控系统。

----   

## 完全开源

- 使用`Apache2`协议，由自由开放的开源社区主导维护的开源协作产品。
- 无监控数量`License`，监控类型等人为限制。
- 基于`Java+SpringBoot+TypeScript+Angular`主流技术栈构建，方便的二次开发。

## 强大的监控模版  

> 开始我们就说 hertzbeat 的特点是自定义监控能力，无需 Agent。在讨论这两点之前，我们先介绍下 hertzbeat 的不一样的监控模版。而正是因为这样的监控模版设计，才会有了后面的高级特性。  

hertzbeat 自身并没有去创造一种采集数据协议，让对端来适配它。而是充分使用了现有的生态，SNMP采集网络交换机路由器信息，JMX采集JAVA应用信息，JDBC规范采集数据集信息，SSH直连执行脚本获取回显信息，HTTP+(JsonPath | prometheus等)解析接口信息，IPMI采集服务器信息等等。   
hertzbeat 使用这些已有的标准协议或规范，将他们抽象规范可配置化，最后使其都可以通过编写YML格式监控模版的形式，来制定模版使用这些协议来采集任何想要的指标信息。  

![hertzbeat](/img/blog/multi-protocol.png)

你相信用户只需在UI页面编写一个监控模版，点击保存后，就能立刻适配一款`K8s`或`Docker`等新的监控类型吗？

![hertzbeat](/img/home/9.png)


## 已支持

**一款监控类型对应一个YML监控模版**

- [Website](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-website.yml), [Port Telnet](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-port.yml),
  [Http Api](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-api.yml), [Ping Connect](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-ping.yml),
  [Jvm](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-jvm.yml), [SiteMap](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-fullsite.yml),
  [Ssl Certificate](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-ssl_cert.yml), [SpringBoot2](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-springboot2.yml),
  [FTP Server](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-ftp.yml), [SpringBoot3](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-springboot3.yml)
- [Mysql](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-mysql.yml), [PostgreSQL](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-postgresql.yml),
  [MariaDB](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-mariadb.yml), [Redis](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-redis.yml),
  [ElasticSearch](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-elasticsearch.yml), [SqlServer](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-sqlserver.yml),
  [Oracle](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-oracle.yml), [MongoDB](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-mongodb.yml),
  [DM](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-dm.yml), [OpenGauss](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-opengauss.yml),
  [ClickHouse](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-clickhouse.yml), [IoTDB](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-iotdb.yml),
  [Redis Cluster](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-redis_cluster.yml), [Redis Sentinel](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-redis_sentinel.yml)
- [Linux](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-linux.yml), [Ubuntu](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-ubuntu.yml),
  [CentOS](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-centos.yml), [Windows](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-windows.yml),
  [EulerOS](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-euleros.yml)
- [Tomcat](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-tomcat.yml), [Nacos](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-nacos.yml),
  [Zookeeper](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-zookeeper.yml), [RabbitMQ](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-rabbitmq.yml),
  [Flink](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-flink.yml), [Kafka](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-kafka.yml),
  [ShenYu](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-shenyu.yml), [DynamicTp](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-dynamic_tp.yml),
  [Jetty](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-jetty.yml), [ActiveMQ](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-activemq.yml)
- [Kubernetes](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-kubernetes.yml), [Docker](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-docker.yml)
- [CiscoSwitch](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-cisco_switch.yml), [HpeSwitch](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-hpe_switch.yml),
  [HuaweiSwitch](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-huawei_switch.yml), [TpLinkSwitch](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-tplink_switch.yml),
  [H3cSwitch](https://raw.githubusercontent.com/dromara/hertzbeat/master/manager/src/main/resources/define/app-h3c_switch.yml)
- 和更多自定义监控模版。
- 通知支持 `Discord` `Slack` `Telegram` `邮件` `钉钉` `微信` `飞书` `短信` `Webhook`。

## 强大自定义功能  

> 由前面的**监控模版**介绍，大概清楚了 hertzbeat 拥有的强大自定义功能。      
> 我们将每个监控类型都视为一个监控模版，不管是官方内置的还是后期用户自定义新增的。用户都可以方便的通过修改监控模版来新增修改删除监控指标。       
> 模版里面包含各个协议的使用，指标别名转换，指标计算，单位转换等一系列功能，帮助用户能采集到自己想要的监控指标。    

![hertzbeat](/img/docs/hertzbeat-arch.png)

## 无需 Agent  

> 对于使用过各种系统的用户来说，可能最麻烦头大的不过就是各种 agent 的安装部署调试了。     
> 每台主机得装个 agent，为了监控不同应用中间件可能还得装几个对应的 agent，量上来了轻轻松松上千个，写个批量脚本可能会减轻点负担。    
> agent 的版本是否与主应用兼容, agent 与主应用的通讯调试, agent 的同步升级等等等等，这些全是头大的点。    

hertzbeat 的原理就是使用不同的协议去直连对端系统，采集 PULL 的形式去拉取采集数据，无需用户在对端主机上部署安装 Agent | Exporter等。    
比如监控 linux, 在 hertzbeat 端输入IP端口账户密码或密钥即可。   
比如监控 mysql, 在 hertzbeat 端输入IP端口账户密码即可。    
**密码等敏感信息全链路加密** 

## 易用友好  

> 集 **监控+告警+通知** All in one, 无需单独部署多个组件服务。    
> 全UI界面操作，不管是新增监控，修改监控模版，还是告警阈值通知，都可在WEB界面操作完成，无需要修改文件或脚本或重启。     
> 无需 Agent, 监控对端我们只需在WEB界面填写所需IP端口账户密码等参数即可。   
> 自定义友好，只需一个监控模版YML，自动生成对应监控类型的监控管理页面，数据图表页面，阈值配置等。   
> 阈值告警通知友好，基于表达式阈值配置，多种告警通知渠道，支持告警静默，时段标签告警级别过滤等。   


-----

**`HertzBeat`的强大自定义，多类型支持，易扩展，低耦合，希望能帮助开发者和团队快速搭建自有监控系统。**

![hertzbeat](/img/home/0.png)  

![hertzbeat](/img/home/1.png)  

![hertzbeat](/img/home/2.png)  

![hertzbeat](/img/home/3.png)  

![hertzbeat](/img/home/4.png)  

![hertzbeat](/img/home/6.png)  

![hertzbeat](/img/home/7.png)  

![hertzbeat](/img/home/8.png)  

![hertzbeat](/img/home/9.png)  
