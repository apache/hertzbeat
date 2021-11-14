use usthe;

-- ----------------------------
-- Table structure for monitor
-- ----------------------------
DROP TABLE IF EXISTS  monitor ;
CREATE TABLE  monitor
(
     id           bigint       not null auto_increment comment '监控ID',
     job_id       bigint       not null comment '监控对应下发的任务ID',
     name         varchar(100) not null comment '监控的名称',
     app          varchar(100) not null comment '监控的类型:linux,mysql,jvm...',
     host         varchar(100) not null comment '监控的对端host:ipv4,ipv6,域名',
     intervals    int          not null default 600 comment '监控的采集间隔时间,单位秒',
     status       tinyint      not null default 1 comment '监控状态 0:未监控,1:可用,2:不可用,3:不可达,4:挂起',
     description  varchar(255) comment '描述备注信息',
     creator      varchar(100) comment '创建者',
     modifier     varchar(100) comment '最新修改者',
     gmt_create   timestamp    default current_timestamp comment 'create time',
     gmt_update   datetime     default current_timestamp on update current_timestamp comment 'update time',
     primary key (id)
) ENGINE = InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------
-- Table structure for param
-- ----------------------------
DROP TABLE IF EXISTS  param ;
CREATE TABLE  param
(
    id           bigint       not null auto_increment comment '参数ID',
    monitor_id   bigint       not null comment '监控ID',
    field        varchar(100) not null comment '参数标识符',
    value        varchar(255) not null comment '参数值,最大字符长度255',
    type         tinyint      not null default 0 comment '参数类型 0:数字 1:字符串 2:加密串',
    gmt_create   timestamp    default current_timestamp comment 'create time',
    gmt_update   datetime     default current_timestamp on update current_timestamp comment 'update time',
    primary key (id),
    index monitor_id (monitor_id)
) ENGINE = InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------
-- Table structure for param
-- ----------------------------
DROP TABLE IF EXISTS  param_define ;
CREATE TABLE  param_define
(
    id           bigint           not null auto_increment comment '参数ID',
    app          varchar(100)     not null comment '监控的类型:linux,mysql,jvm...',
    name         varchar(100)     not null comment '参数字段对外显示名称',
    field        varchar(100)     not null comment '参数字段标识符',
    type         varchar(20)      not null default 'text' comment '字段类型,样式(大部分映射input标签type属性)',
    param_range  varchar(100)     not null comment '当type为number时,用range表示范围 eg: 0-233',
    param_limit  tinyint unsigned not null comment '当type为text时,用limit表示字符串限制大小.最大255',
    param_option varchar(255)     not null comment '当type为radio单选框,checkbox复选框时,option表示可选项值列表',
    creator      varchar(100)     comment '创建者',
    modifier     varchar(100)     comment '最新修改者',
    gmt_create   timestamp        default current_timestamp comment 'create time',
    gmt_update   datetime         default current_timestamp on update current_timestamp comment 'update time',
    primary key (id),
    index app_index (app)
) ENGINE = InnoDB DEFAULT CHARSET=utf8mb4;