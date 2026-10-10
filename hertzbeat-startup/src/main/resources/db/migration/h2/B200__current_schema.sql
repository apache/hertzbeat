-- Licensed to the Apache Software Foundation (ASF) under one or more
-- contributor license agreements.  See the NOTICE file distributed with
-- this work for additional information regarding copyright ownership.
-- The ASF licenses this file to You under the Apache License, Version 2.0
-- (the "License"); you may not use this file except in compliance with
-- the License.  You may obtain a copy of the License at
--
--     http://www.apache.org/licenses/LICENSE-2.0
--
-- Unless required by applicable law or agreed to in writing, software
-- distributed under the License is distributed on an "AS IS" BASIS,
-- WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
-- See the License for the specific language governing permissions and
-- limitations under the License.

--
-- Current V200 schema baseline for provisioning an empty embedded H2 store.
-- H2 runs in MySQL compatibility mode, so keep the shared current-schema
-- definition executable rather than maintaining a third divergent snapshot.
-- Shared MySQL baseline SHA-256: e1ac255c10a573b5530ec1c14c7765bbb14473090bf8c08322fe935c5b169669

RUNSCRIPT FROM 'classpath:db/migration/mysql/B200__current_schema.sql';
