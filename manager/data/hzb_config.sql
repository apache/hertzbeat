CREATE TABLE `hzb_config` (
                              `type` tinyint(5) NOT NULL COMMENT '配置类型：1-短信，2-邮件',
                              `content` json DEFAULT NULL COMMENT '配置内容',
                              `enabled` tinyint(1) DEFAULT NULL COMMENT '标志位，使用原生配置为0，使用数据库配置为1',
                              PRIMARY KEY (`type`) USING BTREE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;