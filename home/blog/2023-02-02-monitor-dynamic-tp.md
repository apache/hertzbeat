---
title: Monitoring Practices for DynamicTp Thread Pooling Framework with HertzBeat    
author: tom  
author_title: tom   
author_url: https://github.com/tomsun28  
author_image_url: https://avatars.githubusercontent.com/u/24788200?s=400&v=4  
tags: [opensource, practice]
---

## Monitoring practice for thread pooling framework DynamicTp using HertzBeat, 5 minutes

### Introducing DynamicTp, the thread pooling framework

> DynamicTp is a lightweight configuration-centric dynamic thread pool in Jvm with built-in monitoring and alerting capabilities, which can be customized through SPI extensions.

- Support for dynamic modification of the running thread pool parameters , real-time effective .
- Real-time monitoring of the running status of the thread pool, alarms are triggered when the alarm policy is set, and alarm information is pushed to the office platform.
- Collect thread pool metrics data regularly, and use grafana as a visual monitoring platform to monitor the overall situation.

### HertzBeat Introduction

> HertzBeat is an open source, easy-to-use and friendly real-time monitoring tool with powerful customizable monitoring capabilities.

- Support for application services , database , operating system , middleware , cloud native monitoring , threshold alarms , alarm notification (email WeChat Dingtalk SMS Slack Discord Telegram).
- Its Http, Jmx, Ssh, Snmp, Jdbc, Prometheus and other protocol specifications configurable, just configure YML can use these protocols to customize the collection of any metrics you want to collect. Would you believe that you can instantly adapt a new monitoring type such as K8s or Docker by simply configuring YML?
- HertzBeat's powerful customization, multi-type support, easy scalability, and low coupling will hopefully help developers and small to medium sized teams to quickly build their own monitoring systems.

### Monitor DynamicTp in 5 minutes at HertzBeat

#### operation, you already have a DynamicTp environment and a HertzBeat environment

- DynamicTp [Integration Access Documentation](https://dynamictp.cn/guide/use/quick-start.html)
- HertzBeat [Deployment and Installation Documentation](https://hertzbeat.apache.org/docs/start/docker-deploy)

#### i. Expose the `DynamicTp` metrics interface `/actuator/dynamic-tp` on the DynamicTp side, which will provide the metrics interface data

1. Enable the SpringBoot Actuator Endpoint to expose the `DynamicTp` metrics interface.

    ```yaml
    management:
      endpoints:
        web:
          exposure:
            include: '*'
    ```

2. Reboot and test access to the metrics interface `ip:port/actuator/dynamic-tp` to see if it responds with json data as follows.

    ```json
    [
      {
        "poolName": "commonExecutor",
        "corePoolSize": 1,
        "maximumPoolSize": 1,
        "queueType": "LinkedBlockingQueue",
        "queueCapacity": 2147483647,
        "queueSize": 0,
        "fair": false,
        "queueRemainingCapacity": 2147483647,
        "activeCount": 0,
        "taskCount": 0,
        "completedTaskCount": 0,
        "largestPoolSize": 0,
        "poolSize": 0,
        "waitTaskCount": 0,
        "rejectCount": 0,
        "rejectHandlerName": null,
        "dynamic": false,
        "runTimeoutCount": 0,
        "queueTimeoutCount": 0
      },
      {
        "maxMemory": "4 GB",
        "totalMemory": "444 MB",
        "freeMemory": "250.34 MB",
        "usableMemory": "3.81 GB"
      }
    ]
    ```

#### ii. To add DynamicTp thread pool monitoring to the HertzBeat monitoring page

1. Click Add DynamicTp Monitor

    Path: Menu -> Middleware Monitor -> DynamicTp Monitor -> Add DynamicTp Monitor

    ![HertzBeat](/img/blog/monitor-dynamic-tp-1.png)

2. Configure the parameters required for monitoring DynamicTp.

    On the monitor page, fill in DynamicTp **service IP**, **monitoring port** (default 8080), and finally click OK to add it.
    For other parameters such as **collection interval**, **timeout**, etc., you can refer to [help](https://hertzbeat.apache.org/docs/help/dynamic_tp/) <https://hertzbeat.apache.org/docs/help/dynamic_tp/>

    ![HertzBeat](/img/blog/monitor-dynamic-tp-2.png)

3. Done ✅, now we have added monitoring for DynamicTp, check the monitor list to see our additions.

    ![HertzBeat](/img/blog/monitor-dynamic-tp-1.png)

4. Click **Options**->**Monitor Details icon** in the Monitor list to view the real-time monitoring metrics of the DynamicTp thread pool.

    ![HertzBeat](/img/blog/monitor-dynamic-tp-3.png)

5. Click the **Monitoring History TAB** to view a graphical representation of the historical monitoring metrics for the DynamicTp thread pool 📈.

    ![HertzBeat](/img/blog/monitor-dynamic-tp-4.png)

    ![HertzBeat](/img/blog/monitor-dynamic-tp-5.png)

**DONE! With the above steps, it's really just two steps**

- **The first step is to expose the DynamicTp `metrics` endpoint `/actuator/dynamic-tp`**.
- **The second step is to configure the IP ports on the HertzBeat monitoring page to add the monitoring**

:::tip
With the above two steps we have finished monitoring DynamicTp, and we can view the monitoring details and metrics information in HertzBeat at any time to observe its service status.
Of course, just watching is not perfect, monitoring is often accompanied by alarm thresholds, when DynamicTp's thread pool metrics exceed our expectations or abnormalities, we can promptly notify the person in charge of our counterparts, the person in charge of the notification received to deal with the problem, so that is a complete monitoring and alerting process.
:::

**Next, we will demonstrate step-by-step how to configure the threshold alarm notification in HertzBeat system, so that when the DynamicTp thread pool metrics are abnormal, we will be notified in a timely manner** **This is a complete monitoring and alerting process.

#### iii. Adding Threshold Alerts for DynamicTp Thread Pool Metrics in HertzBeat System

1. Configure an alarm threshold for an important metric.

    Path: Menu -> Alert Thresholds -> Add Thresholds

   - DynamicTp monitors some thread pool related metrics, for example, we set the threshold for the `run_timeout_count` `thread_pool_running` -> `run_timeout_count` metric, which will raise an alarm when the thread_timeout_count is greater than one.
   - Here we configure an alert to be issued when `thread_pool_running` has a `run_timeout_count>1`, with an alert level of **Serious Alert**, which is triggered three times, as shown in the following figure.

    ![HertzBeat](/img/blog/monitor-dynamic-tp-6.png)

2. Add message notification recipients

    > Configure recipients to let alert message know who to send to and in what way.

    Path: Menu -> Alert Notification -> Alert Recipient -> Add Recipient.

    Message notification methods support **Email, Dingtalk, WeChat, Flybook, WebHook, SMS**, etc. We take the commonly used Dingtalk as an example.

   - Refer to this [help document](https://hertzbeat.apache.org/docs/help/alert_dingtalk) <https://hertzbeat.apache.org/docs/help/alert_dingtalk> Configure the bot on Dingtalk side, set the security customization keyword `HertzBeat`, get the corresponding `access_token` value.
   - Configure the recipient parameters in HertzBeat as follows.

    [Alert Notification] -> [Add Recipient] -> [Choose Dingtalk bot notification method] -> [Set Dingtalk bot ACCESS_TOKEN] -> [OK]

    ![HertzBeat](/img/blog/alert-notice-1.png)

3. Configure the associated alert notification policy ⚠️ [Add Notification Policy] -> [Associate the recipient you just set] -> [OK] !

    > Configure the alert notification policy to bind alert messages to recipients so that you can decide which alerts go to which person.

    ![HertzBeat](/img/blog/alert-notice-2.png)

### Over and out, now wait for the alert message to come through. Ding, ding, ding, ding

```text
[HertzBeat alert notification]
Alert target object : dynamic_tp.thread_pool_running.run_timeout_count
Task ID : 205540620349493
Task Name : dynamic_tp_localhost
Alarm Level : Critical Alarm
Alarm Trigger Time : 2023-02-02 22:17:06
Details : DynamicTp has run timeout thread, count is 2
```

## Summary

:::tip
This practical article takes us to experience how to use HertzBeat to monitor DynamicTp thread pool metrics data, and we can find that HertzBeat with ``monitoring-alerting-notification`` is much more convenient to operate and use, and you only need to point and click on a page to include DynamicTp thread pool into the monitoring and alert notification, and you don't need to deploy multiple components to write YML configuration files anymore. There is no need to deploy multiple components and write YML configuration files.  
:::

DynamicTp Github: <https://github.com/dromara/dynamic-tp>
HertzBeat Github: <https://github.com/apache/hertzbeat>

**Welcome to learn how to use Star Support!**

Experience heartbeat with a single docker command:
`docker run -d -p 1157:1157 --name hertzbeat apache/hertzbeat`
