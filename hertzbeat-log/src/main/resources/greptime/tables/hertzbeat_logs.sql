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

-- Schema must stay in sync with the transform section of
-- greptime/pipelines/hertzbeat_otlp_log_v1.yaml, which GreptimeDB would
-- otherwise use to auto-create this table on first ingestion.
CREATE TABLE IF NOT EXISTS hertzbeat_logs (
  "time_unix_nano" TIMESTAMP(9) TIME INDEX,
  "observed_time_unix_nano" TIMESTAMP(9) NULL,
  "trace_id" STRING NULL SKIPPING INDEX WITH(granularity = '10240', type = 'BLOOM'),
  "span_id" STRING NULL SKIPPING INDEX WITH(granularity = '10240', type = 'BLOOM'),
  "trace_flags" INT NULL,
  "severity_text" STRING NULL,
  "severity_number" INT NULL,
  "body" STRING NULL,
  "attributes" JSON NULL,
  "resource" JSON NULL,
  "instrumentation_scope" JSON NULL,
  "dropped_attributes_count" INT NULL
) WITH ('append_mode' = 'true');
