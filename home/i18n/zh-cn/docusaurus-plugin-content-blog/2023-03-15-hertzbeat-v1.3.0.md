---
title: 重磅更新 开源实时监控工具 HertzBeat v1.3.0 发布 在线自定义来了
author: tom  
author_title: tom   
author_url: https://github.com/tomsun28  
tags: [opensource, practice]
keywords: [开源监控系统, 告警系统, Linux监控]
---

官网: hertzbeat.com | tancloud.cn

## What is HertzBeat?
>
> HertzBeat赫兹跳动 是一个拥有强大自定义监控能力，无需 Agent 的开源实时监控告警工具。
> 集 **监控+告警+通知** 为一体，支持对应用服务，应用程序，数据库，缓存，操作系统，大数据，中间件，Web服务器，云原生，网络，自定义等指标监控，阈值告警通知一步到位。
> 支持更自由化的阈值规则(计算表达式)，`邮件` `Discord` `Slack` `Telegram` `钉钉` `微信` `飞书` `短信` `Webhook` 等方式及时送达。
>
> 我们将`Http, Jmx, Ssh, Snmp, Jdbc, Prometheus`等协议规范可配置化，您只需配置`YML`就能使用这些协议去自定义采集任何您想要的指标。
>
> 您相信只需定义YML就能立刻适配一款K8s或Docker等新的监控类型吗？

**Github: [https://github.com/apache/hertzbeat](https://github.com/apache/hertzbeat)**

**Gitee: [https://gitee.com/hertzbeat/hertzbeat](https://gitee.com/hertzbeat/hertzbeat)**

### v1.3.0 大版本来了

经过一个月的迭代更新，HertzBeat v1.3.0 在上周末正式发布啦, **推荐升级食用**！

- **支持在浏览器页面自定义监控**。hertzbeat拥有强大自定义监控能力，我们所有的已支持监控类型都映射为一个YML，之前用户使用自定义监控功能适配指标需要在后台编写YML文件并重启，体验欠佳且没有直观的感受。这次我们带来了自定义监控页面化，欢迎大家使用和分享贡献自己的监控类型定义。

- **支持对网络交换机的监控**。hertzbeat很早之前就支持了snmp协议，windows监控就是通过snmp协议来监控的，这个版本我们不仅支持了更多windows性能指标，还支持了snmp walk，适配了几款常见网络交换机的监控，欢迎贡献更多类型与指标给社区。

- **支持redis集群和更多数据库指标的监控**。社区贡献者们贡献了对redis集群和多种数据库的扩展指标，丰富了性能指标数据。

- **支持iotdb1.0存储，无依赖模式**等更多的新功能欢迎来探索

- 修复若干BUG，更完善的文档，重构了代码。

---
只需要一条docker命令即可安装体验heartbeat

`docker run -d -p 1157:1157 --name hertzbeat apache/hertzbeat`

感谢hertzbeat贡献者们的贡献！👍👍

我们急需对测试用例，新增应用监控，文档等各方面的贡献者，非常欢迎加入。

Feature：

1. [[webapp,doc] monitor detail support basic panel hide #619](https://github.com/apache/hertzbeat/pull/619) @tomsun28
2. [add alarm notification period #624](https://github.com/apache/hertzbeat/pull/624) @Ceilzcx
3. [[manager] support more mysql monitoring metrics #631](https://github.com/apache/hertzbeat/pull/631)
4. [[unit test] Add unit test cases for KeyPairUtil #635](https://github.com/apache/hertzbeat/pull/635) @Daydreamer-ia
5. [[test]feature:add AlertDefineService test #638](https://github.com/apache/hertzbeat/pull/638) @hudongdong129
6. [[unit test] Add unit test cases for AlertTemplateUtil #639](https://github.com/apache/hertzbeat/pull/639) @Daydreamer-ia
7. [[test] add junit WarehouseWorkerPoolTest #642](https://github.com/apache/hertzbeat/pull/642) @TherChenYang
8. [task #614 [Add monitoring parameters for Redis Cluster and Sentinel] #647](https://github.com/apache/hertzbeat/pull/647) @hudongdong129
9. [A minor refactoring of the class WarehouseWorkerPoolTest #648](https://github.com/apache/hertzbeat/pull/648) @HattoriHenzo
10. [[task]feature:Optimize Redis info [section] and Add Redis command statistics #665](https://github.com/apache/hertzbeat/pull/665) @hudongdong129
11. [[document]add redis help document #672](https://github.com/apache/hertzbeat/pull/672) @hudongdong129
12. [Jupiter dependency is explicitly declared in the main pom file #674](https://github.com/apache/hertzbeat/pull/674) @HattoriHenzo
13. [refactor monitor define yml, update doc #675](https://github.com/apache/hertzbeat/pull/675)
14. [[task]support more window metrics #676](https://github.com/apache/hertzbeat/pull/676) @hudongdong129
15. [support config monitoring define yml in web ui #678](https://github.com/apache/hertzbeat/pull/678)
16. [support delete monitoring define yml in web ui #679](https://github.com/apache/hertzbeat/pull/679)
17. [[manager] add mysql, oracle, pg db more metrics #683](https://github.com/apache/hertzbeat/pull/683)
18. [[warehouse] support jpa store metrics history data #684](https://github.com/apache/hertzbeat/pull/684)
19. [[collect]Add redis cluster auto-discovery display metrics information #685](https://github.com/apache/hertzbeat/pull/685) @hudongdong129
20. [Convert version into properties #686](https://github.com/apache/hertzbeat/pull/686) @HattoriHenzo
21. [[webapp] change default monitor intervals 120s to 60s #708](https://github.com/apache/hertzbeat/pull/708) @xiaohe428
22. [[warehouse] support jpa expired metrics data auto cleaner #691](https://github.com/apache/hertzbeat/pull/691)
23. [snmp collect protocol support walk operation #699](https://github.com/apache/hertzbeat/pull/699)
24. [support v1.0.+ iotdb #702](https://github.com/apache/hertzbeat/pull/702) @Ceilzcx
25. [feature support monitor switch network metrics #705](https://github.com/apache/hertzbeat/pull/705)
26. [[webapp] change alert define trigger times from max 10 to max 999 #706](https://github.com/apache/hertzbeat/pull/706) @Grass-Life
27. [[doc] change default locale i18n from zh-cn to en #725](https://github.com/apache/hertzbeat/pull/725)

Bugfix.

1. [[collector] bugfix oracle query error: ORA-01000 happen #618](https://github.com/apache/hertzbeat/pull/618)
2. [[manager]bugfix:update flink fields name, use _replace - avoid alert_threshold_expr problem. #622](https://github.com/apache/hertzbeat/pull/622) @cuipiheqiuqiu
3. [[webapp] fix rule days not change when edit old notice rule item #628](https://github.com/apache/hertzbeat/pull/628)
4. [[webapp] update alert notice modal item span #630](https://github.com/apache/hertzbeat/pull/630)
5. [Update issue.md #654](https://github.com/apache/hertzbeat/pull/654) @ycilry
6. [The version of Spring Boot should be put in properties #657](https://github.com/apache/hertzbeat/pull/657) @HattoriHenzo
7. [Bugfix: EdDSA provider not supported #659](https://github.com/apache/hertzbeat/pull/659) @caibenxiang
8. [[script] auto heap dump when oom error #662](https://github.com/apache/hertzbeat/pull/662)
9. [bugfix recurring tasks caused by priority processing exception #663](https://github.com/apache/hertzbeat/pull/663)
10. [bugfix repetitive collect tasks, reduce init mem size #664](https://github.com/apache/hertzbeat/pull/664)
11. [[manager] bugfix define yml file name and the app name are inconsistent #680](https://github.com/apache/hertzbeat/pull/680)
12. [[collector] bugfix metrics has a lot of repetition fields #682](https://github.com/apache/hertzbeat/pull/682)
13. [fix(sec): upgrade org.apache.kafka:kafka-clients to 3.4.0 #687](https://github.com/apache/hertzbeat/pull/687) @lifefloating
14. [optimized code and add iotdb compose config #690](https://github.com/apache/hertzbeat/pull/690) @Ceilzcx
15. [[script] modified the linux memory metrics specified script code #719](https://github.com/apache/hertzbeat/pull/719) @ByteIDance
16. [Update kubernetes.md #715](https://github.com/apache/hertzbeat/pull/715) @xiaohe428
17. [[home,i18n] Update kubernetes.md #716](https://github.com/apache/hertzbeat/pull/716) @baiban114
18. [[webapp] fix applist delete button display #693](https://github.com/apache/hertzbeat/pull/693)
19. [[warehouse] bugfix metrics data not consume oom #697](https://github.com/apache/hertzbeat/pull/697)
20. [[manager] bugfix npe when load old define yml in windows env #701](https://github.com/apache/hertzbeat/pull/701)
21. [bugfix job metrics set concurrent modification exception #723](https://github.com/apache/hertzbeat/pull/723)
22. [[script] modified the linux memory metrics specified script code #719](https://github.com/apache/hertzbeat/pull/719)
23. [[webapp] bugfix the cover of the big screen is too small #724](https://github.com/apache/hertzbeat/pull/724)

---

升级注意⚠️.

对于之前使用iotdb或者tdengine来存储指标数据的用户，需要修改 application.yml 来关闭JPA存储 `warehouse.store.jpa.enabled` 如下:

修改 `application.yml` 并设置 `warehouse.store.jpa.enabled` 参数为 false

```yaml
warehouse:
  store:
    jpa:
      enabled: false
```

执行SQL脚本

```shell
ALTER table hzb_monitor modify job_id bigint default null;
COMMIT;
```

---

## ⛄ Supported

- 网站监控, 端口可用性, Http Api, Ping连通性, Jvm, SiteMap全站, Ssl证书, SpringBoot, FTP服务器
- Mysql, PostgreSQL, MariaDB, Redis, ElasticSearch, SqlServer, Oracle, MongoDB, 达梦, OpenGauss, ClickHouse, IoTDB, Redis集群
- Linux, Ubuntu, CentOS, Windows
- Tomcat, Nacos, Zookeeper, RabbitMQ, Flink, Kafka, ShenYu, DynamicTp, Jetty, ActiveMQ
- Kubernetes, Docker
- Huawei Switch, HPE Switch, TP-LINK Switch, Cisco Switch
- 和更多你的自定义监控。
- 通知支持 `Discord` `Slack` `Telegram` `邮件` `钉钉` `微信` `飞书` `短信` `Webhook`。

---

**Github: [https://github.com/apache/hertzbeat](https://github.com/apache/hertzbeat)**
**Gitee: [https://gitee.com/hertzbeat/hertzbeat](https://gitee.com/hertzbeat/hertzbeat)**
