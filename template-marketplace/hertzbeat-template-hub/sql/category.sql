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

create table category
(
    id          int auto_increment comment '类别id'
        primary key,
    name        varchar(255) not null comment '类别名',
    description varchar(255) not null comment '描述',
    create_time varchar(255) not null,
    update_time varchar(255) not null comment '更新时间',
    is_del      int          not null comment '删除标记'
);

INSERT INTO hertzbeat_template_hub.category (id, name, description, create_time, update_time, is_del) VALUES (1, 'Database monitoring', '数据库监控模版', '2024-09-20 16:35:01', '2024-09-20 17:10:24', 0);
INSERT INTO hertzbeat_template_hub.category (id, name, description, create_time, update_time, is_del) VALUES (2, 'Application service monitoring', '应用服务监控模版', '2024-09-20 16:36:59', '2024-09-20 16:36:59', 0);
INSERT INTO hertzbeat_template_hub.category (id, name, description, create_time, update_time, is_del) VALUES (3, 'Operating system monitoring', '操作系统监控模版', '2024-09-20 16:37:51', '2024-09-20 16:37:51', 0);
INSERT INTO hertzbeat_template_hub.category (id, name, description, create_time, update_time, is_del) VALUES (4, 'Middleware monitoring', '中间件监控模版', '2024-09-20 16:38:11', '2024-09-20 16:38:11', 0);
INSERT INTO hertzbeat_template_hub.category (id, name, description, create_time, update_time, is_del) VALUES (5, 'CloudNative monitoring', '云原生监控模版', '2024-09-20 16:38:31', '2024-09-20 16:38:31', 0);
INSERT INTO hertzbeat_template_hub.category (id, name, description, create_time, update_time, is_del) VALUES (6, 'Network monitoring', '网络监控模版', '2024-09-20 16:38:54', '2024-09-20 16:38:54', 0);
