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

create table auth_role_resource_bind
(
    id          bigint auto_increment
        primary key,
    gmt_create  datetime(6) null,
    gmt_update  datetime(6) null,
    resource_id bigint      not null,
    role_id     bigint      not null
);

INSERT INTO hertzbeat_template_hub.auth_role_resource_bind (id, gmt_create, gmt_update, resource_id, role_id) VALUES (1, null, null, 1, 2);
INSERT INTO hertzbeat_template_hub.auth_role_resource_bind (id, gmt_create, gmt_update, resource_id, role_id) VALUES (2, null, null, 2, 2);
