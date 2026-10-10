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

CREATE TABLE IF NOT EXISTS hertzbeat_apm_red_1m (
  time_window TIMESTAMP(9) TIME INDEX,
  service_name STRING,
  operation STRING,
  span_kind STRING,
  workspace_id STRING NULL,
  entity_id STRING NULL,
  entity_type STRING NULL,
  deployment_environment STRING NULL,
  service_namespace STRING NULL,
  calls_total BIGINT,
  error_total BIGINT,
  duration_sum_nano BIGINT,
  duration_count BIGINT,
  duration_sketch BINARY,
  PRIMARY KEY(service_name, operation, span_kind, workspace_id, entity_id, entity_type, deployment_environment, service_namespace)
);

CREATE FLOW IF NOT EXISTS hertzbeat_apm_red_1m_flow
SINK TO hertzbeat_apm_red_1m
EXPIRE AFTER '6 hours'::INTERVAL
AS SELECT
  date_bin('1 minute'::INTERVAL, "timestamp") AS time_window,
  COALESCE(NULLIF(service_name, ''), 'unknown_service') AS service_name,
  COALESCE(NULLIF(span_name, ''), 'unknown_operation') AS operation,
  CASE
    WHEN span_kind IN ('SPAN_KIND_SERVER', 'SERVER') THEN 'SERVER'
    WHEN span_kind IN ('SPAN_KIND_CONSUMER', 'CONSUMER') THEN 'CONSUMER'
    ELSE 'UNKNOWN'
  END AS span_kind,
  "resource_attributes.hertzbeat.workspace_id" AS workspace_id,
  "resource_attributes.hertzbeat.entity_id" AS entity_id,
  "resource_attributes.hertzbeat.entity_type" AS entity_type,
  "resource_attributes.deployment.environment.name" AS deployment_environment,
  "resource_attributes.service.namespace" AS service_namespace,
  COUNT(*) AS calls_total,
  SUM(CASE WHEN span_status_code IN ('STATUS_CODE_ERROR', 'ERROR') THEN 1 ELSE 0 END) AS error_total,
  COALESCE(SUM(duration_nano), 0) AS duration_sum_nano,
  COUNT(duration_nano) AS duration_count,
  uddsketch_state(128, 0.01, duration_nano) AS duration_sketch
FROM hzb_traces
WHERE span_kind IN ('SPAN_KIND_SERVER', 'SERVER', 'SPAN_KIND_CONSUMER', 'CONSUMER')
GROUP BY time_window, service_name, operation, span_kind, workspace_id, entity_id, entity_type, deployment_environment, service_namespace;
