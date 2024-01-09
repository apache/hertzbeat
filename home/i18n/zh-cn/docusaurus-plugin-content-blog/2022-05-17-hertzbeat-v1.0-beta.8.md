---
title: HertzBeat赫兹节拍 v1.0.beta.8 发布，标签分组等超多特性来袭！   
author: tom  
author_title: tom   
author_url: https://github.com/tomsun28  
author_image_url: https://avatars.githubusercontent.com/u/24788200?s=400&v=4  
tags: [opensource]  
---


HertzBeat赫兹跳动 是一个由Dromara孵化的支持网站，API，PING，端口，数据库，中间件，操作系统等监控类型，支持阈值告警，告警通知(邮箱，webhook，钉钉，企业微信，飞书机器人)，拥有易用友好的可视化操作界面的开源监控告警项目。

很高兴Hertzbeat被评定为GVP - Gitee最有价值开源项目！

![截屏2022-04-08 09.14.44.png](https://p3-juejin.byteimg.com/tos-cn-i-k3u1fbpfcp/8899bc4e836943dba2ec9efeec4ff629~tplv-k3u1fbpfcp-watermark.image?)

官网: hertzbeat.com | tancloud.cn

最新版本 v1.0-beat.8 已经发布，除了支持更多的监控类型比如elasticSearch,中间件zookeeper等，我们还带来了期待已久的标签分组，更好看的主题，告警通知标签级别等过滤，告警平台化支持第三方告警信息接入，告警触发支持同类告警静默(不再频繁发送相同告警)，自定义用户权限支持，接收人配置测试等，此版本也大大增强了国际化支持，更多特性功能体验发现哦！

首先感谢 hertzbeat 贡献者们的辛苦付出，@wang1027-wqh @gcdd1993 @a25017012  @shimingxy @tomsun28
还有社区用户们的生产使用反馈，这次大部分特性都是根据用户的反馈建议收集优化的。

版本特性：

1. update web endpoint '/console' to '/', api service endpoint … #79 
2. feature: Alarm and receiving Chinese and English support #82 contribute by @wang1027-wqh
3. [home]feature: support home docs i18n en #94 #81
4. bugfix: non-supported character set when monitor GBK oracle
5. feature:Add alarm template custom console and help document #93 contribute by @wang1027-wqh
6. [manager]feature: support ubuntu linux and centos linux monitoring
7. [monitor]feature: support roles permission, admin-user-guest #101
8. [manager]feature: refactor DispatchAlarm #106 contribute by @gcdd1993  
9. feat: [collector,manager]feature:I18N Support #wqh #107 contribute by @wang1027-wqh
10. feat: [manager]feature: ElasticSearch cluster support #110 contribute by @wang1027-wqh
11. [monitor]feature: support tags, support alert notice dispatch by tags and priority #111 contribute by @a25017012 @yuye
12. feature: Added zookeeper and middleware page support #114 contribute by @wang1027-wqh
13. [manager]feature: enable alerter send test msg #117
14. [monitor]feature: support alert nextEvalInterval, triggerTime. Ignore alert when happen again in eval interval. #123
15. [manager,webapp]feature: support alert define appHierarchy i18n #124
16. change theme contribute by @shimingxy

BUG修复
1. [collector]bugfix: non-supported character set when monitor GBK oracle #84
2. [script]bugfix: zh garbled characters appear in window's bat script e… #89
3. [web-app]bugfix: filter is missing when alert-center pageSize change
4. fix #96，TDengine时区错误 #98 contribute by @gcdd1993 
5. [web-app]bugfix: recently alerts in dashboard load error when go back #105 contribute by @gcdd1993
6. [collector]bugfix: expression evaluation error when value with spaces #113
7. [manager,webapp]bugfix: error when tags duplicate in monitor #116
8. [manager]bugfix: linux.cpu.interrupt metric value is illegal #118
9. [alerter]bugfix nextEvalInterval npe
10. notification bug contribute by @shimingxy

⚠️⚠️⚠️ 版本升级注意： 

⚠️⚠️⚠️  此版本 application.yml 和 sureness.yml 配置有改动，若之前对配置文件有更改，请在最新的配置文件基础上再次修改配置   

⚠️⚠️⚠️ 默认账户密码为 admin/hertzbeat , 可通过配置sureness.yml修改   

⚠️⚠️⚠️ v1.0-beat7 升级到最新 v1.0-beat8 需MYSQL数据库执行以下升级SQL:  

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

欢迎在线试用 https://console.tancloud.cn.

-----------------------

> [HertzBeat赫兹跳动](https://github.com/dromara/hertzbeat) 是一个支持网站，API，PING，端口，数据库，操作系统等监控类型，拥有易用友好的可视化操作界面的开源监控告警项目。  
> 我们也提供了对应的 **[SAAS版本监控云](https://console.tancloud.cn)**，中小团队和个人无需再为了监控自己的网站资源，而去部署一套繁琐的监控系统，**[登录即可免费开始](https://console.tancloud.cn)**。     
> HertzBeat 支持[自定义监控](https://hertzbeat.com/docs/advanced/extend-point) ,只用通过配置YML文件我们就可以自定义需要的监控类型和指标，来满足常见的个性化需求。   
> HertzBeat 模块化，`manager, collector, scheduler, warehouse, alerter` 各个模块解耦合，方便理解与定制开发。       
> HertzBeat 支持更自由化的告警配置(计算表达式)，支持告警通知，告警模版，邮件钉钉微信飞书等及时通知送达          
> 欢迎登录 HertzBeat 的 [云环境TanCloud](https://console.tancloud.cn) 试用发现更多。          
> 我们正在快速迭代中，欢迎参与加入一起共建项目开源生态。

> `HertzBeat`的多类型支持，易扩展，低耦合，希望能帮助开发者和中小团队快速搭建自有监控系统。

老铁们可以通过演示视频来直观了解功能： https://www.bilibili.com/video/BV1DY4y1i7ts

欢迎在线试用 [https://console.tancloud.cn](https://gitee.com/link?target=https%3A%2F%2Fconsole.tancloud.cn)

**仓库地址**

[Github](https://github.com/dromara/hertzbeat) https://github.com/dromara/hertzbeat      
[Gitee](https://gitee.com/dromara/hertzbeat) https://gitee.com/dromara/hertzbeat

看到这里不妨给个Star支持下哦，灰常感谢，弯腰!!
