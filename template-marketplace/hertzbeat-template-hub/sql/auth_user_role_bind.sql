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

create table auth_user_role_bind
(
    id         bigint auto_increment
        primary key,
    gmt_create datetime(6) null,
    gmt_update datetime(6) null,
    role_id    bigint      not null,
    user_id    bigint      not null
);

INSERT INTO hertzbeat_template_hub.auth_user_role_bind (id, gmt_create, gmt_update, role_id, user_id) VALUES (1, null, null, 2, 1);
INSERT INTO hertzbeat_template_hub.auth_user_role_bind (id, gmt_create, gmt_update, role_id, user_id) VALUES (2, null, null, 2, 2);
INSERT INTO hertzbeat_template_hub.auth_user_role_bind (id, gmt_create, gmt_update, role_id, user_id) VALUES (3, null, null, 2, 3);
INSERT INTO hertzbeat_template_hub.auth_user_role_bind (id, gmt_create, gmt_update, role_id, user_id) VALUES (4, null, null, 2, 4);
INSERT INTO hertzbeat_template_hub.auth_user_role_bind (id, gmt_create, gmt_update, role_id, user_id) VALUES (5, null, null, 2, 5);
INSERT INTO hertzbeat_template_hub.auth_user_role_bind (id, gmt_create, gmt_update, role_id, user_id) VALUES (6, null, null, 2, 6);
INSERT INTO hertzbeat_template_hub.auth_user_role_bind (id, gmt_create, gmt_update, role_id, user_id) VALUES (7, null, null, 2, 7);
INSERT INTO hertzbeat_template_hub.auth_user_role_bind (id, gmt_create, gmt_update, role_id, user_id) VALUES (8, null, null, 2, 8);
