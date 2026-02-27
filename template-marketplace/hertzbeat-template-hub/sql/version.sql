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

create table version
(
    id          int auto_increment comment '版本id'
        primary key,
    template_id int          not null comment '模版id',
    version     varchar(255) not null comment '版本号，不允许修改',
    description varchar(255) not null comment '版本描述，todo：扩展为markdown文件地址',
    download    int          not null comment '下载量',
    create_time varchar(255) not null comment '创建时间',
    off_shelf   int          not null comment '是否下架',
    is_del      int          not null comment '是否删除',
    star        int          not null
)
    comment '版本表存放存储于minio中的object关键字信息，用用户名+template_id+版本号拼接，如果用户名允许修改或重复，则用用户id拼接';

create index template_isDel_idx
    on version (template_id, is_del);

create index template_version_idx
    on version (template_id, version)
    comment '通过该索引能够确定唯一数据';