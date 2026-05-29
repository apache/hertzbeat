CREATE TABLE IF NOT EXISTS hertzbeat_apm_red_1m (
  time_window TIMESTAMP(9) TIME INDEX,
  service_name STRING,
  operation STRING,
  span_kind STRING,
  workspace_id STRING NULL,
  entity_id STRING NULL,
  deployment_environment STRING NULL,
  service_namespace STRING NULL,
  calls_total BIGINT,
  error_total BIGINT,
  duration_sum_nano BIGINT,
  duration_count BIGINT,
  duration_sketch BINARY,
  PRIMARY KEY(service_name, operation, span_kind, workspace_id, entity_id, deployment_environment, service_namespace)
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
  json_get_string(resource_attributes, '$["hertzbeat.workspace_id"]') AS workspace_id,
  json_get_string(resource_attributes, '$["hertzbeat.entity_id"]') AS entity_id,
  json_get_string(resource_attributes, '$["deployment.environment.name"]') AS deployment_environment,
  json_get_string(resource_attributes, '$["service.namespace"]') AS service_namespace,
  COUNT(*) AS calls_total,
  SUM(CASE WHEN span_status_code IN ('STATUS_CODE_ERROR', 'ERROR') THEN 1 ELSE 0 END) AS error_total,
  COALESCE(SUM(duration_nano), 0) AS duration_sum_nano,
  COUNT(duration_nano) AS duration_count,
  uddsketch_state(128, 0.01, duration_nano) AS duration_sketch
FROM hzb_traces
WHERE span_kind IN ('SPAN_KIND_SERVER', 'SERVER', 'SPAN_KIND_CONSUMER', 'CONSUMER')
GROUP BY time_window, service_name, operation, span_kind, workspace_id, entity_id, deployment_environment, service_namespace;
