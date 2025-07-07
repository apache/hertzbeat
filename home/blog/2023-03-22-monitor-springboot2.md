---
title: Monitoring SpringBoot2 Metrics with HertzBeat in 5 minutes
author: tom  
author_title: tom   
author_url: https://github.com/tomsun28  
author_image_url: https://avatars.githubusercontent.com/u/24788200?s=400&v=4  
tags: [opensource, practice]
keywords: [opensource monitoring, SpringBoot monitoring, alert]
---

## Use the open source real-time monitoring tool HertzBeat to monitor and alarm the SpringBoot2 application, and it will be done in 5 minutes

### HertzBeat Intro

> HertzBeat is an open source, real-time monitoring tool with custom-monitor and agentLess. | 易用友好的开源实时监控告警工具，无需Agent，强大自定义监控能力.
>
> **Monitor+Alerter+Notify** all in one. Support monitoring web service, database, os, middleware, cloud-native, network and more.
> More flexible threshold rule(calculation expression), timely notification delivery by `Discord` `Slack` `Telegram` `Email` `DingDing` `WeChat` `FeiShu` `Webhook` `SMS`.
>
> We make protocols such as `Http, Jmx, Ssh, Snmp, Jdbc, Prometheus` configurable, and you only need to configure `YML` online to collect any metrics you want.
> Do you believe that you can immediately adapt a new monitoring type such as K8s or Docker just by configuring online?
>
> `HertzBeat`'s powerful custom-define, multi-type support, easy expansion, low coupling, hope to help developers and micro teams to quickly build their own monitoring system.

Github: <https://github.com/apache/hertzbeat>

### Monitoring SpringBoot2 Metrics with HertzBeat in 5 minutes

#### Prerequisite, you already have SpringBoot2 application environment and HertzBeat environment

- HertzBeat [Installation and deployment documentation](https://hertzbeat.apache.org/docs/start/docker-deploy)

#### 1. The `actuator` metric endpoint is exposed on the SpringBoot2 application side, which will provide metrics endpoints data

1. Open SpringBoot Actuator Endpoint to expose `metrics health env` metric interface

    ```yaml
    management:
       endpoints:
         web:
           exposure:
             include:
               - 'metrics'
               - 'health'
               - 'env'
         enabled-by-default: on
    ```

2. After restarting, test whether the access metric interface `ip:port/actuator` has response json data as follows:

    ```json
    {
       "_links": {
         "self": {
           "href": "http://localhost:1157/actuator",
           "templated": false
         },
         "health-path": {
           "href": "http://localhost:1157/actuator/health/{*path}",
           "templated": true
         },
         "health": {
           "href": "http://localhost:1157/actuator/health",
           "templated": false
         },
         "env": {
           "href": "http://localhost:1157/actuator/env",
           "templated": false
         },
         "env-toMatch": {
           "href": "http://localhost:1157/actuator/env/{toMatch}",
           "templated": true
         },
         "metrics-requiredMetricName": {
           "href": "http://localhost:1157/actuator/metrics/{requiredMetricName}",
           "templated": true
         },
         "metrics": {
           "href": "http://localhost:1157/actuator/metrics",
           "templated": false
         }
       }
    }
    ```

#### Add SpringBoot2 application monitoring in the HertzBeat monitoring ui

1. Click to add SpringBoot2 monitoring

    Path: Menu -> Application Service Monitoring -> SpringBoot2 -> Add SpringBoot2 Monitoring

    ![HertzBeat](/img/blog/monitor-springboot2-1.png)

2. Configure the parameters required for new monitoring SpringBoot2

    Fill in the SpringBoot2 application **peer IP**, **service port** (default 8080), **account password, etc.** on the monitoring page, and finally click OK to add.
    For other parameters such as **collection interval**, **timeout period**, etc., please refer to the help document <https://hertzbeat.apache.org/docs/help/>

    ![HertzBeat](/img/blog/monitor-springboot2-2.png)

3. Complete ✅, now we have added the monitoring of the SpringBoot2 application, check the monitoring list to see our additions.

    ![HertzBeat](/img/blog/monitor-springboot2-3.png)

4. Click **Operation**->**Monitoring Details Icon** of the monitoring list item to browse the real-time monitoring metric data of the SpringBoot2 application.

    ![HertzBeat](/img/blog/monitor-springboot2-4.png)

5. Click **Monitoring History Details TAB** to browse the historical monitoring metric data chart of the SpringBoot2 application📈.

    ![HertzBeat](/img/blog/monitor-springboot2-5.png)

**DONE! Done! It doesn't require us to deploy agents or various cumbersome operations, isn't it very simple**

- **Just one step to configure the IP port on the HertzBeat monitoring page and add SpringBoot2 application monitoring**

:::tip
Through the above, we have completed the monitoring of the SpringBoot2 application. We can check the status and availability of various metrics of the SpringBoot2 application at any time in HertzBeat.  
Of course, it is impossible to manually check the metrics in real time. Monitoring is often accompanied by alarm thresholds. When the performance metrics of the SpringBoot2 application exceed our threshold or the SpringBoot2 application itself is abnormal, we can promptly notify our corresponding person in charge. The person in charge receives the notification and handles it. , this is a complete monitoring and alarm process.
:::

**Next, we will demonstrate step by step how to configure the threshold alarm notification in the HertzBeat system. When the metrics of the SpringBoot2 application are abnormal, we will be notified in time**

#### 3. Add SpringBoot2 application metric threshold alarm in HertzBeat system

1. Configure an alarm threshold for an important metric

    Path: Menu -> Threshold Rules -> Add Threshold

   - Select the configured metric object. SpringBoot2 application monitoring mainly focuses on stack memory threads and other related metrics. For example, we set the threshold for the metric `threads` -> `threads`. When the number of threads in the `runnable` state is greater than At 300 an alert is issued.
   - Here we configure to send an alarm when `size`, `state` of `equals(state, "runnable"") && size>300` of this metric, the alarm level is **warning alarm**, which will be triggered three times, specifically As shown below.

    ![HertzBeat](/img/blog/monitor-springboot2-6.png)

    ![HertzBeat](/img/blog/monitor-springboot2-7.png)

2. Add message notification recipients

    > Configure the receiver to let the alarm message know who to send and how to send it.

    Path: Menu -> Alarm Notification -> Alarm Recipient -> Add New Recipient

    Message notification methods support **email, DingTalk, WeChat Work, Feishu, WebHook, SMS**, etc. Here we take the commonly used DingTalk as an example.

    - Refer to this [Help Documentation](https://hertzbeat.apache.org/docs/help/alert_dingtalk) <https://hertzbeat.apache.org/docs/help/alert_dingtalk> to configure the robot on DingTalk and set the security custom keyword `HertzBeat`, get the corresponding `access_token` value.
    - Configure the receiver parameters in HertzBeat as follows.

    【Alarm Notification】->【New Recipient】->【Select DingTalk Robot Notification Method】->【Set DingTalk Robot ACCESS_TOKEN】->【OK】

    ![HertzBeat](/img/blog/alert-notice-1.png)

3. Configure the associated alarm notification strategy ⚠️ [Add notification strategy] -> [Associate the recipient just set] -> [OK]

    > Configure the alarm notification policy to bind the alarm message with the receiver, so that you can decide which alarms to send to whom.

    ![HertzBeat](/img/blog/alert-notice-2.png)

### Finished, now wait for the warning message to come. ding ding ding ding

```text
[HertzBeat warning notification]
Alarm target object: springboot2.threads.size
Affiliated monitoring ID: 483783444839322
Belonging monitoring name: SPRINGBOOT2_localhost
Alarm level: warning alarm
Alarm trigger time: 2023-03-22 21:13:44
Content details: The springboot2 service's runnable state threads num is over 300, now is 444.
```

## Summary

:::tip
This practical article took us to experience how to use the open source real-time monitoring tool HertzBeat to monitor SpringBoot2 application metric data. We can find that HertzBeat, which integrates `monitoring-alarm-notification`, is more convenient in operation and use, just click a little on the page The SpringBoot2 application can be included in the monitoring and alarm notification, and the tedious operations of deploying multiple components and writing configuration files are no longer needed.
:::

> Only one docker command is needed to install and experience heartbeat:

`docker run -d -p 1157:1157 --name hertzbeat apache/hertzbeat`

## More powerful

> Through the simple steps above, we have realized the monitoring of SpringBoot2, but the built-in metrics in it do not meet the needs. Can we customize and monitor more metrics of SpringBoot2? The answer is of course yes, through **Monitoring Definition**->**SpringBoot2** on the page, you can customize and modify the performance metrics you want to monitor by editing the following YML configuration file at any time.

![HertzBeat](/img/blog/monitor-springboot2-8.png)

## What is HertzBeat?

> [HertzBeat](https://github.com/apache/hertzbeat) is an open source, real-time monitoring tool with custom-monitor and agentless.
> **Monitor+Alerter+Notify** all in one. Support monitoring web service, database, os, middleware, cloud-native, network and more.
> More flexible threshold rule(calculation expression), timely notification delivery by `Discord` `Slack` `Telegram` `Email` `DingDing` `WeChat` `FeiShu` `Webhook` `SMS`.
>
> We make protocols such as `Http, Jmx, Ssh, Snmp, Jdbc, Prometheus` configurable, and you only need to configure `YML` online to collect any metrics you want.
> Do you believe that you can immediately adapt a new monitoring type such as K8s or Docker just by configuring online?
>
> `HertzBeat`'s powerful custom-define, multi-type support, easy expansion, low coupling, hope to help developers and micro teams to quickly build their own monitoring system.

----

## ⛄ Supported

- Site Monitor, Port Availability, Http Api, Ping Connectivity, Jvm, SiteMap Full Site, Ssl Certificate, SpringBoot, FTP Server
- Mysql, PostgreSQL, MariaDB, Redis, ElasticSearch, SqlServer, Oracle, MongoDB, Damon, OpenGauss, ClickHouse, IoTDB, Redis Cluster
- Linux, Ubuntu, CentOS, Windows
- Tomcat, Nacos, Zookeeper, RabbitMQ, Flink, Kafka, ShenYu, DynamicTp, Jetty, ActiveMQ
- Kubernetes, Docker
- Huawei Switch, HPE Switch, TP-LINK Switch, Cisco Switch
- and more for your custom monitoring.
- Notifications support `Discord` `Slack` `Telegram` `Mail` `Pinning` `WeChat` `FlyBook` `SMS` `Webhook`.

----

**Github: <https://github.com/apache/hertzbeat>**
**Gitee: <https://gitee.com/hertzbeat/hertzbeat>**
