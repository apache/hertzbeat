---
title: Apache Hertzbeat 1.7.2 发布公告
author: tomsun28
author_title: tomsun28
author_url: https://github.com/zhangshenghang
author_image_url: https://avatars.githubusercontent.com/u/24788200?s=400&v=4
tags: [opensource, release]
keywords: [open source monitoring system, alerting system, Hertzbeat, release]
---

亲爱的社区小伙伴们，

我们很高兴地宣布 Apache Hertzbeat 1.7.2 版本正式发布！

## Downloads and Documentation

- **Apache Hertzbeat 1.7.2 Download Link**: <https://hertzbeat.apache.org/zh-cn/docs/download>
- **Apache Hertzbeat Documentation**: <https://hertzbeat.apache.org/zh-cn/docs/>

## Major Updates

### New Features and Enhancements

- **云服务告警集成**：支持阿里云 SLS 日志服务告警源 (#3422)、华为云云监控告警源 (#3443)、火山引擎告警源 (#3451)。
- **服务发现增强**：新增 Zookeeper 服务发现支持 (#3377)、Nacos 自动服务发现 (#3324)、支持认证的 HTTP 服务发现采集器 (#3388)。
- **AI 与数据源扩展**：集成 Ollama AI 模型 (#3441)、支持 OpenRouter AI 提供商 (#3439)、提供 GreptimeDB 作为 Grafana 数据源 (#3403)。
- **表达式与数据处理**：支持 sql 和 promql 表达式语法 (#3410)、新增批量导入指标至 VictoriaMetrics 功能 (#3337)。
- **平台兼容性**：新增 Darwin (macOS) 平台兼容支持 (#3431)。
- **监控指标增强**：新增 statusCode 指标数据 (#3446)。
- **更多新功能**

### Bug Fixes

- **告警通知问题**：修复 Uptime Kuma/Zabbix/腾讯云 Webhook URL 错误 (#3351)、飞书通知格式错误 (#3508)。
- **阈值功能异常**：修复 Prometheus 实时阈值不生效问题 (#3434)。
- **监控状态异常**：修复服务发现子监控状态显示错误 (#3340)、监控列表分页显示异常 (#3467)。
- **系统稳定性**：修复自定义监控公告板空指针异常 (#3448)、Jacoco 测试报告生成失败 (#3455)。
- **数据解析问题**：修复 ANTLR4 解析逻辑错误（二元运算符/向量）(#3482, #3488)、告警表达式解析异常 (#3497, #3504)。
- **数据存储优化**：改进 GreptimeDB 存储与查询逻辑 (#3387)。
- **和其它的BUG修复**

### Refactoring and Optimization

- **安全验证增强**：强化 URL 验证（企业微信/Telegram/Slack/Server酱）(#3361-3364)、JNDI 安全验证 (#3358)、插件服务路径验证 (#3375)。
- **架构与存储优化**：更新安全模型 (#3450)、数据库列类型优化（commonAnnotations/alertFingerprints 改为 TEXT）(#3463)、JDBC 逻辑调整 (#3500)。
- **开发工具链**：添加 Maven Wrapper (mvnw) (#3430)、依赖库更新 (#3359, #3498)、支持 mvnd 并优化后端构建 (#3491)。
- **可观测性**：默认禁用 OpenTelemetry exporters 防止连接错误 (#3437, #3461)。
- **社区协作**：更新 Issue 模板 (#3421)。
- **和其它的优化**

### Tests and Quality

- **单元测试覆盖**：为 HttpSdCollectImpl 添加单元测试 (#3386)
- **和其它的测试**

### Documentation Enhancements

- **国际化文档**：新增 30+ 组件日文文档（API/CentOS/Cisco 交换机/ClickHouse 等）(#3352, #3376, #3389 等)。
- **告警功能文档**：更新告警阈值配置 (#3399)、告警通知模板 (#3466)、火山引擎告警集成指南 (#3460)。
- **部署与配置**：新增 Grafana 匿名认证配置说明 (#3407)、Rainbond 云一键安装指南 (#3440)。
- **内容修正与优化**：修复时间模板语法错误 (#3378)、精炼中文术语 (#3380, #3383)、更新 Greptime-init 文档 (#3355)。
- **社区生态**：新增贡献者/Committer 简介 (#3357, #3391, #3395)、版本发布博客 (#3449)。
- **更多的文档更新**

## Acknowledgements

感谢以下社区成员的共同努力:

> @pruidong @MasamiYui @tomsun28 @Aias00 @zhangshenghang @zqr10159 @LiuTianyou @LL-LIN @lx1229 @xiaomizhou2 @pwallk
> @bigcyy @yuluo-yx @TJxiaobao @RainBondsongyg @Duansg @Calvin979 @Cyanty

## What's Changed

```markdown
* [bugfix] Fix incorrect webhook URLs for Uptime Kuma, Zabbix, and Tencent Cloud by @bigcyy in https://github.com/apache/hertzbeat/pull/3351
* [doc] japanese api by @Calvin979 in https://github.com/apache/hertzbeat/pull/3352
* [doc] update OS monitor by @MasamiYui in https://github.com/apache/hertzbeat/pull/3353
* [doc](start): update greptime-init documentation by @zqr10159 in https://github.com/apache/hertzbeat/pull/3355
* [doc] new ppmc liutianyou and update qq num by @tomsun28 in https://github.com/apache/hertzbeat/pull/3357
* [bugfix] Incorrect SD sub-monitor status by @MasamiYui in https://github.com/apache/hertzbeat/pull/3340
* [improve] improve url validation for WeComRobotAlertNotifyHandlerImpl by @Aias00 in https://github.com/apache/hertzbeat/pull/3361
* [improve] improve url validation for TelegramBotAlertNotifyHandlerImpl by @Aias00 in https://github.com/apache/hertzbeat/pull/3362
* [improve] improve url validation for SlackAlertNotifyHandlerImpl by @Aias00 in https://github.com/apache/hertzbeat/pull/3363
* [improve] improve url validation for serverChan by @Aias00 in https://github.com/apache/hertzbeat/pull/3364
* [improve] improve jndi validation by @Aias00 in https://github.com/apache/hertzbeat/pull/3358
* update maven dep by @Aias00 in https://github.com/apache/hertzbeat/pull/3359
* [doc] japanese centos by @Calvin979 in https://github.com/apache/hertzbeat/pull/3376
* [doc] fix incorrect time template syntax usercase in doc by @LL-LIN in https://github.com/apache/hertzbeat/pull/3378
* [doc] Add blog by @LiuTianyou in https://github.com/apache/hertzbeat/pull/3379
* [improve] add path validation for pluginservice by @Aias00 in https://github.com/apache/hertzbeat/pull/3375
* [feat] Support Zookeeper Service Discovery  by @bigcyy in https://github.com/apache/hertzbeat/pull/3377
* [doc] modify chinese words by @Duansg in https://github.com/apache/hertzbeat/pull/3380
* [Task] Batch import metrics data in victoria-metrics by @MasamiYui in https://github.com/apache/hertzbeat/pull/3337
* [feature] support auto nacos service discovery by @xiaomizhou2 in https://github.com/apache/hertzbeat/pull/3324
* [doc] modify supplement related documentation by @Duansg in https://github.com/apache/hertzbeat/pull/3383
* [doc] japanese cisco switch by @Calvin979 in https://github.com/apache/hertzbeat/pull/3389
* [test] Add unit tests for HttpSdCollectImpl by @xiaomizhou2 in https://github.com/apache/hertzbeat/pull/3386
* [fix](warehouse): improve GreptimeDB data storage and querying by @zqr10159 in https://github.com/apache/hertzbeat/pull/3387
* [doc] japanese clickhouse by @Calvin979 in https://github.com/apache/hertzbeat/pull/3390
* [doc] new contributor and committer, update doc by @tomsun28 in https://github.com/apache/hertzbeat/pull/3391
* [doc] japanese consul sd by @Calvin979 in https://github.com/apache/hertzbeat/pull/3392
* [doc]add new committer blog by @pwallk in https://github.com/apache/hertzbeat/pull/3395
* [doc] japanese coreos by @Calvin979 in https://github.com/apache/hertzbeat/pull/3393
* [doc] japanese dahua by @Calvin979 in https://github.com/apache/hertzbeat/pull/3396
* [doc] japanese Debian by @Calvin979 in https://github.com/apache/hertzbeat/pull/3398
* [improve] http sd collector adds authentication by @Cyanty in https://github.com/apache/hertzbeat/pull/3388
* [doc] japanese deepseek & dm by @Calvin979 in https://github.com/apache/hertzbeat/pull/3400
* [docs] update alert threshold doc by @bigcyy in https://github.com/apache/hertzbeat/pull/3399
* [doc] japanese dns by @Calvin979 in https://github.com/apache/hertzbeat/pull/3404
* [doc] japanese dns sd by @Calvin979 in https://github.com/apache/hertzbeat/pull/3405
* [doc] japanese docker by @Calvin979 in https://github.com/apache/hertzbeat/pull/3408
* [doc] japanese doris_be by @Calvin979 in https://github.com/apache/hertzbeat/pull/3409
* [Doc] Update 1.7.1  by @zhangshenghang in https://github.com/apache/hertzbeat/pull/3411
* [doc] update home doc by @tomsun28 in https://github.com/apache/hertzbeat/pull/3418
* [doc] Update anonymous user auth configuration of the grafana dashboard document by @Cyanty in https://github.com/apache/hertzbeat/pull/3407
* [doc] japanese doris_fe by @Calvin979 in https://github.com/apache/hertzbeat/pull/3416
* [infra]: Update issue tmpl by @yuluo-yx in https://github.com/apache/hertzbeat/pull/3421
* [feature]Make GreptimeDB as a grafana data source  by @zqr10159 in https://github.com/apache/hertzbeat/pull/3403
* [feat] support sql("...") and promql("...") expressions including SQL condition parsing by @bigcyy in https://github.com/apache/hertzbeat/pull/3410
* [doc] japanese dynamic_tp by @Calvin979 in https://github.com/apache/hertzbeat/pull/3419
* [doc] japanese elasticsearch by @Calvin979 in https://github.com/apache/hertzbeat/pull/3423
* [feature]Support Alibaba Cloud 'Simple Log Service(SLS)' alert source by @Duansg in https://github.com/apache/hertzbeat/pull/3422
* [Improve] add mvnw by @zhangshenghang in https://github.com/apache/hertzbeat/pull/3430
* [doc] japanese emqx by @Calvin979 in https://github.com/apache/hertzbeat/pull/3433
* [improvement] disable default OpenTelemetry exporters to prevent connection errors by @bigcyy in https://github.com/apache/hertzbeat/pull/3437
* [bugfix] Fix the issue where Prometheus RealTime Threshold is not eff… by @Duansg in https://github.com/apache/hertzbeat/pull/3434
* [feat] add support for ollama and update docs by @bigcyy in https://github.com/apache/hertzbeat/pull/3441
* [release] add support for darwin by @lx1229 in https://github.com/apache/hertzbeat/pull/3431
* [feature] Support Huawei Cloud `Cloud Eye` alert source by @Duansg in https://github.com/apache/hertzbeat/pull/3443
* [doc] japanese euleros by @Calvin979 in https://github.com/apache/hertzbeat/pull/3442
* docs: Add one-click installation for Rainbond Cloud by @RainBondsongyg in https://github.com/apache/hertzbeat/pull/3440
* [feat] add support for OpenRouter AI provider by @bigcyy in https://github.com/apache/hertzbeat/pull/3439
* [doc] japanese flink by @Calvin979 in https://github.com/apache/hertzbeat/pull/3447
* [security] update hertzbeat security model by @tomsun28 in https://github.com/apache/hertzbeat/pull/3450
* [feature] support volcengine alert source by @LiuTianyou in https://github.com/apache/hertzbeat/pull/3451
* [doc] add publish version 1.7.1 blog by @tomsun28 in https://github.com/apache/hertzbeat/pull/3449
* [doc] japanese flink on yarn by @Calvin979 in https://github.com/apache/hertzbeat/pull/3452
* [doc] japanese freebsd by @Calvin979 in https://github.com/apache/hertzbeat/pull/3456
* [improvement] disable default OpenTelemetry exporters to prevent connection errors by @bigcyy in https://github.com/apache/hertzbeat/pull/3461
* [doc] add doc for integrate volcengine alerts by @LiuTianyou in https://github.com/apache/hertzbeat/pull/3460
* [Fix] fix custom monitoring bulletin `NullPointerException` by @Duansg in https://github.com/apache/hertzbeat/pull/3448
* [fix] fix jacoco can not generate test reports. by @Duansg in https://github.com/apache/hertzbeat/pull/3455
* [doc] Alert notification template by @MasamiYui in https://github.com/apache/hertzbeat/pull/3466
* [doc] japanese greenplum by @Calvin979 in https://github.com/apache/hertzbeat/pull/3468
* [improvement] change column definitions for commonAnnotations and alertFingerprints to TEXT type by @bigcyy in https://github.com/apache/hertzbeat/pull/3463
* [fix] Fix `Monitors` paging display. by @Duansg in https://github.com/apache/hertzbeat/pull/3467
* [doc] japanese greptime by @Calvin979 in https://github.com/apache/hertzbeat/pull/3469
* [doc] japanese h3c switch by @Calvin979 in https://github.com/apache/hertzbeat/pull/3471
* [feature] Add statusCode metrics data. by @Duansg in https://github.com/apache/hertzbeat/pull/3446
* [doc] japanese hadoop by @Calvin979 in https://github.com/apache/hertzbeat/pull/3476
* [docs](webhook): update Chinese documentation for alert integration by @zqr10159 in https://github.com/apache/hertzbeat/pull/3478
* [doc] japanese hbase master by @Calvin979 in https://github.com/apache/hertzbeat/pull/3477
* [doc] japanese hbase region server by @Calvin979 in https://github.com/apache/hertzbeat/pull/3479
* [doc] japanese hdfs datanode by @Calvin979 in https://github.com/apache/hertzbeat/pull/3487
* [fix] antlr4 `vectors and` parse semantic fixes and optimizations by @Duansg in https://github.com/apache/hertzbeat/pull/3482
* [ci]: add mvnd support and update backend build by @zqr10159 in https://github.com/apache/hertzbeat/pull/3491
* [doc] japanese hdfs namenode by @Calvin979 in https://github.com/apache/hertzbeat/pull/3490
* [doc] japanese hertzbeat by @Calvin979 in https://github.com/apache/hertzbeat/pull/3492
* [fix] Fix antlr4 parsing of `or` and `unless` logical and set binary operators by @Duansg in https://github.com/apache/hertzbeat/pull/3488
* [doc] japanese hertzbeat token by @Calvin979 in https://github.com/apache/hertzbeat/pull/3493
* [feat] update_mvnd_version by @Aias00 in https://github.com/apache/hertzbeat/pull/3498
* add:a small jdbc modified. by @TJxiaobao in https://github.com/apache/hertzbeat/pull/3500
* fixed:a minor issue change by @TJxiaobao in https://github.com/apache/hertzbeat/pull/3428
* [bugfix] Fix incorrect expression parsing in alert setting component by @bigcyy in https://github.com/apache/hertzbeat/pull/3497
* [bugfix] Correctly parse binary comparison expressions by @bigcyy in https://github.com/apache/hertzbeat/pull/3504
* [bugfix]Fixed an error in the format of the flying book notification by @pruidong in https://github.com/apache/hertzbeat/pull/3508
* [release] release new version 1.7.2 by @tomsun28 in https://github.com/apache/hertzbeat/pull/3510
```

## Apache Hertzbeat

**仓库地址：**

<https://github.com/apache/hertzbeat>

**网址：**

<https://hertzbeat.apache.org/>

**Apache Hertzbeat 下载地址：**

<https://hertzbeat.apache.org/zh-cn/docs/download>

**Apache Hertzbeat Docker 镜像版本：**

> Apache HertzBeat 为每个版本制作了 Docker 镜像. 你可以从 Docker Hub 拉取使用.

- HertzBeat <https://hub.docker.com/r/apache/hertzbeat>
- HertzBeat Collector <https://hub.docker.com/r/apache/hertzbeat-collector>

**Apache Hertzbeat 开源社区如何参与？**

<https://hertzbeat.apache.org/zh-cn/docs/community/contribution>
