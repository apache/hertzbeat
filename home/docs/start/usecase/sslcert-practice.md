---
id: ssl-cert-practice  
title: SSL Certificate Monitoring Practice      
sidebar_label: SSL Certificate Monitoring Practice
---

:::tip
Most websites now support HTTPS by default. The certificate we apply for is usually 3 months or 1 year. It is easy to expire the SSL certificate over time, but we did not find it the first time, or did not update the certificate in time before it expired.
:::

This article introduces how to use the hertzbeat monitoring tool to detect the validity period of our website's SSL certificate, and send us a warning message when the certificate expires or a few days before the certificate expires.

## What is HertzBeat

Apache HertzBeat (incubating) is a real-time monitoring tool with powerful custom monitoring capabilities without Agent. Website monitoring, PING connectivity, port availability, database, operating system, middleware, API monitoring, threshold alarms, alarm notification (email, WeChat, Ding Ding Feishu).

github: <https://github.com/apache/hertzbeat>

## Install HertzBeat

1. The `docker` environment can be installed with just one command

    `docker run -d -p 1157:1157 -p 1158:1158 --name hertzbeat apache/hertzbeat`

2. After the installation is successful, the browser can access `localhost:1157` to start, the default account password is `admin/hertzbeat`

:::note
The production environment recommends a complete deployment method, refer <https://hertzbeat.apache.org/docs/start/docker-compose-deploy>
:::

## Monitoring SSL Certificates

1. Click Add SSL Certificate Monitor

    > HertzBeat Page -> Monitors Menu -> New Monitor -> Service Monitor -> Add SSL Certificate

    ![HertzBeat](/img/docs/start/ssl_1.png)

2. Configure the monitoring website

    > Here we take the example of monitoring Baidu website, configure monitoring host domain name, name, collection interval, etc.  
    > Click OK Note

    ![HertzBeat](/img/docs/start/ssl_2.png)

3. View the detection index data

    > In the monitoring list, you can view the monitoring status, and in the monitoring details, you can view the metric data chart, etc.

    ![HertzBeat](/img/docs/start/ssl_3.png)

    ![HertzBeat](/img/docs/start/ssl_4.png)

4. Set the threshold (triggered when the certificate expires)

    > HertzBeat Page -> Alerting -> Threshold -> New Threshold -> ReadTime Threshold Rule  
    > Configure the threshold, select the SSL certificate metric object, configure the alarm expression-triggered when the metric `expired` is `true`, that is, `equals(expired,"true")`, set the alarm level notification template information, etc.

    ![HertzBeat](/img/docs/start/ssl_5.png)

    > Threshold rule has others function you can try eg: associating thresholds with monitoring, trigger times so on.

5. Set the threshold (triggered one week before the certificate expires)

    > In the same way, switch coding threshold, add a new configuration threshold and configure an alarm expression - when the metric expires timestamp `end_timestamp`, the `now()` function is the current timestamp, if the configuration triggers an alarm one week in advance: `end_timestamp <= (now() + 604800000)` , where `604800000` is the 7-day total time difference in milliseconds.

    ![HertzBeat](/img/docs/start/ssl_6.png)

    > Finally, you can see the triggered alarm in the alarm center.

    ![HertzBeat](/img/docs/start/ssl_7.png)

6. Alarm notification (in time notification via Dingding WeChat Feishu, etc.)

    > HertzBeat Page -> Notification -> Notice Receiver -> New Receiver -> Config the Feishu Receiver

    ![HertzBeat](/img/docs/start/notice_receiver_1.png)

    For token configuration such as Feishu, please refer to the help document

    <https://hertzbeat.apache.org/docs/help/alert_feishu>

    > Notification -> Notice Policy -> New Notice Policy -> Enable Notification for the Recipient Just Configured

    ![HertzBeat](/img/docs/start/notice_policy_1.png)

7. OK When the threshold is triggered, we can receive the corresponding alarm message. If there is no notification, you can also view the alarm information in the alarm center.

----

## The End

The practice of monitoring SSL certificates is here. Of course, for hertzbeat, this function is just the tip of the iceberg. If you think hertzbeat is a good open source project, please give us a Gitee star on GitHub, thank you very much. Thank you for your support. Refill!

**github: <https://github.com/apache/hertzbeat>**
