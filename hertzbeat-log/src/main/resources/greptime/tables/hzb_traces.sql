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

CREATE TABLE IF NOT EXISTS hzb_traces (
  "timestamp" TIMESTAMP(9) TIME INDEX,
  "timestamp_end" TIMESTAMP(9) NULL,
  "duration_nano" BIGINT UNSIGNED NULL,
  "trace_id" STRING NULL SKIPPING INDEX WITH(granularity = '10240', type = 'BLOOM'),
  "span_id" STRING NULL SKIPPING INDEX WITH(granularity = '10240', type = 'BLOOM'),
  "parent_span_id" STRING NULL SKIPPING INDEX WITH(granularity = '10240', type = 'BLOOM'),
  "span_kind" STRING NULL,
  "span_name" STRING NULL,
  "span_status_code" STRING NULL,
  "span_status_message" STRING NULL,
  "trace_state" STRING NULL,
  "scope_name" STRING NULL,
  "scope_version" STRING NULL,
  "service_name" STRING NULL SKIPPING INDEX WITH(granularity = '10240', type = 'BLOOM'),
  "resource_attributes.service.namespace" STRING NULL,
  "resource_attributes.deployment.environment.name" STRING NULL,
  "resource_attributes" JSON NULL,
  "span_attributes" JSON NULL,
  "span_events" JSON NULL,
  "span_links" JSON NULL,
  PRIMARY KEY("service_name")
) WITH ('append_mode' = 'true', 'table_data_model' = 'greptime_trace_v1');
