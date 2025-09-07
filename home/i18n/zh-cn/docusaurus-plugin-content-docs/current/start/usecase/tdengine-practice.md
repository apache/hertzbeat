---
id: tdengine-practice    
title: TDengine 监控案例    
sidebar_label: TDengine 监控案例
---

:::tip
TDengine TSDB 是一款 开源、高性能、云原生 的时序数据库（Time Series Database, TSDB, 它专为物联网、车联网、工业互联网、金融、IT 运维等场景优化设计。同时它还带有内建的缓存、流式计算、数据订阅等系统功能，能大幅减少系统设计的复杂度，降低研发和运营成本，是一款极简的时序数据处理平台。
:::

这篇文章介绍如何使用 Hertzbeat 监控系统对 TDengine 通用性能指标进行采集监控

## HertzBeat 是什么

Apache HertzBeat™ 一个拥有强大自定义监控能力，无需Agent的实时监控工具。网站监测，PING连通性，端口可用性，数据库，操作系统，中间件，API监控，阈值告警，告警通知(邮件微信钉钉飞书)。

> **github: <https://github.com/apache/hertzbeat>**

## 安装 HertzBeat

1. `docker` 环境仅需一条命令即可安装

   `docker run -d -p 1157:1157 -p 1158:1158 --name hertzbeat apache/hertzbeat`

2. 安装成功浏览器访问 `localhost:1157` 即可开始，默认账号密码 `admin/hertzbeat`

:::note
生产环境建议完整部署方式, 参考：<https://hertzbeat.apache.org/docs/start/docker-compose-deploy>
:::

## 启用 TDengine 监控

:::tip
TDengine TSDB 集成了多种监控指标收集机制，并通过 taosKeeper 进行汇总，taosKeeper 是 TDengine TSDB 3.0 版本监控指标的导出工具，通过简单的几项配置即可获取 TDengine TSDB 的运行状态，参考：<https://docs.taosdata.com/reference/components/taoskeeper/>
:::

## 监控 TDengine(PromQL)

1. 新增 TDengine-PromQL 监控

   > 系统页面 -> 监控中心 -> 新增监控 -> 自定义监控 -> TDengine-PromQL任务

   ![HertzBeat](/img/docs/start/tdengine_1.png)

2. 填写关键参数

   > **目标Host**：Prometheus 应用服务器地址（不带协议头，例如: https://, http:// ）
   >
   > **端口**：Prometheus api 端口，默认值：9090
   >
   > **端点路径**：Prometheus查询PromQL的URL，默认值：`/api/v1/query`
   >
   > 可以使用标签分类来管理任务，如添加`env=test`等业务相关标签。

   ![HertzBeat](/img/docs/start/tdengine_2.png)

3. 查看检测指标数据

   > 在监控列表可以查看任务状态，进监控详情可以查看指标数据图表等。

   ![HertzBeat](/img/docs/start/tdengine_3.png)

   ![HertzBeat](/img/docs/start/tdengine_4.png)

## 监控 TDengine(Prometheus)

1. 新增 AUTO 监控

   > 系统页面 -> 监控中心 -> 新增监控 -> AUTO -> Prometheus任务

   ![HertzBeat](/img/docs/start/tdengine_1_1.png)

2. 填写关键参数

   > **目标Host** taosKeeper 服务地址（不带协议头，例如: https://, http:// ）
   >
   > **端口**：taosKeeper服务端口（例如: 6043）
   >
   > **端点路径**：`/metrics`
   >
   > 可以使用标签分类来管理任务，如添加`env=test`等业务相关标签。

   ![HertzBeat](/img/docs/start/tdengine_1_2.png)

3. 查看检测指标数据

   > 在监控列表可以查看任务状态，进监控详情可以查看指标数据图表等。

   ![HertzBeat](/img/docs/start/tdengine_1_3.png)

   ![HertzBeat](/img/docs/start/tdengine_1_4.png)

### Grafana可视化集成 (可选)

1. Grafana 图表配置

   > 需启用 Grafana 可嵌入功能，并开启匿名访问。

   :::note

   完整配置请参考文档：[Grafana历史图表](https://hertzbeat.apache.org/zh-cn/docs/help/grafana_dashboard)
   :::

2. 在 HertzBeat 监控中嵌入 Grafana 仪表盘

   > 配置启用 Grafana 后，重启 HertzBeat 服务，在新增的 AUTO 监控中启用并上传 Grafana 模板。
   >
   > 比如：Grafana 数据源选择`hertzbeat-victoria-metrics`，然后在仪表盘点击:「Share」→「Export」→「Save to file」下载模板并上传至 HertzBeat 监控中，可参考：[taoskeeper-prometheus-dashboard](https://grafana.com/grafana/dashboards/15164-taoskeeper-prometheus-dashboard/)

   ![HertzBeat](/img/docs/start/tdengine_1_5.png)

3. 查看 Grafana 图表

   > 进入新增 AUTO 监控页面，点击 Grafana 图标按钮，即可查看 Grafana 图表。

   ![HertzBeat](/img/docs/start/tdengine_1_6.png)

## 告警与通知联动

1. HertzBeat 告警配置

   > 系统页面 -> 告警 -> 阈值规则 -> 新增 -> 新增阈值
   >

   ![HertzBeat](/img/docs/start/tdengine_5.png)

   > HertzBeat 提供了 **实时计算** 和 **计划周期** 两种类型的阈值规则设置，这里我们以 **计划周期** 阈值规则为例。
   >
   > - **阈值名称**：阈值规则名称
   > - **阈值规则**：填写指标监测的规则（支持 `PromQL`）
   > - **执行周期**：周期性执行阈值计算的时间间隔
   > - **告警级别**：触发阈值的告警级别,从低到高依次为: 警告-warning，严重-critical，紧急-emergency
   > - **触发次数**：设置触发阈值多少次之后才会发送告警
   > - **告警内容**：填写监测告警的内容（支持填写变量）

2. 设置阈值规则

   > 比如监测 Dnode 节点的系统使用的 CPU 百分比，添加阈值规则：`taos_dnodes_info_cpu_system_value > 20`
   >
   > 可以设置的阈值规则组合有很多，用户可以根据自身需要设置更丰富的告警规则。

   ![HertzBeat](/img/docs/start/tdengine_6.png)

   > 最后可以在 告警中心 看到已触发的告警。
   >

   ![HertzBeat](/img/docs/start/tdengine_7.png)

3. 告警通知

   > 系统页面 -> 消息通知 -> 通知媒介 -> 新增接收对象
   >

   ![HertzBeat](/img/docs/start/tdengine_8.png)

   > 系统页面 -> 消息通知 -> 通知策略 -> 新增通知策略 -> 选择接收对象并启用通知
   >

   ![HertzBeat](/img/docs/start/tdengine_9.png)

4. OK！当阈值规则触发后我们就可以收到对应告警消息啦，如果没有配置通知，也可以在告警中心查看告警信息。

## 总结

监控 TDengine 应用的实践就到这里，当然对 HertzBeat 来说这个功能只是冰山一角，如果您觉得 HertzBeat 这个开源项目不错的话欢迎在 GitHub、Gitee 点 **Star** 哦，您的 Star 是我们持续优化的动力！欢迎点亮小星星✨

**让监控更简单，期待与您共建生态！** 💝

**github: <https://github.com/apache/hertzbeat>**

**gitee: <https://gitee.com/hertzbeat/hertzbeat>**
