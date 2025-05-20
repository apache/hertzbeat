---
title: SSL证书过期监控最佳实践
author: tom  
author_title: tom   
author_url: https://github.com/tomsun28  
author_image_url: https://avatars.githubusercontent.com/u/24788200?s=400&v=4  
tags: [opensource, practice]
---

先祝看到的同学中秋快乐，身体健康，在身体健康的基础上尽量暴富。

进入正题，现在大部分网站都默认支持 HTTPS，我们申请的证书一般是3个月或者1年，很容易随着时间的流逝SSL证书过期了我们却没有第一时间发现，或者在过期之前没有及时更新证书。

今天这篇文章介绍如果使用 hertzbeat 监控系统来检测我们网站的SSL证书有效期，当证书过期时或证书快过期前几天，给我们发告警消息。

#### HertzBeat是什么

HertzBeat 一个拥有强大自定义监控能力，无需Agent的实时监控工具。网站监测，PING连通性，端口可用性，数据库，操作系统，中间件，API监控，阈值告警，告警通知(邮件微信钉钉飞书)。

**官网: <https://hertzbeat.com> | <https://tancloud.cn>**

github: <https://github.com/apache/hertzbeat>
gitee: <https://gitee.com/hertzbeat/hertzbeat>

#### 安装 HertzBeat

1. 如果不想安装可以直接使用云服务 [TanCloud探云 console.tancloud.cn](https://console.tancloud.cn)

2. `docker` 环境仅需一条命令即可安装

    `docker run -d -p 1157:1157 --name hertzbeat apache/hertzbeat`

3. 安装成功浏览器访问 `localhost:1157` 即可开始，默认账号密码 `admin/hertzbeat`

#### 监控SSL证书

1. 点击新增SSL证书监控

    > 系统页面 -> 监控菜单 -> SSL证书 -> 新增SSL证书

    ![HertzBeat](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/bd53f343a5b54feab62e71458d076441~tplv-k3u1fbpfcp-zoom-1.image)

2. 配置监控网站

    > 我们这里举例监控百度网站, 配置监控host域名，名称，采集间隔等。
    > 点击确定 注意⚠️新增前默认会先去测试网站连接性，连接成功才会新增，当然也可以把**是否测试**按钮置灰。

    ![HertzBeat](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/ad1154670648413bb82c8bdeb5b13609~tplv-k3u1fbpfcp-zoom-1.image)

3. 查看检测指标数据

    > 在监控列表可以查看任务状态，进监控详情可以查看指标数据图表等。

    ![HertzBeat](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/f874b45e909c4bb0acdd28b3fb034a61~tplv-k3u1fbpfcp-zoom-1.image)

    ![HertzBeat](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/ef5d7443f8c04818ae5aa28d421203be~tplv-k3u1fbpfcp-zoom-1.image)

4. 设置阈值(证书过期时触发)

    > 系统页面 -> 告警 -> 告警阈值 -> 新增阈值

    ![HertzBeat](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/8d6205172d43463aa34e534477f132f1~tplv-k3u1fbpfcp-zoom-1.image)

    > 配置阈值，选择SSL证书指标对象，配置告警表达式-当指标`expired`为`true`触发，即`equals(expired,"true")` , 设置告警级别通知模板信息等。

    ![HertzBeat](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/83d17b381d994f26a6240e01915b2001~tplv-k3u1fbpfcp-zoom-1.image)

    > 关联阈值与监控, 在阈值列表设置此阈值应用于哪些监控。

    ![HertzBeat](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/9b9063d7bcf9454387be0491fc382bd1~tplv-k3u1fbpfcp-zoom-1.image)

5. 设置阈值(证书过期前一周触发)

    > 同理如上，新增配置阈值，配置告警表达式-当指标有效期时间戳 `end_timestamp`，`now()`函数为当前时间戳，若配置提前一周触发告警即：`end_timestamp <= (now()  + 604800000)` , 其中 `604800000` 为7天总时间差毫秒值。

    ![HertzBeat](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/0d6f837f57c247e09f668f60eff4a0ff~tplv-k3u1fbpfcp-zoom-1.image)

    > 最终可以在告警中心看到已触发的告警。

    ![HertzBeat](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/5a61b23127524976b2c209ce0ca6a339~tplv-k3u1fbpfcp-zoom-1.image)

6. 告警通知(通过钉钉微信飞书等及时通知)

    > 监控系统 -> 告警通知 -> 新增接收人

    ![HertzBeat](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/7f36956060ef410a82bbecafcbb2957f~tplv-k3u1fbpfcp-zoom-1.image)

    钉钉微信飞书等token配置可以参考帮助文档

    <https://hertzbeat.com/docs/help/alert_dingtalk>  
    <https://tancloud.cn/docs/help/alert_dingtalk>

    > 告警通知 -> 新增告警通知策略 -> 将刚才配置的接收人启用通知

    ![HertzBeat](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/d976343e81f843138344a039f3aff8a3~tplv-k3u1fbpfcp-zoom-1.image)

7. OK 当阈值触发后我们就可以收到对应告警消息啦，如果没有配通知，也可以在告警中心查看告警信息。

----  

#### 完

监控SSL证书的实践就到这里，当然对hertzbeat来说这个功能只是冰山一角，如果您觉得hertzbeat这个开源项目不错的话欢迎给我们在GitHub Gitee star哦，灰常感谢。感谢老铁们的支持。笔芯！

**github: <https://github.com/apache/hertzbeat>**

**gitee: <https://gitee.com/hertzbeat/hertzbeat>**
