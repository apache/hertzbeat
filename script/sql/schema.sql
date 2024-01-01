-- Licensed to the Apache Software Foundation (ASF) under one
-- or more contributor license agreements.  See the NOTICE file
-- distributed with this work for additional information
-- regarding copyright ownership.  The ASF licenses this file
-- to you under the Apache License, Version 2.0 (the
-- "License"); you may not use this file except in compliance
-- with the License.  You may obtain a copy of the License at
--
--     http://www.apache.org/licenses/LICENSE-2.0
--
-- Unless required by applicable law or agreed to in writing, software
-- distributed under the License is distributed on an "AS IS" BASIS,
-- WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
-- See the License for the specific language governing permissions and
-- limitations under the License.

-- this file works for MySQL.


set names utf8mb4;
drop database if exists hertzbeat;
create database hertzbeat default charset utf8mb4 collate utf8mb4_general_ci;
use hertzbeat;

-- ----------------------------
-- Table structure for monitor
-- ----------------------------
DROP TABLE IF EXISTS  hzb_monitor ;
CREATE TABLE  hzb_monitor
(
     id           bigint       not null comment '监控ID',
     job_id       bigint       comment '监控对应下发的采集任务ID',
     name         varchar(100) not null comment '监控的名称',
     app          varchar(100) not null comment '监控的类型:linux,mysql,jvm...',
     host         varchar(100) not null comment '监控的对端host:ipv4,ipv6,域名',
     intervals    int          not null default 600 comment '监控的采集间隔时间,单位秒',
     status       tinyint      not null default 1 comment '任务状态 0:未监控,1:可用,2:不可用',
     description  varchar(255) comment '描述备注信息',
     creator      varchar(100) comment '创建者',
     modifier     varchar(100) comment '最新修改者',
     gmt_create   timestamp    default current_timestamp comment 'create time',
     gmt_update   datetime     default current_timestamp on update current_timestamp comment 'update time',
     primary key (id),
     index query_index (app, host, name)
) ENGINE = InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------
-- Table structure for param
-- ----------------------------
DROP TABLE IF EXISTS  hzb_param ;
CREATE TABLE  hzb_param
(
    id           bigint       not null auto_increment comment '参数ID',
    monitor_id   bigint       not null comment '监控ID',
    field        varchar(100) not null comment '参数标识符',
    `value`      varchar(8126) comment '参数值,最大字符长度8126',
    type         tinyint      not null default 0 comment '参数类型 0:数字 1:字符串 2:加密串',
    gmt_create   timestamp    default current_timestamp comment 'create time',
    gmt_update   datetime     default current_timestamp on update current_timestamp comment 'update time',
    primary key (id),
    index monitor_id (monitor_id),
    unique key unique_param (monitor_id, field)
) ENGINE = InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------
-- Table structure for param
-- ----------------------------
DROP TABLE IF EXISTS  hzb_param_define ;
CREATE TABLE  hzb_param_define
(
    id           bigint           not null auto_increment comment '参数ID',
    app          varchar(100)     not null comment '监控的类型:linux,mysql,jvm...',
    name         varchar(100)     not null comment '参数字段对外显示名称',
    field        varchar(100)     not null comment '参数字段标识符',
    type         varchar(20)      not null default 'text' comment '字段类型,样式(大部分映射input标签type属性)',
    required     boolean          not null default false comment '是否是必输项 true-必填 false-可选',
    param_range  varchar(100)     not null comment '当type为number时,用range表示范围 eg: 0-233',
    param_limit  tinyint unsigned not null comment '当type为text时,用limit表示字符串限制大小.最大255',
    param_option varchar(4000)    not null comment '当type为radio单选框,checkbox复选框时,option表示可选项值列表',
    creator      varchar(100)     comment '创建者',
    modifier     varchar(100)     comment '最新修改者',
    gmt_create   timestamp        default current_timestamp comment 'create time',
    gmt_update   datetime         default current_timestamp on update current_timestamp comment 'update time',
    primary key (id),
    unique key unique_param_define (app, field)
) ENGINE = InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------
-- Table structure for tag
-- ----------------------------
DROP TABLE IF EXISTS  hzb_tag ;
CREATE TABLE  hzb_tag
(
    id           bigint           not null auto_increment comment 'TAG ID',
    name         varchar(100)     not null comment 'TAG标签名称',
    `value`      varchar(100)     comment 'TAG标签值(可为空)',
    type         tinyint          not null default 0 comment '标记类型 0:监控自动生成(monitorId,monitorName) 1: 用户生成 2: 系统预制',
    color        varchar(100)     default '#ffffff' comment '标签颜色' ,
    creator      varchar(100)     comment '创建者',
    modifier     varchar(100)     comment '最新修改者',
    gmt_create   timestamp        default current_timestamp comment 'create time',
    gmt_update   datetime         default current_timestamp on update current_timestamp comment 'update time',
    primary key (id),
    unique key unique_tag (name, `value`)
) ENGINE = InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------
-- Table structure for tag_monitor_bind
-- ----------------------------
DROP TABLE IF EXISTS  hzb_tag_monitor_bind ;
CREATE TABLE  hzb_tag_monitor_bind
(
    id           bigint           not null auto_increment comment '主键ID',
    tag_id       bigint           not null comment 'TAG ID',
    monitor_id   bigint           not null comment '监控ID',
    gmt_create   timestamp        default current_timestamp comment 'create time',
    gmt_update   datetime         default current_timestamp on update current_timestamp comment 'update time',
    primary key (id),
    index index_tag_monitor (tag_id, monitor_id)
) ENGINE = InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------
-- Table structure for alert_define
-- ----------------------------
DROP TABLE IF EXISTS  hzb_alert_define ;
CREATE TABLE  hzb_alert_define
(
    id                bigint           not null auto_increment comment '告警定义ID',
    app               varchar(100)     not null comment '配置告警的监控类型:linux,mysql,jvm...',
    metric            varchar(100)     not null comment '配置告警的指标集合:cpu,memory,info...',
    field             varchar(100)     comment '配置告警的指标:usage,cores...',
    preset            boolean          not null default false comment '是否是全局默认告警，是则所有此类型监控默认关联此告警',
    expr              varchar(255)     comment '告警触发条件表达式',
    priority          tinyint          not null default 0 comment '告警级别 0:高-emergency-紧急告警-红色 1:中-critical-严重告警-橙色 2:低-warning-警告告警-黄色',
    times             int              not null default 1 comment '触发次数,即达到触发阈值次数要求后才算触发告警',
    tags              varchar(4000)    comment '附加告警标签(status:success,env:prod)',
    enable            boolean          not null default true comment '告警阈值开关',
    template          varchar(255)     not null comment '告警通知模板内容',
    recover_notice    boolean          not null default false comment 'Is send alarm recovered notice | 是否发送告警恢复通知',
    creator           varchar(100)     comment '创建者',
    modifier          varchar(100)     comment '最新修改者',
    gmt_create        timestamp        default current_timestamp comment 'create time',
    gmt_update        datetime         default current_timestamp on update current_timestamp comment 'update time',
    primary key (id)
) ENGINE = InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------
-- Table structure for alert_define_monitor_bind
-- ----------------------------
DROP TABLE IF EXISTS  hzb_alert_define_monitor_bind ;
CREATE TABLE  hzb_alert_define_monitor_bind
(
    id               bigint           not null auto_increment comment '告警定义与监控关联ID',
    alert_define_id  bigint           not null comment '告警定义ID',
    monitor_id       bigint           not null comment '监控ID',
    gmt_create       timestamp        default current_timestamp comment 'create time',
    gmt_update       datetime         default current_timestamp on update current_timestamp comment 'update time',
    primary key (id),
    index index_bind (alert_define_id, monitor_id)
) ENGINE = InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------
-- Table structure for hzb_alert_silence
-- ----------------------------
DROP TABLE IF EXISTS  hzb_alert_silence ;
CREATE TABLE  hzb_alert_silence
(
    id             bigint           not null auto_increment comment '告警静默主键索引ID',
    name           varchar(100)     not null comment '静默策略名称',
    enable         boolean          not null default true comment '是否启用此策略',
    match_all      boolean          not null default true comment '是否应用匹配所有',
    priorities     varchar(100)     comment '匹配告警级别，空为全部告警级别',
    tags           varchar(4000)    comment '匹配告警信息标签(monitorId:xxx,monitorName:xxx)',
    times          int              default 0 comment '已静默告警次数',
    type           tinyint          not null default 0 comment '静默类型 0:一次性静默 1:周期性静默',
    days           varchar(100)     comment '周期性静默时有效 星期几,多选,全选或空则为每天 7:周日 1:周一 2:周二 3:周三 4:周四 5:周五 6:周六',
    period_start   timestamp        comment '静默时间段起始:00:00:00',
    period_end     timestamp        comment '静默时间段截止:23:59:59',
    creator        varchar(100)     comment '创建者',
    modifier       varchar(100)     comment '最新修改者',
    gmt_create     timestamp        default current_timestamp comment 'create time',
    gmt_update     datetime         default current_timestamp on update current_timestamp comment 'update time',
    primary key (id)
) ENGINE = InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------
-- Table structure for hzb_alert_converge
-- ----------------------------
DROP TABLE IF EXISTS  hzb_alert_converge ;
CREATE TABLE  hzb_alert_converge
(
    id             bigint           not null auto_increment comment '告警静默主键索引ID',
    name           varchar(100)     not null comment '静默策略名称',
    enable         boolean          not null default true comment '是否启用此策略',
    match_all      boolean          not null default true comment '是否应用匹配所有',
    priorities     varchar(100)     comment '匹配告警级别，空为全部告警级别',
    tags           varchar(4000)    comment '匹配告警信息标签(monitorId:xxx,monitorName:xxx)',
    eval_interval  int              default 0 comment 'Repeat Alert Converge Time Range, unit s',
    creator        varchar(100)     comment '创建者',
    modifier       varchar(100)     comment '最新修改者',
    gmt_create     timestamp        default current_timestamp comment 'create time',
    gmt_update     datetime         default current_timestamp on update current_timestamp comment 'update time',
    primary key (id)
) ENGINE = InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------
-- Table structure for alert
-- ----------------------------
DROP TABLE IF EXISTS  hzb_alert ;
CREATE TABLE  hzb_alert
(
    id                   bigint           not null auto_increment comment '告警ID',
    target               varchar(255)     not null comment '告警目标对象: 监控可用性-available 指标-app.metrics.field',
    alert_define_id      bigint           comment '告警关联的告警定义ID',
    priority             tinyint          not null default 0 comment '告警级别 0:高-emergency-紧急告警-红色 1:中-critical-严重告警-橙色 2:低-warning-警告告警-黄色',
    content              varchar(4000)    not null comment '告警通知实际内容',
    status               tinyint          not null default 0 comment '告警状态: 0-正常告警(待处理) 1-阈值触发但未达到告警次数 2-恢复告警 3-已处理',
    times                int              not null comment '告警次数',
    first_alarm_time     bigint           comment '首次告警时间(毫秒时间戳)',
    last_alarm_time      bigint           comment '最近告警时间(毫秒时间戳)',
    tags                 varchar(4000)    comment '告警信息标签(monitorId:xxx,monitorName:xxx)',
    creator              varchar(100)     comment '创建者',
    modifier             varchar(100)     comment '最新修改者',
    gmt_create           timestamp        default current_timestamp comment 'create time',
    gmt_update           datetime         default current_timestamp on update current_timestamp comment 'update time',
    primary key (id)
) ENGINE = InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------
-- Table structure for hzb_notice_rule
-- ----------------------------
DROP TABLE IF EXISTS  hzb_notice_rule ;
CREATE TABLE  hzb_notice_rule
(
    id             bigint           not null auto_increment comment '通知策略主键索引ID',
    name           varchar(100)     not null comment '策略名称',
    receiver_id    bigint           not null comment '消息接收对象ID',
    receiver_name  varchar(100)     not null comment '消息接收对象标识',
    template_id    bigint           comment '消息模版ID',
    template_name  varchar(100)     comment '消息模版标识',
    enable         boolean          not null default true comment '是否启用此策略',
    filter_all     boolean          not null default true comment '是否转发所有',
    priorities     varchar(100)     comment '匹配告警级别，空为全部告警级别',
    tags           varchar(4000)    comment '匹配告警信息标签(monitorId:xxx,monitorName:xxx)',
    days           varchar(100)     comment '星期几,多选,全选或空则为每天 7:周日 1:周一 2:周二 3:周三 4:周四 5:周五 6:周六',
    period_start   timestamp        comment '限制时间段起始:00:00:00',
    period_end     timestamp        comment '限制时间段截止:23:59:59',
    creator        varchar(100)     comment '创建者',
    modifier       varchar(100)     comment '最新修改者',
    gmt_create     timestamp        default current_timestamp comment 'create time',
    gmt_update     datetime         default current_timestamp on update current_timestamp comment 'update time',
    primary key (id)
) ENGINE = InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------
-- Table structure for hzb_notice_template
-- ----------------------------
DROP TABLE IF EXISTS  hzb_notice_template ;
CREATE TABLE  hzb_notice_template
(
    id             bigint           not null auto_increment comment '通知模版主键索引ID',
    name           varchar(100)     not null comment '模版名称',
    type           tinyint          not null comment '通知信息方式: 0-手机短信 1-邮箱 2-webhook 3-微信公众号 4-企业微信机器人 5-钉钉机器人',
    preset         boolean          default false comment '是否为预设模板: true-预设模板 false-自定义模板',
    content        longtext         comment '模板内容',
    creator        varchar(100)     comment '创建者',
    modifier       varchar(100)     comment '最新修改者',
    gmt_create     timestamp        default current_timestamp comment 'create time',
    gmt_update     datetime         default current_timestamp on update current_timestamp comment 'update time',
    primary key (id)
) ENGINE = InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------
-- Table structure for notice_receiver
-- ----------------------------
DROP TABLE IF EXISTS  hzb_notice_receiver ;
CREATE TABLE  hzb_notice_receiver
(
    id           bigint           not null auto_increment comment '消息接收对象ID',
    name         varchar(100)     not null comment '消息接收对象姓名',
    type         tinyint          not null comment '通知信息方式: 0-手机短信 1-邮箱 2-webhook 3-微信公众号 4-企业微信机器人 5-钉钉机器人',
    phone        varchar(100)     comment '手机号, 通知方式为手机短信时有效',
    email        varchar(100)     comment '邮箱账号, 通知方式为邮箱时有效',
    hook_url     varchar(255)     comment 'URL地址, 通知方式为webhook有效',
    wechat_id    varchar(255)     comment 'openId, 通知方式为微信公众号或企业微信机器人有效',
    access_token varchar(255)     comment '访问token, 通知方式为钉钉机器人有效',
    tg_bot_token varchar(255)     comment 'Telegram bot token, 通知方式为Telegram机器人有效',
    tg_user_id   varchar(255)     comment 'Telegram user id, 通知方式为Telegram机器人有效',
    slack_web_hook_url varchar(255)     comment 'URL地址 : 通知方式为Slack有效',
    corp_id      varchar(255)     comment '企业信息 : 通知方式为Enterprise WeChat app message有效',
    agent_id     varchar(255)     comment '企业微信应用id : 通知方式为Enterprise WeChat app message有效',
    app_secret   varchar(255)     comment '企业微信应用secret : 通知方式为Enterprise WeChat app message有效',
    discord_channel_id  varchar(255)     comment 'Discord 频道id: 通知方式为Discord有效',
    discord_bot_token   varchar(255)     comment 'Discord 机器人Token: 通知方式为Discord有效',
    creator      varchar(100)     comment '创建者',
    modifier     varchar(100)     comment '最新修改者',
    gmt_create   timestamp        default current_timestamp comment 'create time',
    gmt_update   datetime         default current_timestamp on update current_timestamp comment 'update time',
    primary key (id)
) ENGINE = InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------
-- Table structure for hzb_history
-- ----------------------------
DROP TABLE IF EXISTS  hzb_history ;
CREATE TABLE  hzb_history
(
    id             bigint           not null auto_increment comment '通知策略主键索引ID',
    monitor_id     bigint           not null comment '监控ID',
    app            varchar(100)     not null comment '监控类型 mysql oracle db2',
    metrics        varchar(100)     not null comment '指标集合名称 innodb disk cpu',
    metric         varchar(100)     not null comment '指标名称 usage speed count',
    instance       varchar(5000)    comment '实例',
    metric_type    tinyint          not null comment '字段类型 0: 数值 1：字符串',
    str            varchar(1024)    comment '字符值',
    int32          int              comment '整数',
    dou            float            comment '数值',
    time           bigint           comment '采集时间戳',
    primary key (id)
) ENGINE = InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------
-- Table structure for hzb_config
-- ----------------------------
DROP TABLE IF EXISTS  hzb_config ;
CREATE TABLE  hzb_config
(
    type         varchar(100)     not null comment '配置类型：sms，email',
    content      varchar(4096)    not null comment '配置内容JSON',
    creator      varchar(100)     comment '创建者',
    modifier     varchar(100)     comment '最新修改者',
    gmt_create   timestamp        default current_timestamp comment 'create time',
    gmt_update   datetime         default current_timestamp on update current_timestamp comment 'update time',
    primary key (type)
) ENGINE = InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------
-- Table structure for hzb_collector
-- ----------------------------
DROP TABLE IF EXISTS  hzb_collector ;
CREATE TABLE  hzb_collector
(
    id           bigint           not null auto_increment comment '采集器主键索引ID',
    name         varchar(255)     not null comment 'collector identity name',
    ip           varchar(255)     not null comment 'collector ip',
    status       tinyint          not null default 0 comment 'collector status: 0-online 1-offline',
    mode         varchar(100)     comment 'collector mode: public private',
    creator      varchar(100)     comment 'creator',
    modifier     varchar(100)     comment 'modifier',
    gmt_create   timestamp        default current_timestamp comment 'create time',
    gmt_update   datetime         default current_timestamp on update current_timestamp comment 'update time',
    primary key (id),
    unique key (name)
) ENGINE = InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------
-- Table structure for hzb_collector_monitor_bind
-- ----------------------------
DROP TABLE IF EXISTS  hzb_collector_monitor_bind ;
CREATE TABLE  hzb_collector_monitor_bind
(
    id           bigint           not null auto_increment comment '主键ID',
    collector    varchar(255)     not null comment 'collector ID',
    monitor_id   bigint           not null comment 'monitor ID',
    creator      varchar(100)     comment 'creator',
    modifier     varchar(100)     comment 'modifier',
    gmt_create   timestamp        default current_timestamp comment 'create time',
    gmt_update   datetime         default current_timestamp on update current_timestamp comment 'update time',
    primary key (id),
    index index_collector_monitor (collector, monitor_id)
) ENGINE = InnoDB DEFAULT CHARSET=utf8mb4;

COMMIT;
