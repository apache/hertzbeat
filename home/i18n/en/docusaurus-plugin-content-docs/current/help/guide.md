---
id: guide  
title: Help center      
sidebar_label: Help center
---

> TanCloud - Friendly cloud monitoring system    
> Help documents and auxiliary information during use 

## 🔬 Monitoring services

> Regularly collect and monitor the performance indicators exposed by end-to-end services, provide visual interfaces, and process data for alarm and other service scheduling.      
> Planned monitoring type：application service, database, operating system, cloud native, open source middleware.

### Application service monitoring 

[Website monitoring](website)  &emsp;&emsp;&emsp;&emsp;  [HTTP API](api) &emsp;&emsp;&emsp;&emsp; [PING Connectivity](ping) &emsp;&emsp;&emsp;&emsp; [Port availability](port) &emsp;&emsp;&emsp;&emsp; [Full site monitoring](fullsite)

### Database monitoring  

[MYSQL database monitoring](mysql) &emsp;&emsp;&emsp;&emsp; [MariaDB database monitoring](mariadb)  &emsp;&emsp;&emsp;&emsp; [PostgreSQL database monitoring](postgresql)  &emsp;&emsp;&emsp;&emsp; [SqlServer database monitoring](sqlserver) &emsp;&emsp;&emsp;&emsp; [Oracle database monitoring](oracle)         

### Operating system monitoring     

[Linux operating system monitoring](linux) &emsp;&emsp;&emsp;&emsp; [Windows operating system monitoring](windows) &emsp;&emsp;&emsp;&emsp; [Ubuntu operating system monitoring](ubuntu) &emsp;&emsp;&emsp;&emsp; [Centos operating system monitoring](centos) &emsp;&emsp;&emsp;&emsp;

## 💡 Alarm service  

> More liberal threshold alarm configuration (calculation expression), supports email, SMS, WebHook, DingDing, WeChat and FeiShu for alarm notification.
> The positioning of alarm service is to trigger the threshold accurately and timely, and the alarm notification can be reached in time.

### Alarm center  

> The triggered alarm information center provides query and filtering of alarm deletion, alarm processing, mark unprocessed, alarm level status, etc.

### Alarm configuration 

> The indicator threshold configuration provides the indicator threshold configuration in the form of expression, which can set the alarm level, trigger times, alarm notification template and whether it is enabled, correlation monitoring and other functions.

More details see [threshold alarm](alert_threshold) &emsp;&emsp;&emsp;&emsp; [Threshold expression](alert_threshold_expr)   

### Alarm notification  

> After triggering the alarm information, in addition to being displayed in the alarm center list, it can also be notified to the designated recipient in a specified way (e-mail, wechat and FeiShu etc.)   
> Alarm notification provides different types of notification methods, such as email recipient, enterprise wechat robot notification, DingDing robot notification, and FeiShu robot notification.   
> After setting the receiver, you need to set the associated alarm notification strategy to configure which alarm information is sent to which receiver.   


[Configure email notification](alert_email)  &emsp;&emsp;&emsp;&emsp;  [Configure WebHook notification](alert_webhook) &emsp;&emsp;&emsp;&emsp; [Configure enterprise wechat robot notification](alert_wework)    
[Configure DingDing robot notification](alert_dingtalk) &emsp;&emsp;&emsp;&emsp; [Configure FeiShu robot notification](alert_feishu)   
