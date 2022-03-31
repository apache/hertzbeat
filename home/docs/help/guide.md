---
id: guide  
title: 帮助中心      
sidebar_label: 帮助入门  
---

> TanCloud - 易用友好的高性能监控云    
> 使用过程中的帮助文档,辅助信息

## 🔬 监控服务

> 定时采集监控对端服务暴露的性能指标，提供可视化界面，处理数据供告警等服务调度。      
> 规划的监控类型：应用服务，数据库，操作系统，云原生，开源中间件

### 应用服务监控  

[网站监测](website)  &emsp;&emsp;&emsp;&emsp;  [HTTP API](api) &emsp;&emsp;&emsp;&emsp; [PING连通性](ping) &emsp;&emsp;&emsp;&emsp; [端口可用性](port) &emsp;&emsp;&emsp;&emsp; [全站监控](fullsite)

### 数据库监控  

[MYSQL数据库监控](mysql) &emsp;&emsp;&emsp;&emsp; [MariaDB数据库监控](mariadb)  &emsp;&emsp;&emsp;&emsp; [PostgreSQL数据库监控](postgresql)  &emsp;&emsp;&emsp;&emsp; [SqlServer数据库监控](sqlserver) &emsp;&emsp;&emsp;&emsp; [Oracle数据库监控](oracle)         

### 操作系统监控     

[Linux操作系统监控](linux) &emsp;&emsp;&emsp;&emsp;

## 💡 告警服务  

> 更自由化的阈值告警配置，支持邮箱，短信，webhook，钉钉，企业微信，飞书机器人等告警通知。     
> 告警服务的定位是阈值准确及时触发，告警通知及时可达。   

### 告警中心  

> 已触发的告警信息中心，提供告警删除，告警处理，标记未处理，告警级别状态等查询过滤。   

### 告警配置  

> 指标阈值配置，提供表达式形式的指标阈值配置，可设置告警级别，触发次数，告警通知模版和是否启用，关联监控等功能。

详见 [阈值告警](alert_threshold) &emsp;&emsp;&emsp;&emsp; [阈值表达式](alert_threshold_expr)   

### 告警通知  

> 触发告警信息后，除了显示在告警中心列表外，还可以用指定方式(邮件钉钉微信飞书等)通知给指定接收人。   
> 告警通知提供设置不同类型的通知方式，如邮件接收人，企业微信机器人通知，钉钉机器人通知，飞书机器人通知。   
> 接收人设置后需要设置关联的告警通知策略，来配置哪些告警信息发给哪些接收人。   


[配置邮箱通知](alert_email)  &emsp;&emsp;&emsp;&emsp;  [配置WebHook通知](alert_webhook) &emsp;&emsp;&emsp;&emsp; [配置企业微信机器人通知](alert_wework)    
[配置钉钉机器人通知](alert_dingtalk) &emsp;&emsp;&emsp;&emsp; [配置飞书机器人通知](alert_feishu)   
