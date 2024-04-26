---
id: guide  
title: Help Center      
sidebar_label: Help Center
---

> Hertzbeat - An open source, real-time monitoring tool with custom-monitor and agentLess.  
> Help documents and auxiliary information during use 

## 🔬 Monitoring services

> Regularly collect and monitor the performance Metrics exposed by end-to-end services, provide visual interfaces, and process data for alarm and other service scheduling.      
> Planned monitoring type：application service, database, operating system, cloud native, open source middleware.

### Application service monitoring 

&emsp;&#x1F449;&emsp;[Website monitoring](website) <br /> 
&emsp;&#x1F449;&emsp;[HTTP API](api) <br /> 
&emsp;&#x1F449;&emsp;[PING Connectivity](ping) <br /> 
&emsp;&#x1F449;&emsp;[Port availability](port) <br /> 
&emsp;&#x1F449;&emsp;[Full site monitoring](fullsite) <br />
&emsp;&#x1F449;&emsp;[SSL Cert monitoring](ssl_cert) <br />
&emsp;&#x1F449;&emsp;[JVM monitoring](jvm) <br />
&emsp;&#x1F449;&emsp;[SpringBoot2.0](springboot2) <br />
&emsp;&#x1F449;&emsp;[DNS monitoring](dns) <br />
&emsp;&#x1F449;&emsp;[FTP monitoring](ftp) <br />
&emsp;&#x1F449;&emsp;[Websocket monitoring](websocket) <br />

### Database monitoring  

&emsp;&#x1F449;&emsp;[MYSQL database monitoring](mysql) <br />
&emsp;&#x1F449;&emsp;[MariaDB database monitoring](mariadb) <br />
&emsp;&#x1F449;&emsp;[PostgreSQL database monitoring](postgresql) <br />
&emsp;&#x1F449;&emsp;[SqlServer database monitoring](sqlserver) <br />
&emsp;&#x1F449;&emsp;[Oracle database monitoring](oracle) <br />
&emsp;&#x1F449;&emsp;[DM database monitoring](dm) <br />
&emsp;&#x1F449;&emsp;[OpenGauss database monitoring](opengauss) <br />
&emsp;&#x1F449;&emsp;[IoTDB database monitoring](iotdb) <br />
&emsp;&#x1F449;&emsp;[TiDB database monitoring](tidb) <br />
&emsp;&#x1F449;&emsp;[MongoDB database monitoring](mongodb) <br />

### Operating system monitoring     

&emsp;&#x1F449;&emsp;[Linux operating system monitoring](linux) <br />
&emsp;&#x1F449;&emsp;[Windows operating system monitoring](windows) <br />
&emsp;&#x1F449;&emsp;[Ubuntu operating system monitoring](ubuntu) <br />
&emsp;&#x1F449;&emsp;[Centos operating system monitoring](centos) <br />

### Middleware monitoring

&emsp;&#x1F449;&emsp;[Zookeeper](zookeeper) <br />
&emsp;&#x1F449;&emsp;[Kafka](kafka) <br />
&emsp;&#x1F449;&emsp;[Tomcat](tomcat) <br />
&emsp;&#x1F449;&emsp;[ShenYu](shenyu) <br />
&emsp;&#x1F449;&emsp;[DynamicTp](dynamic_tp) <br />
&emsp;&#x1F449;&emsp;[RabbitMQ](rabbitmq) <br />
&emsp;&#x1F449;&emsp;[ActiveMQ](activemq) <br />
&emsp;&#x1F449;&emsp;[Jetty](jetty) <br />
&emsp;&#x1F449;&emsp;[Nacos](nacos) <br />

### CloudNative monitoring

&emsp;&#x1F449;&emsp;[Docker](docker) <br />
&emsp;&#x1F449;&emsp;[Kubernetes](kubernetes) <br />

### Bigdata monitoring

&emsp;&#x1F449;&emsp;[Clickhouse](clickhouse) <br />
&emsp;&#x1F449;&emsp;[ElasticSearch](elasticsearch) <br />

### Network monitoring

&emsp;&#x1F449;&emsp;[Huawei-switch](huawei_switch) <br /> 


***

## 💡 Alarm service  

> More liberal threshold alarm configuration (calculation expression), supports email, SMS, WebHook, DingDing, WeChat and FeiShu for alarm notification.
> The positioning of alarm service is to trigger the threshold accurately and timely, and the alarm notification can be reached in time.

### Alarm center  

> The triggered alarm information center provides query and filtering of alarm deletion, alarm processing, mark unprocessed, alarm level status, etc.

### Alarm configuration 

> The Metric threshold configuration provides the Metric threshold configuration in the form of expression, which can set the alarm level, trigger times, alarm notification template and whether it is enabled, correlation monitoring and other functions.

More details see&emsp;&#x1F449;&emsp;[Threshold alarm](alert_threshold) <br /> 
&emsp;&emsp;&emsp;&#x1F449;&emsp;[Threshold expression](alert_threshold_expr)   

### Alarm notification  

> After triggering the alarm information, in addition to being displayed in the alarm center list, it can also be notified to the designated recipient in a specified way (e-mail, wechat and FeiShu etc.)   
> Alarm notification provides different types of notification methods, such as email recipient, enterprise wechat robot notification, DingDing robot notification, and FeiShu robot notification.   
> After setting the receiver, you need to set the associated alarm notification strategy to configure which alarm information is sent to which receiver.   


&emsp;&#x1F449;&emsp;[Configure Email Notification](alert_email) <br />
&emsp;&#x1F449;&emsp;[Configure Discord Notification](alert_webhook) <br />
&emsp;&#x1F449;&emsp;[Configure Slack Notification](alert_webhook) <br />
&emsp;&#x1F449;&emsp;[Configure Telegram Notification](alert_webhook) <br />
&emsp;&#x1F449;&emsp;[Configure WebHook Notification](alert_webhook) <br />
&emsp;&#x1F449;&emsp;[Configure enterprise WeChat Robot Notification](alert_wework) <br />
&emsp;&#x1F449;&emsp;[Configure DingDing Robot Notification](alert_dingtalk) <br />
&emsp;&#x1F449;&emsp;[Configure FeiShu Robot Notification](alert_feishu) <br />
&emsp;&#x1F449;&emsp;[Configure Huawei Cloud SMN Notification](alert_smn) <br />
