---
id: ssl-cert-practice  
title: SSL Certificate Monitor Practice      
sidebar_label: Practice Example
---

Most websites now support HTTPS by default. The certificate we apply for is usually 3 months or 1 year. It is easy to expire the SSL certificate over time, but we did not find it the first time, or did not update the certificate in time before it expired.

This article introduces how to use the hertzbeat monitoring tool to detect the validity period of our website's SSL certificate, and send us a warning message when the certificate expires or a few days before the certificate expires.

#### What is HertzBeat

HertzBeat is a real-time monitoring tool with powerful custom monitoring capabilities without Agent. Website monitoring, PING connectivity, port availability, database, operating system, middleware, API monitoring, threshold alarms, alarm notification (email, WeChat, Ding Ding Feishu).

**Official website: https://hertzbeat.com | https://tancloud.cn**

github: https://github.com/dromara/hertzbeat
gitee: https://gitee.com/dromara/hertzbeat

#### Install HertzBeat

1. If you don't want to install, you can use the cloud service directly [TanCloud exploration cloud console.tancloud.cn](https://console.tancloud.cn)

2. The `docker` environment can be installed with just one command

`docker run -d -p 1157:1157 --name hertzbeat tancloud/hertzbeat`

3. After the installation is successful, the browser can access `localhost:1157` to start, the default account password is `admin/hertzbeat`

#### Monitoring SSL certificates

1. Click Add SSL Certificate Monitor

> System Page -> Monitor Menu -> SSL Certificate -> Add SSL Certificate


![](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/bd53f343a5b54feab62e71458d076441~tplv-k3u1fbpfcp-zoom-1.image)

2. Configure the monitoring website

> Here we take the example of monitoring Baidu website, configure monitoring host domain name, name, collection interval, etc.
> Click OK Note ⚠️Before adding, it will test the connectivity of the website by default, and the connection will be successful before adding. Of course, you can also gray out the **Test or not** button.

![](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/ad1154670648413bb82c8bdeb5b13609~tplv-k3u1fbpfcp-zoom-1.image)

3. View the detection index data

> In the monitoring list, you can view the monitoring status, and in the monitoring details, you can view the metric data chart, etc.


![](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/f874b45e909c4bb0acdd28b3fb034a61~tplv-k3u1fbpfcp-zoom-1.image)


![](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/ef5d7443f8c04818ae5aa28d421203be~tplv-k3u1fbpfcp-zoom-1.image)



4. Set the threshold (triggered when the certificate expires)

> System Page -> Alarms -> Alarm Thresholds -> New Thresholds


![](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/8d6205172d43463aa34e534477f132f1~tplv-k3u1fbpfcp-zoom-1.image)

> Configure the threshold, select the SSL certificate metric object, configure the alarm expression-triggered when the metric `expired` is `true`, that is, `equals(expired,"true")`, set the alarm level notification template information, etc.


![](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/83d17b381d994f26a6240e01915b2001~tplv-k3u1fbpfcp-zoom-1.image)

> Associating thresholds with monitoring, in the threshold list, set which monitoring this threshold applies to.


![](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/9b9063d7bcf9454387be0491fc382bd1~tplv-k3u1fbpfcp-zoom-1.image)




5. Set the threshold (triggered one week before the certificate expires)

> In the same way, add a new configuration threshold and configure an alarm expression - when the metric expires timestamp `end_timestamp`, the `now()` function is the current timestamp, if the configuration triggers an alarm one week in advance: `end_timestamp <= (now( ) + 604800000)` , where `604800000` is the 7-day total time difference in milliseconds.


![](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/0d6f837f57c247e09f668f60eff4a0ff~tplv-k3u1fbpfcp-zoom-1.image)

> Finally, you can see the triggered alarm in the alarm center.


![](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/5a61b23127524976b2c209ce0ca6a339~tplv-k3u1fbpfcp-zoom-1.image)


6. Alarm notification (in time notification via Dingding WeChat Feishu, etc.)

> Monitoring Tool -> Alarm Notification -> New Receiver


![](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/7f36956060ef410a82bbecafcbb2957f~tplv-k3u1fbpfcp-zoom-1.image)

For token configuration such as Dingding WeChat Feishu, please refer to the help document

https://hertzbeat.com/docs/help/alert_dingtalk
https://tancloud.cn/docs/help/alert_dingtalk

> Alarm Notification -> New Alarm Notification Policy -> Enable Notification for the Recipient Just Configured


![](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/d976343e81f843138344a039f3aff8a3~tplv-k3u1fbpfcp-zoom-1.image)

7. OK When the threshold is triggered, we can receive the corresponding alarm message. If there is no notification, you can also view the alarm information in the alarm center.

----

#### Finish!

The practice of monitoring SSL certificates is here. Of course, for hertzbeat, this function is just the tip of the iceberg. If you think hertzbeat is a good open source project, please give us a Gitee star on GitHub, thank you very much. Thank you for your support. Refill!

**github: https://github.com/dromara/hertzbeat**

**gitee: https://gitee.com/dromara/hertzbeat**
