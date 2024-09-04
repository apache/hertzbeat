---
title: Best Practices for SSL Certificate Expiration Monitoring
author: tom  
author_title: tom   
author_url: https://github.com/tomsun28  
author_image_url: https://avatars.githubusercontent.com/u/24788200?s=400&v=4  
tags: [opensource, practice]
---

First of all, I would like to wish all the students who see it a happy mid-autumn festival, good health, and try to get rich on the basis of good health.

Into the main topic, most of the sites now support HTTPS by default, we apply for the certificate is generally 3 months or 1 year, it is easy with the passage of time SSL certificate expired we did not find the first time, or in the expiration of the certificate did not update the certificate in a timely manner.

Today's article describes how to use hertzbeat monitoring system to detect the validity of our website's SSL certificate, when the certificate expires or a few days before the expiration of the certificate, send us an alert message.

#### What is HertzBeat?

HertzBeat is a real-time monitoring tool with powerful customizable monitoring capabilities without the need for an agent. Website monitoring, PING connectivity, port availability, database, OS, middleware, API monitoring, threshold alerts, alert notifications (email weChat pinning flybook).

**Official website: <https://hertzbeat.com> | <https://tancloud.cn>**

github: <https://github.com/apache/hertzbeat>
gitee: <https://gitee.com/hertzbeat/hertzbeat>

#### Install HertzBeat

1. If you don't want to install it, you can directly use the cloud service [TanCloud console.tancloud.cn](https://console.tancloud.cn)

2. The `docker` environment can be installed with a single command

    `docker run -d -p 1157:1157 --name hertzbeat apache/hertzbeat`

3. Installation success browser visit `localhost:1157` to start, the default account password `admin/hertzbeat

#### Monitoring SSL Certificates

1. Click Add SSL Certificate Monitor

   > System Page -> Monitor Menu -> SSL Certificates -> New SSL Certificate  

   ![HertzBeat](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/bd53f343a5b54feab62e71458d076441~tplv-k3u1fbpfcp-zoom-1.image)

2. Configure monitoring website

   > Here is an example to monitor Baidu website, configure the host domain name, name, collection interval, etc. > Click OK.
   > Click OK. Note that ⚠️ will test the connectivity of the website before adding it by default, and it will add it only if the connection is successful, of course, you can also gray out the **Whether to test** button.

   ![HertzBeat](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/ad1154670648413bb82c8bdeb5b13609~tplv-k3u1fbpfcp-zoom-1.image)

3. Viewing Test Indicator Data

   > You can view the task status in the monitor list, and go into the monitor details to view the metrics data graphs etc.

   ![HertzBeat](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/f874b45e909c4bb0acdd28b3fb034a61~tplv-k3u1fbpfcp-zoom-1.image)

   ![HertzBeat](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/ef5d7443f8c04818ae5aa28d421203be~tplv-k3u1fbpfcp-zoom-1.image)

4. Set the threshold (triggered when the certificate expires)

   > System Page -> Alarms -> Alarm Thresholds -> Add Thresholds

   ![HertzBeat](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/8d6205172d43463aa34e534477f132f1~tplv-k3u1fbpfcp-zoom-1.image)

   > Configure thresholds, select SSL certificate indicator object, configure alert expression - triggered when indicator `expired` is `true`, i.e. `equals(expired, "true")` , set alert level notification template message etc.

   ![HertzBeat](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/83d17b381d994f26a6240e01915b2001~tplv-k3u1fbpfcp-zoom-1.image)

   > Associate thresholds with monitors, set which monitors this threshold should be applied to in the threshold list.

   ![HertzBeat](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/9b9063d7bcf9454387be0491fc382bd1~tplv-k3u1fbpfcp-zoom-1.image)

5. set the threshold (triggered one week before certificate expiration)

   > Same as above, add a new configuration threshold, configure the alert expression - when the indicator validity timestamp `end_timestamp`, `now()` function for the current timestamp, if you configure to trigger the alert one week in advance i.e.: `end_timestamp <= (now() + 604800000)` , where `604800000` is the total time difference of 7 days. milliseconds.

   ![HertzBeat](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/0d6f837f57c247e09f668f60eff4a0ff~tplv-k3u1fbpfcp-zoom-1.image)

   > Eventually you can see the triggered alarms in the alarm center.

   ![HertzBeat](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/5a61b23127524976b2c209ce0ca6a339~tplv-k3u1fbpfcp-zoom-1.image)

6. Alarm notification (timely notification via NailWeChatFlysheet, etc.)

   > Monitoring System -> Alert Notification -> Add Recipients

      ![HertzBeat](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/7f36956060ef410a82bbecafcbb2957f~tplv-k3u1fbpfcp-zoom-1.image)

      You can refer to the help file for the token configuration of Nail WeChat Flying Book, etc.

      <https://hertzbeat.com/docs/help/alert_dingtalk>
   <https://tancloud.cn/docs/help/alert_dingtalk>

   > Alert Notification -> Add new alert notification policy -> Enable notification for the recipients you just configured

   ![HertzBeat](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/d976343e81f843138344a039f3aff8a3~tplv-k3u1fbpfcp-zoom-1.image)

7. OK When the threshold is triggered, we can receive the corresponding alarm message, if there is no notification, you can also view the alarm information in the alarm center.

----  

#### End

The practice of monitoring SSL certificates here, of course, for hertzbeat this function is just the tip of the iceberg, if you think hertzbeat this open source project is good if you welcome to give us in the GitHub Gitee star oh, thank you very much. Thank you for your support. The author!

**github: <https://github.com/apache/hertzbeat>**

**gitee: <https://gitee.com/hertzbeat/hertzbeat>**
