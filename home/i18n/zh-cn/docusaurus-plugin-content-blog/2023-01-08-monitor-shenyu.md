---
title: 使用 HertzBeat 对 API 网关 Apache ShenYu 的监控实践    
author: tom  
author_title: tom   
author_url: https://github.com/tomsun28  
author_image_url: https://avatars.githubusercontent.com/u/24788200?s=400&v=4  
tags: [opensource, practice]
---

## 使用 HertzBeat 对 API 网关 Apache ShenYu 进行监控实践，5分钟搞定

### Apache ShenYu 介绍

> Apache ShenYu 一个异步的，高性能的，跨语言的，响应式的 API 网关。

- 代理：支持Apache Dubbo，Spring Cloud，gRPC，Motan，SOFA，TARS，WebSocket，MQTT
- 安全性：签名，OAuth 2.0，JSON Web令牌，WAF插件
- API治理：请求、响应、参数映射、Hystrix、RateLimiter插件
- 可观测性：跟踪、指标、日志记录插件
- 仪表板：动态流量控制，用户菜单权限的可视化后端
- 扩展：插件热插拔，动态加载
- 集群：NGINX、Docker、Kubernetes
- 语言：提供.NET，Python，Go，Java客户端用于API注册

### HertzBeat 介绍

> HertzBeat 是一款开源，易用友好的实时监控工具，无需Agent，拥有强大自定义监控能力。
> 支持对应用服务，数据库，操作系统，中间件，云原生等监控，阈值告警，告警通知(邮件微信钉钉飞书)。
> HertzBeat 的强大自定义，多类型支持，易扩展，低耦合，希望能帮助开发者和中小团队快速搭建自有监控系统。

### 在 HertzBeat 5分钟搞定监控 Apache ShenYu

#### 操作前提，您已拥有 ShenYu 环境和 HertzBeat 环境

- ShenYu [部署安装文档](https://shenyu.apache.org/zh/docs/deployment/deployment-before)
- HertzBeat [部署安装文档](https://hertzbeat.com/docs/start/docker-deploy)

#### 一. 在 ShenYu 端开启`metrics`插件，它将提供 metrics 接口数据

> 插件是 Apache ShenYu 网关的核心执行者，指标数据采集在 `ShenYu` 也是以插件的形式集成的 - `Metrics插件`。
> `Metrics插件`是网关用来监控自身运行状态（`JVM`相关），请求响应等相关指标进行监测。

1. 在网关的 `pom.xml` 文件中添加 `metrics插件` 的依赖。

    ```xml
    <dependency>
        <groupId>org.apache.shenyu</groupId>
        <artifactId>shenyu-spring-boot-starter-plugin-metrics</artifactId>
        <version>${project.version}</version>
    </dependency>
    ```

2. `metric`插件 采集默认是关闭的, 在网关的配置`yaml`文件中编辑如下内容：

    ```yaml
    shenyu:
      metrics:
        enabled: true  #设置为 true 表示开启
        name : prometheus 
        host: 127.0.0.1 #暴露的ip
        port: 8090 #暴露的端口
        jmxConfig: #jmx配置
        props:
          jvm_enabled: true #开启jvm的监控指标
    ```

3. 重启 ShenYu网关, 打开浏览器或者用curl 访问 `http://ip:8090`, 就能看到metric数据了。

#### 二. 在 HertzBeat 监控页面添加 ShenYu 监控

1. 点击新增 ShenYu 监控

    路径：菜单 -> 中间件监控 -> ShenYu监控 -> 新增ShenYu监控

    ![HertzBeat](/img/blog/monitor-shenyu-1.png)

2. 配置监控 ShenYu 所需参数

    在监控页面填写 ShenYu **服务IP**，**监控端口**(默认8090)，最后点击确定添加即可。
    其他参数如**采集间隔**，**超时时间**等可以参考[帮助文档](https://hertzbeat.com/docs/help/shenyu/) <https://hertzbeat.com/docs/help/shenyu/>

    ![HertzBeat](/img/blog/monitor-shenyu-1.png)

3. 完成✅,现在我们已经添加好对 ShenYu 的监控了，查看监控列表即可看到我们的添加项。

    ![HertzBeat](/img/blog/monitor-shenyu-3.png)

4. 点击监控列表项的**操作**->**监控详情图标** 即可浏览 ShenYu 的实时监控指标数据。

    ![HertzBeat](/img/blog/monitor-shenyu-4.png)

5. 点击**监控历史详情TAB** 即可浏览 ShenYu 的历史监控指标数据图表📈。

    ![HertzBeat](/img/blog/monitor-shenyu-5.png)

    ![HertzBeat](/img/blog/monitor-shenyu-6.png)

**DONE！完成啦！通过上面几步，总结起来其实也就只用两步**  

- **第一步开启 ShenYu 端`metrics`插件功能**
- **第二步在 HertzBeat 监控页面配置IP端口添加监控即可**

:::tip
通过上面的两步我们就完成了对 Apache ShenYu 的监控，我们可以在 HertzBeat 随时查看监控详情指标信息来观测其服务状态。
当然只是看肯定是不完美的，监控往往伴随着告警阈值，当 ShenYu 的某些指标超出我们的期望值或异常时，能及时的通知到我们对应的负责人，负责人收到通知处理问题，这样才是一个完整的监控告警流程。
:::

**接下来我们就来一步一步演示如何配置 HertzBeat 系统里的阈值告警通知，让 ShenYu 的指标异常时，及时通知给我们**

#### 三. 在 HertzBeat 系统添加 ShenYu 指标阈值告警

1. 对某个重要指标配置告警阈值

    路径：菜单 -> 告警阈值 -> 新增阈值

   - 选择配置的指标对象，ShenYu 监控有非常多的指标，我们举例对 `打开的文件描述符的数量` `process_open_fds` -> `value` 这个指标进行阈值设置， 当服务端打开文件描述符数量大于3000时发出告警。
   - 这里我们就配置当此指标`process_open_fds` 的 `value>3000` 时发出告警，告警级别为**警告告警**，三次即触发，具体如下图。

    ![HertzBeat](/img/blog/monitor-shenyu-7.png)

2. 新增消息通知接收人

    > 配置接收人，让告警消息知道要发给谁，用什么方式发。

    路径：菜单 -> 告警通知 -> 告警接收人 -> 新增接收人

    消息通知方式支持 **邮件，钉钉，企业微信，飞书，WebHook，短信**等，我们这里以常用的钉钉为例。

   - 参照此[帮助文档](https://hertzbeat.com/docs/help/alert_dingtalk) <https://hertzbeat.com/docs/help/alert_dingtalk> 在钉钉端配置机器人，设置安全自定义关键词`HertzBeat`，获取对应`access_token`值。
   - 在 HertzBeat 配置接收人参数如下。

    【告警通知】->【新增接收人】 ->【选择钉钉机器人通知方式】->【设置钉钉机器人ACCESS_TOKEN】-> 【确定】

    ![HertzBeat](/img/blog/alert-notice-1.png)

3. 配置关联的告警通知策略⚠️ 【新增通知策略】-> 【将刚设置的接收人关联】-> 【确定】

    > 配置告警通知策略，让告警消息与接收人绑定，这样就能决定哪些告警发给哪个人。

    ![HertzBeat](/img/blog/alert-notice-2.png)

### 完毕，现在坐等告警消息过来啦。叮叮叮叮

```text
[HertzBeat告警通知]
告警目标对象 : shenyu.process_open_fds.value
所属监控任务ID : 205540620349696
所属任务名称 : SHENYU_localhost
告警级别 : 警告告警
告警触发时间 : 2023-01-08 22:17:06
内容详情 : 请注意⚠️ ShenYu网关打开的文件描述符的数量为 3044 超过3000
```

## 小结

:::tip
这篇实践文章带我们体验了如何使用 HertzBeat 监控 Apache ShenYu 指标数据，可以发现将 `监控-告警-通知` 集一体的 HertzBeat 在操作与使用方面更加的便捷，在页面上简单点一点就能把 ShenYu 纳入监控，再也不需要部署多个组件，写多个有门槛的YML配置文件了。  
:::

Apache ShenYu Github: <https://github.com/apache/shenyu>
HertzBeat Github: <https://github.com/apache/hertzbeat>

**欢迎了解使用Star支持哦！**

只需要一条docker命令即可安装体验heartbeat ：
`docker run -d -p 1157:1157 --name hertzbeat apache/hertzbeat`
