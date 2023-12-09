---
id: images-deploy  
title: HertzBeat 华为云镜像部署   
sidebar_label: HertzBeat 华为云镜像部署快速指引    
---


> 易用友好的开源实时监控告警工具，无需Agent，强大自定义监控能力。

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

> [HertzBeat赫兹跳动](https://github.com/dromara/hertzbeat) 是一个拥有强大自定义监控能力，无需 Agent 的开源实时监控告警工具。     
> 集 **监控+告警+通知** 为一体，支持对应用服务，应用程序，数据库，缓存，操作系统，大数据，中间件，Web服务器，云原生，网络，自定义等监控，阈值告警通知一步到位。   
> 更自由化的阈值规则(计算表达式)，`邮件` `Discord` `Slack` `Telegram` `钉钉` `微信` `飞书` `短信` `Webhook` 等方式及时送达。

> 我们将`Http, Jmx, Ssh, Snmp, Jdbc, Prometheus`等协议规范可配置化，您只需在浏览器配置`YML`就能使用这些协议去自定义采集任何您想要的指标。    
> 您相信只需配置下就能立刻适配一款`K8s`或`Docker`等新的监控类型吗？

> `HertzBeat`的强大自定义，多类型支持，易扩展，低耦合，希望能帮助开发者和中小团队快速搭建自有监控系统。    
> 当然我们也提供了对应的 **[SAAS版本监控云](https://console.tancloud.cn)**，中小团队和个人无需再为了监控自己的网站资源，而去部署学习一套繁琐的监控系统，**[登录即可免费开始](https://console.tancloud.cn)**。


----   

[![hertzbeat](/img/home/1.png)](https://www.bilibili.com/video/BV1LY4y1m7rH/)

[![hertzbeat](/img/home/9.png)](https://www.bilibili.com/video/BV1LY4y1m7rH/)

## ⛄ Supported

- [网站监控](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-website.yml), [端口可用性](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-port.yml),
  [Http Api](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-api.yml), [Ping连通性](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-ping.yml),
  [Jvm](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-jvm.yml), [SiteMap全站](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-fullsite.yml),
  [Ssl证书](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-ssl_cert.yml), [SpringBoot](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-springboot2.yml),
  [FTP服务器](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-ftp.yml)
- [Mysql](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-mysql.yml), [PostgreSQL](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-postgresql.yml),
  [MariaDB](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-mariadb.yml), [Redis](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-redis.yml),
  [ElasticSearch](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-elasticsearch.yml), [SqlServer](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-sqlserver.yml),
  [Oracle](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-oracle.yml), [MongoDB](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-mongodb.yml),
  [达梦](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-dm.yml), [OpenGauss](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-opengauss.yml),
  [ClickHouse](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-clickhouse.yml), [IoTDB](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-iotdb.yml)
- [Linux](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-linux.yml), [Ubuntu](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-ubuntu.yml),
  [CentOS](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-centos.yml), [Windows](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-windows.yml)
- [Tomcat](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-tomcat.yml), [Nacos](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-nacos.yml),
  [Zookeeper](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-zookeeper.yml), [RabbitMQ](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-rabbitmq.yml),
  [Flink](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-flink.yml), [Kafka](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-kafka.yml),
  [ShenYu](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-shenyu.yml), [DynamicTp](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-dynamic_tp.yml),
  [Jetty](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-jetty.yml), [ActiveMQ](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-activemq.yml)
- [Kubernetes](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-kubernetes.yml), [Docker](https://github.com/dromara/hertzbeat/tree/master/manager/src/main/resources/define/app-docker.yml)
- 和更多的自定义监控。
- 通知支持 `Discord` `Slack` `Telegram` `邮件` `钉钉` `微信` `飞书` `短信` `Webhook`。

## 镜像部署  

> HertzBeat支持在Linux Windows Mac系统安装运行，CPU支持X86/ARM64。 

1. 开通服务器时选用 HertzBeat 镜像
2. 启动服务器
3. 配置HertzBeat的配置文件(可选)

   修改位于 `/opt/hertzbeat/config/application.yml` 的配置文件(可选)，您可以根据需求修改配置文件
   - 若需使用邮件发送告警，需替换`application.yml`里面的邮件服务器参数
   - **推荐**若需使用外置Mysql数据库替换内置H2数据库，需替换`application.yml`里面的`spring.datasource`参数 具体步骤参见 [H2数据库切换为MYSQL](../start/mysql-change)）
   - **推荐**若需使用时序数据库TDengine来存储指标数据，需替换`application.yml`里面的`warehouse.store.td-engine`参数 具体步骤参见 [使用TDengine存储指标数据](../start/tdengine-init)
   - **推荐**若需使用时序数据库IotDB来存储指标数据库，需替换`application.yml`里面的`warehouse.storeiot-db`参数 具体步骤参见 [使用IotDB存储指标数据](../start/iotdb-init)

   
4. 配置用户配置文件(可选,自定义配置用户密码)     
   HertzBeat默认内置三个用户账户,分别为 admin/hertzbeat tom/hertzbeat guest/hertzbeat     
   若需要新增删除修改账户或密码，可以通过修改位于 `/opt/hertzbeat/config/sureness.yml` 的配置文件实现，若无此需求可忽略此步骤     
   具体参考 [配置修改账户密码](../start/account-modify)

5. 部署启动
   执行位于安装目录/opt/hertzbeat/bin/下的启动脚本 startup.sh, windows环境下为 startup.bat
   ``` 
   $ ./startup.sh 
   ```

6. 开始探索HertzBeat  
   浏览器访问 http://ip:1157/ 即刻开始探索使用HertzBeat，默认账户密码 admin/hertzbeat。

**HAVE FUN**

### 部署常见问题

**最多的问题就是网络问题，请先提前排查**

1. **按照流程部署，访问 http://ip:1157/ 无界面**   
   请参考下面几点排查问题：
> 一：若切换了依赖服务MYSQL数据库，排查数据库是否成功创建，是否启动成功
> 二：HertzBeat的配置文件 `hertzbeat/config/application.yml` 里面的依赖服务IP账户密码等配置是否正确    
> 三：若都无问题可以查看 `hertzbeat/logs/` 目录下面的运行日志是否有明显错误，提issue或交流群或社区反馈

2. **监控历史图表长时间都一直无数据**
> 一：Tdengine或IoTDB是否配置，未配置则无历史图表数据  
> 二：若使用了Tdengine，排查Tdengine的数据库`hertzbeat`是否创建
> 三: HertzBeat的配置文件 `application.yml` 里面的依赖服务 IotDB 或 Tdengine IP账户密码等配置是否正确   
