/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

create table auth_user
(
    id           bigint auto_increment
        primary key,
    name         varchar(255) not null comment '用户名，允许重复，允许修改',
    email        varchar(255) not null comment '邮箱，允许修改，用于用户登录',
    create_time  varchar(255) not null comment '注册时间',
    log_off_time varchar(255) not null comment '注销时间，未注销为0，注销为时间',
    avatar       varchar(255) null,
    password     varchar(100) not null,
    salt         varchar(255) null,
    status       int          null,
    update_time  varchar(255) not null,
    check ((`status` >= 0) and (`status` <= 4))
);

INSERT INTO hertzbeat_template_hub.auth_user (id, name, email, create_time, log_off_time, avatar, password, salt, status, update_time) VALUES (1, 'user', 'wang_bs@163.com', '2024-10-19 21:56:14', '0', null, '251BCA22DFFC1469D001144E680E27BB', 'j6rchp', 1, '2024-10-19 21:56:14');
INSERT INTO hertzbeat_template_hub.auth_user (id, name, email, create_time, log_off_time, avatar, password, salt, status, update_time) VALUES (2, 'wbs2024@163.com', 'wbs2024@163.com', '2024-10-19 21:56:14', '0', null, '251BCA22DFFC1469D001144E680E27BB', 'j6rchp', 1, '2024-10-19 21:56:14');
INSERT INTO hertzbeat_template_hub.auth_user (id, name, email, create_time, log_off_time, avatar, password, salt, status, update_time) VALUES (3, 'wang_bs2025@163.com', 'wang_bs2025@163.com', '2024-10-28 20:55:28', '0', null, '8890D5B40B55EEA106F70EE1444FDBE3', 'qkz6zl', 1, '2024-10-28 20:55:28');
INSERT INTO hertzbeat_template_hub.auth_user (id, name, email, create_time, log_off_time, avatar, password, salt, status, update_time) VALUES (4, 'wang_bs2026@163.com', 'wang_bs2026@163.com', '2024-10-28 20:58:02', '0', null, 'A6E3522FAAEC63443D9D74897C1CF57A', 'mkokmc', 1, '2024-10-28 20:58:02');
INSERT INTO hertzbeat_template_hub.auth_user (id, name, email, create_time, log_off_time, avatar, password, salt, status, update_time) VALUES (5, 'wang_bs2027@163.com', 'wang_bs2027@163.com', '2024-10-28 20:59:18', '0', null, '9CB428E52EFB187333C6EE278E294310', 'svzdjg', 1, '2024-10-28 20:59:18');
INSERT INTO hertzbeat_template_hub.auth_user (id, name, email, create_time, log_off_time, avatar, password, salt, status, update_time) VALUES (6, 'wang_bs2028@163.com', 'wang_bs2028@163.com', '2024-10-28 21:00:01', '0', null, '75DA0A713E957714FA17331A7A0C3514', 'mfp2bq', 1, '2024-10-28 21:00:01');
INSERT INTO hertzbeat_template_hub.auth_user (id, name, email, create_time, log_off_time, avatar, password, salt, status, update_time) VALUES (7, 'user', 'wang_bs2029@163.com', '2024-10-28 21:22:07', '0', null, '89DE72E193A941E88A2220E59DE94EA7', 's9iepv', 1, '2024-10-28 21:22:07');
INSERT INTO hertzbeat_template_hub.auth_user (id, name, email, create_time, log_off_time, avatar, password, salt, status, update_time) VALUES (8, 'user', 'wang_bs8@163.com', '2024-10-28 21:28:13', '0', null, 'B5F8BF9F0D7BBA4669CE9D2C28F9BC9F', 'fqcw90', 1, '2024-10-28 21:28:13');
