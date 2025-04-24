---
id: springboot-auto-practice  
title: SpringBoot Web应用监控案例  
sidebar_label: SpringBoot Web应用监控案例  
---

:::tip

在云原生时代，SpringBoot应用的监控与可视化已然成为运维体系的核心环节，实时监控应用性能是保障系统稳定性的关键。

:::

这篇文章介绍使用 HertzBeat 监控系统实现从指标采集、可视化到告警通知的一体化解决方案，并展示完整操作流程与监控实践。

## HertzBeat 是什么

Apache HertzBeat (incubating) 一个拥有强大自定义监控能力，无需Agent的实时监控工具。网站监测，PING连通性，端口可用性，数据库，操作系统，中间件，API监控，阈值告警，告警通知(邮件微信钉钉飞书)。

**github: <https://github.com/apache/hertzbeat>**

## 安装 HertzBeat

> 生产环境中推荐使用 **PostgreSQL** + **VictoriaMetrics** 服务的方式部署 HertzBeat。

1. 部署 HertzBeat

   > 下载安装包
   >
   > 从 [下载页面](https://hertzbeat.apache.org/zh-cn/docs/download) 下载您系统环境对应的安装包版本 `apache-hertzbeat-xxx-incubating-bin.tar.gz`。解压安装包到主机，如: `/opt/hertzbeat`

   ```sh
   tar zxvf apache-hertzbeat-xxx-incubating-bin.tar.gz
   ```

2. 快速安装 PostgreSQL + VictoriaMetrics 服务

   > Docker 安装 PostgreSQL

   ```sh
   docker run -d --name postgresql -p 5432:5432 -v "$PWD/postgresql:/var/lib/postgresql/data" -e POSTGRES_USER=root -e POSTGRES_PASSWORD=123456 -e TZ=Asia/Shanghai postgres:15
   ```

   > Docker 安装 VictoriaMetrics

   ```sh
   docker run -d -p 8428:8428 -v "$PWD/victoria-metrics-data:/victoria-metrics-data" --name victoria-metrics victoriametrics/victoria-metrics:v1.95.1
   ```

3. 修改 HertzBeat 的配置文件

   > 切换元数据储存数据源
   >
   > 修改位于 `hertzbeat/config/application.yml` 的配置文件，替换为 PostgreSQL 服务。

   :::note

   PostgreSQL 配置请查阅文档：[元数据存储PostgreSQL(推荐)](https://hertzbeat.apache.org/zh-cn/docs/start/postgresql-change)
   :::

   > 配置时序数据库存储指标
   >
   > 同理，修改 `hertzbeat/config/application.yml` 的配置文件，开启 VictoriaMetrics 服务用于存储指标。

   :::note

   VictoriaMetrics 配置请查阅文档：[指标数据存储VictoriaMetrics(推荐)](https://hertzbeat.apache.org/zh-cn/docs/start/victoria-metrics-init)
   :::

4. 启动 HertzBeat

   > 在上述解压好的安装目录 bin 下的启动脚本 `startup.sh`，windows 环境下为 `startup.bat`。
   >
   > 启动成功后，浏览器访问 `localhost:1157` 即可开始，默认账号密码 `admin/hertzbeat`。

   ```sh
   ./startup.sh
   ```

## SpringBoot 应用配置

1. 开启 Actuator 配置

   > 在项目 `pom.xml` 中添加依赖：
   >

   ```xml
   <dependency>
       <groupId>org.springframework.boot</groupId>
       <artifactId>spring-boot-starter-actuator</artifactId>
   </dependency>
   <dependency>
       <groupId>io.micrometer</groupId>
       <artifactId>micrometer-registry-prometheus</artifactId>
   </dependency>
   ```

   > 配置 `application.yml` 暴露端点：
   >

   ```yml
   management:
     endpoints:
       web:
         exposure:
           include: '*'
       enabled-by-default: true
     metrics:
       export:
         prometheus:
           enabled: true
   ```

   > *注意：如果你的项目里还引入了认证相关的依赖，比如 springboot-security ,那么 SpringBoot Actuator 暴露出的接口可能会被拦截，此时需要你手动放开这些接口，以 springboot-security 为例，需要在 SecurityConfig 配置类中加入以下代码：*

   ```java
   public class SecurityConfig extends WebSecurityConfigurerAdapter{
       @Override
       protected void configure(HttpSecurity httpSecurity) throws Exception{
           httpSecurity
                   // 配置要放开的接口
                   .antMatchers("/actuator/**").permitAll()
                   .antMatchers("/metrics/**").permitAll()
                   .antMatchers("/trace").permitAll()
                   .antMatchers("/heapdump").permitAll()
                   // ...
       }
   }
   ```

2. 验证端点

   > SpringBoot 程序启动后，请求URL:
   >
   > - `http://<your-host>:<port>/actuator`: 验证已启用的端点，
   > - `http://<your-host>:<port>/actuator/prometheus`: 应返回指标数据。

## 监控 SpringBoot 应用

1. 新增 AUTO 监控

   > 系统页面 -> 监控中心 -> 新增监控 -> AUTO -> Prometheus任务
   >

   ![HertzBeat](/img/docs/start/springboot-auto-practice-1.png)

2. 填写关键参数

   > **目标Host**：SpringBoot 应用服务器地址（不带协议头，例如: https://, http:// ）
   >
   > **端口**：应用服务端口（例如: 8080）
   >
   > **端点路径**：`/actuator/prometheus`
   >
   > 可以使用标签分类来管理任务，如添加`env=test`等业务相关标签。

   ![HertzBeat](/img/docs/start/springboot-auto-practice-2.png)

3. 查看检测指标数据

   > 点击进入新建监控，可以查看指标数据详情及指标历史图表等。
   >

   ![HertzBeat](/img/docs/start/springboot-auto-practice-3.png)

   ![HertzBeat](/img/docs/start/springboot-auto-practice-4.png)

## Grafana可视化集成 (可选)

1. Grafana 图表配置

   > 需启用 Grafana 可嵌入功能，并开启匿名访问。

   :::note

   完整配置请参考文档：[Grafana历史图表](https://hertzbeat.apache.org/zh-cn/docs/help/grafana_dashboard)
   :::

2. 在 HertzBeat 监控中嵌入 Grafana 仪表盘

   > 配置启用 Grafana 后，重启 HertzBeat 服务，在新增的 AUTO 监控中启用并上传 Grafana 模板。
   >
   > 比如：Grafana 数据源选择`hertzbeat-victoria-metrics`，然后在仪表盘点击:「Share」→「Export」→「Save to file」下载模板并上传至 HertzBeat 监控中。

   ![HertzBeat](/img/docs/start/springboot-auto-practice-5.png)

3. 查看 Grafana 图表

   > 进入新增 AUTO 监控页面，点击 Grafana 图标按钮，即可查看 Grafana 图表。

   ![HertzBeat](/img/docs/start/springboot-auto-practice-6.png)

## 告警与通知联动

1. HertzBeat 告警配置

   > 系统页面 -> 告警 -> 阈值规则 -> 新增 -> 新增阈值
   >

   ![HertzBeat](/img/docs/start/springboot-auto-practice-7.png)

   > HertzBeat 提供了 **实时计算** 和 **计划周期** 两种类型的阈值规则设置，这里我们以 **计划周期** 阈值规则为例。
   >
   > - **阈值名称**：阈值规则名称
   > - **阈值规则**：填写指标监测的规则（支持 `PromQL`）
   > - **执行周期**：周期性执行阈值计算的时间间隔
   > - **告警级别**：触发阈值的告警级别,从低到高依次为: 警告-warning，严重-critical，紧急-emergency
   > - **触发次数**：设置触发阈值多少次之后才会发送告警
   > - **告警内容**：填写监测告警的内容（支持填写变量）

2. 设置阈值规则

   > 比如监测 SpringBoot 应用程序的 CPU 占用，添加阈值规则：`system_cpu_usage{job="Jolly_Vulture_43vT"} > 0.01`
   >
   > 可以设置的阈值规则组合有很多，用户可以根据自身需要设置更丰富的告警规则。

   ![HertzBeat](/img/docs/start/springboot-auto-practice-8.png)

   > 最后可以在 告警中心 看到已触发的告警。
   >

   ![HertzBeat](/img/docs/start/springboot-auto-practice-9.png)

3. 告警通知

   > 系统页面 -> 消息通知 -> 通知媒介 -> 新增接收对象
   >

   ![HertzBeat](/img/docs/start/springboot-auto-practice-10.png)

   > 系统页面 -> 消息通知 -> 通知策略 -> 新增通知策略 -> 选择接收对象并启用通知
   >

   ![HertzBeat](/img/docs/start/springboot-auto-practice-11.png)

4. OK！当阈值规则触发后我们就可以收到对应告警消息啦，如果没有配置通知，也可以在告警中心查看告警信息。

## 小总结

这篇文章通过简洁的监控配置，用户在几分钟之内就可搭建完整的监控体系，这充分体现了 HertzBeat 的几点优势：

- 无需部署 Exporter 和 Agent 即可监控 SpringBoot Actuator 端点，支持自定义指标采集与告警规则。
- 轻量化：相比传统 Prometheus + AlertManager 组合，HertzBeat 简化了部署和维护流程。
- 无缝集成 Grafana，HertzBeat 将采集的时序数据实时推送至 Grafana 构建可视化仪表盘。
- 监控+告警+通知功能整合联动，全协议覆盖 + 实时/周期阈值检测 + 多通道通知（钉钉/飞书/Webhook等）。

------

## 结束搞定

监控 SpringBoot 应用的实践就到这里，当然对 HertzBeat 来说这个功能只是冰山一角，如果您觉得 HertzBeat 这个开源项目不错的话欢迎在 GitHub、Gitee 点 **Star** 哦，您的 Star 是我们持续优化的动力！欢迎点亮小星星✨

**让监控更简单，期待与您共建生态！** 💝

**github: <https://github.com/apache/hertzbeat>**

**gitee: <https://gitee.com/hertzbeat/hertzbeat>**
