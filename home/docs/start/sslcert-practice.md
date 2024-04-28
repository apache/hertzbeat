---
id: ssl-cert-practice  
title: SSL Certificate Monitor Practice      
sidebar_label: Practice Example
---

Most websites now support HTTPS by default. The certificate we apply for is usually 3 months or 1 year. It is easy to expire the SSL certificate over time, but we did not find it the first time, or did not update the certificate in time before it expired.

This article introduces how to use the hertzbeat monitoring tool to detect the validity period of our website's SSL certificate, and send us a warning message when the certificate expires or a few days before the certificate expires.

#### What is HertzBeat

Apache HertzBeat(Incubating) is a real-time monitoring tool with powerful custom monitoring capabilities without Agent. Website monitoring, PING connectivity, port availability, database, operating system, middleware, API monitoring, threshold alarms, alarm notification (email, WeChat, Ding Ding Feishu).


github: https://github.com/apache/hertzbeat

#### Install HertzBeat

1. The `docker` environment can be installed with just one command

`docker run -d -p 1157:1157 --name hertzbeat tancloud/hertzbeat`

2. After the installation is successful, the browser can access `localhost:1157` to start, the default account password is `admin/hertzbeat`

#### Monitoring SSL certificates

1. Click Add SSL Certificate Monitor

> System Page -> Monitor Menu -> SSL Certificate -> Add SSL Certificate


![](/img/docs/start/ssl_1.png)

2. Configure the monitoring website

> Here we take the example of monitoring Baidu website, configure monitoring host domain name, name, collection interval, etc.
> Click OK Note ⚠️Before adding, it will test the connectivity of the website by default, and the connection will be successful before adding. Of course, you can also gray out the **Test or not** button.

![](/img/docs/start/ssl_2.png)

3. View the detection index data

> In the monitoring list, you can view the monitoring status, and in the monitoring details, you can view the metric data chart, etc.


![](/img/docs/start/ssl_3.png)


![](/img/docs/start/ssl_11.png)

4. Set the threshold (triggered when the certificate expires)

> System Page -> Alarms -> Alarm Thresholds -> New Thresholds


![](/img/docs/start/ssl_4.png)

> Configure the threshold, select the SSL certificate metric object, configure the alarm expression-triggered when the metric `expired` is `true`, that is, `equals(expired,"true")`, set the alarm level notification template information, etc.


![](/img/docs/start/ssl_5.png)

> Associating thresholds with monitoring, in the threshold list, set which monitoring this threshold applies to.


![](/img/docs/start/ssl_6.png)


5. Set the threshold (triggered one week before the certificate expires)

> In the same way, add a new configuration threshold and configure an alarm expression - when the metric expires timestamp `end_timestamp`, the `now()` function is the current timestamp, if the configuration triggers an alarm one week in advance: `end_timestamp <= (now( ) + 604800000)` , where `604800000` is the 7-day total time difference in milliseconds.


![](/img/docs/start/ssl_7.png)

> Finally, you can see the triggered alarm in the alarm center.


![](/img/docs/start/ssl_8.png)


6. Alarm notification (in time notification via Dingding WeChat Feishu, etc.)

> Monitoring Tool -> Alarm Notification -> New Receiver


![](/img/docs/start/ssl_10.png)

For token configuration such as Dingding WeChat Feishu, please refer to the help document

https://hertzbeat.apache.org/docs/help/alert_dingtalk

> Alarm Notification -> New Alarm Notification Policy -> Enable Notification for the Recipient Just Configured


![](/img/docs/start/ssl_11.png)

7. OK When the threshold is triggered, we can receive the corresponding alarm message. If there is no notification, you can also view the alarm information in the alarm center.

----

#### Finish!

The practice of monitoring SSL certificates is here. Of course, for hertzbeat, this function is just the tip of the iceberg. If you think hertzbeat is a good open source project, please give us a Gitee star on GitHub, thank you very much. Thank you for your support. Refill!

**github: https://github.com/apache/hertzbeat**

**gitee: https://gitee.com/hertzbeat/hertzbeat**
