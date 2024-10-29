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

create table auth_role
(
    id          bigint auto_increment
        primary key,
    code        varchar(100) not null,
    description varchar(255) null,
    gmt_create  datetime(6)  null,
    gmt_update  datetime(6)  null,
    name        varchar(100) not null,
    status      int          null,
    check ((`status` >= 0) and (`status` <= 9))
);

INSERT INTO hertzbeat_template_hub.auth_role (id, code, description, gmt_create, gmt_update, name, status) VALUES (1, 'role_admin', null, null, null, 'admin role', 1);
INSERT INTO hertzbeat_template_hub.auth_role (id, code, description, gmt_create, gmt_update, name, status) VALUES (2, 'role_user', null, null, null, 'user role', 1);
