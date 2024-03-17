---
title: HertzBeat v1.0.beta.8 Released, Featuring Tag Grouping and Many More Enhancements!   
author: tom  
author_title: tom   
author_url: https://github.com/tomsun28  
author_image_url: https://avatars.githubusercontent.com/u/24788200?s=400&v=4  
tags: [opensource]
---

HertzBeat is an open-source monitoring and alerting project incubated by Dromara, supporting various types of monitoring including websites, APIs, PING, ports, databases, middleware, operating systems, etc. It features threshold alerts, notification alerts (email, webhook, DingTalk, WeChat Work, Lark robots), and a user-friendly visual interface.

We're thrilled to announce that HertzBeat has been rated as a GVP - Gitee's Most Valuable Open Source Project!

![Screenshot 2022-04-08 at 09.14.44](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/8899bc4e836943dba2ec9efeec4ff629~tplv-k3u1fbpfcp-watermark.image?)

Official Website: hertzbeat.com | tancloud.cn

The latest version, v1.0-beta.8, is now released. In addition to supporting more monitoring types such as ElasticSearch and middleware Zookeeper, we have introduced long-awaited features like tag grouping, improved themes, tag-level filtering for alarm notifications, platformized alarm support for third-party alarm information integration, alarm triggers supporting silence for similar alarms (no longer frequently sending the same alerts), custom user permissions, recipient configuration testing, and significantly enhanced international support. Discover more exciting features and functionalities!

First and foremost, thank you to the HertzBeat contributors for their hard work, @wang1027-wqh, @gcdd1993, @a25017012, @shimingxy, @tomsun28, and to the community users for their productive feedback. Most of the features in this release were optimized based on user feedback and suggestions.

Version Features:

1. Update web endpoint '/console' to '/', api service endpoint … #79
2. Feature: Alarm and receiving Chinese and English support #82 contributed by @wang1027-wqh
3. [home]feature: support home docs i18n en #94 #81
4. Bugfix: non-supported character set when monitor GBK oracle
5. Feature: Add alarm template custom console and help document #93 contributed by @wang1027-wqh
6. [manager]feature: support ubuntu linux and centos linux monitoring
7. [monitor]feature: support roles permission, admin-user-guest #101
8. [manager]feature: refactor DispatchAlarm #106 contributed by @gcdd1993
9. Feat: [collector,manager]feature:I18N Support #wqh #107 contributed by @wang1027-wqh
10. Feat: [manager]feature: ElasticSearch cluster support #110 contributed by @wang1027-wqh
11. [monitor]feature: support tags, support alert notice dispatch by tags and priority #111 contributed by @a25017012 @yuye
12. Feature: Added zookeeper and middleware page support #114 contributed by @wang1027-wqh
13. [manager]feature: enable alerter send test msg #117
14. [monitor]feature: support alert nextEvalInterval, triggerTime. Ignore alert when happen again in eval interval. #123
15. [manager,webapp]feature: support alert define appHierarchy i18n #124
16. Change theme contributed by @shimingxy

BUG Fixes:
1. [collector]bugfix: non-supported character set when monitor GBK oracle #84
2. [script]bugfix: zh garbled characters appear in window's bat script e… #89
3. [web-app]bugfix: filter is missing when alert-center pageSize change
4. Fix #96, TDengine time zone error #98 contributed by @gcdd1993
5. [web-app]bugfix: recently alerts in dashboard load error when go back #105 contributed by @gcdd1993
6. [collector]bugfix: expression evaluation error when value with spaces #113
7. [manager,webapp]bugfix: error when tags duplicate in monitor #116
8. [manager]bugfix: linux.cpu.interrupt metric value is illegal #118
9. [alerter]bugfix nextEvalInterval npe
10. Notification bug contributed by @shimingxy

⚠️⚠️⚠️ Version Upgrade Notice:

⚠️⚠️⚠️ This version has changes in application.yml and sureness.yml configurations. If you have previously modified the configuration files, please make changes again based on the latest configuration files.

⚠️⚠️⚠️ The default account password is admin/hertzbeat. You can change it via configuring sureness.yml.

⚠️⚠️⚠️ Upgrading from v1.0-beta.7 to the latest v1.0-beta.8 requires executing the following upgrade SQL in MYSQL database:

```
use hertzbeat;

alter table alert add first_trigger_time bigint;
alter table alert add last_trigger_time bigint;
alter table alert add next_eval_interval bigint;
alter table alert add tags varchar(4000);
alter table alert add creator varchar(100);
alter table alert add modifier varchar(100);
alter table alert add gmt_update datetime;

alter table alert drop monitor_id;
alter table alert drop monitor_name;

alter table notice_rule add priorities varchar(100);
alter table notice_rule add tags varchar(4000);


-- ----------------------------
-- Table structure for tag
-- ----------------------------
DROP TABLE IF EXISTS  tag ;
CREATE TABLE  tag
(
    id           bigint           not null auto_increment comment 'TAG ID',
    name         varchar(100)     not null comment 'TAG标签名称',
    value        varchar(100)     comment 'TAG标签值(可为空)',
    type         tinyint          not null default 0 comment '标记类型 0:监控自动生成(monitorId,monitorName) 1: 用户生成 2: 系统预制',
    color        varchar(100)     default '#ffffff' comment '标签颜色' ,
    creator      varchar(100)     comment '创建者',
    modifier     varchar(100)     comment '最新修改者',
    gmt_create   timestamp        default current_timestamp comment 'create time',
    gmt_update   datetime         default current_timestamp on update current_timestamp comment 'update time',
    primary key (id),
    unique key unique_tag (name, value)
) ENGINE = InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------
-- Table structure for tag_monitor_bind
-- ----------------------------
DROP TABLE IF EXISTS  tag_monitor_bind ;
CREATE TABLE  tag_monitor_bind
(
    id           bigint           not null auto_increment comment '主键ID',
    tag_id       bigint           not null comment 'TAG ID',
    monitor_id   bigint           not null comment '监控任务ID',
    gmt_create   timestamp        default current_timestamp comment 'create time',
    gmt_update   datetime         default current_timestamp on update current_timestamp comment 'update time',
    primary key (id),
    index index_tag_monitor (tag_id, monitor_id)
) ENGINE = InnoDB DEFAULT CHARSET=utf8mb4;

```


Welcome to try it online at https://console.tancloud.cn.

-----------------------

> [HertzBeat](https://github.com/dromara/hertzbeat) is an open-source project supporting various types of monitoring including websites, APIs, PING, ports, databases, operating systems, etc., with a user-friendly visual interface.  
> We also offer a **[SAAS version of the monitoring cloud](https://console.tancloud.cn)**, allowing small and medium teams and individuals to start monitoring their web resources without deploying a complex monitoring system, **[log in to start](https://console.tancloud.cn)** for free.     
> HertzBeat supports [custom monitoring](https://hertzbeat.com/docs/advanced/extend-point), enabling the customization of monitoring types and metrics through the configuration of YML files to meet common personalized needs.   
> HertzBeat is modular, with `manager, collector, scheduler, warehouse, alerter` modules decoupled, facilitating understanding and custom development.       
> HertzBeat supports more flexible alarm configurations (calculation expressions), supports alarm notifications, templates, and timely notifications through email, DingTalk, WeChat, Lark, etc.          
> Welcome to log in to HertzBeat's [cloud environment TanCloud](https://console.tancloud.cn) to try and discover more.          
> We are rapidly iterating and welcome participation in co-building the open-source ecosystem.

> HertzBeat's support for multiple types, easy expansion, and low coupling aims to help developers and small and medium teams quickly build their own monitoring systems.

You can understand the functionalities through a demo video: https://www.bilibili.com/video/BV1DY4y1i7ts

Welcome to try it online at [https://console.tancloud.cn](https://console.tancloud.cn).

**Repository Addresses**

[Github](https://github.com/dromara/hertzbeat) https://github.com/dromara/hertzbeat      
[Gitee](https://gitee.com/dromara/hertzbeat) https://gitee.com/dromara/hertzbeat

Appreciate a Star if you find it useful, thank you very much, bowing down!!
