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

-- Current V201 baseline; shared MySQL compatibility-mode schema.
-- Shared MySQL baseline SHA-256: 5881f81d8cfaa6fbee02a253d05afad944caddad95924ef3bc4ddfcacf0d7a7a

RUNSCRIPT FROM 'classpath:db/migration/mysql/B201__current_schema.sql';

-- MySQL LONGTEXT/TEXT aliases are VARCHAR in H2; preserve the mapped LOB types.
ALTER TABLE hzb_ai_message ALTER COLUMN content CLOB;
ALTER TABLE hzb_define ALTER COLUMN content CLOB;
ALTER TABLE hzb_notice_template ALTER COLUMN content CLOB;
ALTER TABLE hzb_collector ALTER COLUMN runtime_config CLOB;
ALTER TABLE hzb_collector ALTER COLUMN instrumentation_intake CLOB;
ALTER TABLE hzb_monitor_metric_layout ALTER COLUMN layout_document CLOB;
ALTER TABLE hzb_signal_dashboard_panel_draft ALTER COLUMN query_snapshot CLOB;
ALTER TABLE hzb_signal_dashboard_panel_draft ALTER COLUMN payload CLOB;
ALTER TABLE hzb_entity_identity ALTER COLUMN primary_identity BOOLEAN;
ALTER TABLE hzb_sop_schedule ALTER COLUMN enabled BOOLEAN;
