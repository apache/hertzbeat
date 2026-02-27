-- Licensed to the Apache Software Foundation (ASF) under one
-- or more contributor license agreements.  See the NOTICE file
-- distributed with this work for additional information
-- regarding copyright ownership.  The ASF licenses this file
-- to you under the Apache License, Version 2.0 (the
-- "License"); you may not use this file except in compliance
-- with the License.  You may obtain a copy of the License at
--
--   http://www.apache.org/licenses/LICENSE-2.0
--
-- Unless required by applicable law or agreed to in writing,
-- software distributed under the License is distributed on an
-- "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
-- KIND, either express or implied.  See the License for the
-- specific language governing permissions and limitations
-- under the License.

-- ensure every sql can rerun without error

-- Update type from 'realtime' to 'realtime_metric'
UPDATE HZB_ALERT_DEFINE
SET type = 'realtime_metric'
WHERE type = 'realtime';

-- Update type from 'periodic' to 'periodic_metric'
UPDATE HZB_ALERT_DEFINE
SET type = 'periodic_metric'
WHERE type = 'periodic';

-- Rename host to instance
CREATE ALIAS RENAME_HOST_TO_INSTANCE AS $$
void renameHostToInstance(java.sql.Connection conn) throws java.sql.SQLException {
    boolean instanceExists = false;
    boolean hostExists = false;
    try (java.sql.ResultSet rs = conn.getMetaData().getColumns(null, null, "HZB_MONITOR", "INSTANCE")) {
        if (rs.next()) instanceExists = true;
    }
    try (java.sql.ResultSet rs = conn.getMetaData().getColumns(null, null, "HZB_MONITOR", "HOST")) {
        if (rs.next()) hostExists = true;
    }
    try (java.sql.Statement stmt = conn.createStatement()) {
        if (instanceExists) {
            if (hostExists) {
                stmt.execute("UPDATE HZB_MONITOR SET instance = host WHERE instance IS NULL");
                stmt.execute("ALTER TABLE HZB_MONITOR DROP COLUMN host");
            }
        } else {
            if (hostExists) {
                stmt.execute("ALTER TABLE HZB_MONITOR ALTER COLUMN host RENAME TO instance");
            }
        }
    }
}
$$;
CALL RENAME_HOST_TO_INSTANCE();
DROP ALIAS RENAME_HOST_TO_INSTANCE;

-- Update instance with port
UPDATE HZB_MONITOR m
SET instance = CONCAT(instance, ':', (SELECT param_value FROM HZB_PARAM p WHERE p.monitor_id = m.id AND p.field = 'port'))
WHERE EXISTS (SELECT 1 FROM HZB_PARAM p WHERE p.monitor_id = m.id AND p.field = 'port' AND p.param_value IS NOT NULL AND p.param_value != '')
  AND instance NOT LIKE CONCAT('%:', (SELECT param_value FROM HZB_PARAM p WHERE p.monitor_id = m.id AND p.field = 'port'));

-- Migrate history table
CREATE ALIAS MIGRATE_HISTORY_TABLE AS $$
void migrateHistoryTable(java.sql.Connection conn) throws java.sql.SQLException {
    boolean monitorIdExists = false;
    boolean metricLabelsExists = false;
    try (java.sql.ResultSet rs = conn.getMetaData().getColumns(null, null, "HZB_HISTORY", "MONITOR_ID")) {
        if (rs.next()) monitorIdExists = true;
    }
    try (java.sql.ResultSet rs = conn.getMetaData().getColumns(null, null, "HZB_HISTORY", "METRIC_LABELS")) {
        if (rs.next()) metricLabelsExists = true;
    }

    if (monitorIdExists) {
        try (java.sql.Statement stmt = conn.createStatement()) {
            if (!metricLabelsExists) {
                stmt.execute("ALTER TABLE HZB_HISTORY ALTER COLUMN instance RENAME TO metric_labels");
                stmt.execute("ALTER TABLE HZB_HISTORY ALTER COLUMN metric_labels SET DATA TYPE VARCHAR(5000)");
                stmt.execute("ALTER TABLE HZB_HISTORY ADD COLUMN instance VARCHAR(255)");
            } else {
                stmt.execute("UPDATE HZB_HISTORY SET metric_labels = instance WHERE metric_labels IS NULL");
                stmt.execute("UPDATE HZB_HISTORY SET instance = NULL");
                stmt.execute("ALTER TABLE HZB_HISTORY ALTER COLUMN instance SET DATA TYPE VARCHAR(255)");
            }
            stmt.execute("UPDATE HZB_HISTORY h SET instance = (SELECT m.instance FROM HZB_MONITOR m WHERE m.id = h.monitor_id) WHERE h.monitor_id IS NOT NULL");
            stmt.execute("ALTER TABLE HZB_HISTORY DROP COLUMN monitor_id");
        }
    }
}
$$;
CALL MIGRATE_HISTORY_TABLE();
DROP ALIAS MIGRATE_HISTORY_TABLE;

-- ========================================
-- hzb_alert_define_monitor_bind table
-- ========================================
CREATE ALIAS UPDATE_ALERT_DEFINE_MONITOR_BIND_INDEXES AS $$
void updateAlertDefineMonitorBindIndexes(java.sql.Connection conn) throws java.sql.SQLException {
    boolean tableExists = false;
    try (java.sql.ResultSet rs = conn.getMetaData().getTables(null, null, "HZB_ALERT_DEFINE_MONITOR_BIND", null)) {
        if (rs.next()) tableExists = true;
    }

    if (tableExists) {
        try (java.sql.Statement stmt = conn.createStatement()) {
            // Drop old index if exists
            try (java.sql.ResultSet rs = conn.getMetaData().getIndexInfo(null, null, "HZB_ALERT_DEFINE_MONITOR_BIND", false, false)) {
                while (rs.next()) {
                    String indexName = rs.getString("INDEX_NAME");
                    if ("INDEX_ALERT_DEFINE_MONITOR".equalsIgnoreCase(indexName)) {
                        stmt.execute("DROP INDEX INDEX_ALERT_DEFINE_MONITOR");
                        break;
                    }
                }
            } catch (Exception e) {
                // Index may not exist, continue
            }

            // Create new indexes if not exist
            boolean alertDefineIdIndexExists = false;
            boolean monitorIdIndexExists = false;

            try (java.sql.ResultSet rs = conn.getMetaData().getIndexInfo(null, null, "HZB_ALERT_DEFINE_MONITOR_BIND", false, false)) {
                while (rs.next()) {
                    String indexName = rs.getString("INDEX_NAME");
                    if ("IDX_ALERT_DEFINE_ID".equalsIgnoreCase(indexName)) {
                        alertDefineIdIndexExists = true;
                    }
                    if ("IDX_MONITOR_ID".equalsIgnoreCase(indexName)) {
                        monitorIdIndexExists = true;
                    }
                }
            }

            if (!alertDefineIdIndexExists) {
                stmt.execute("CREATE INDEX IDX_ALERT_DEFINE_ID ON HZB_ALERT_DEFINE_MONITOR_BIND(ALERT_DEFINE_ID)");
            }

            if (!monitorIdIndexExists) {
                stmt.execute("CREATE INDEX IDX_MONITOR_ID ON HZB_ALERT_DEFINE_MONITOR_BIND(MONITOR_ID)");
            }
        }
    }
}
$$;
CALL UPDATE_ALERT_DEFINE_MONITOR_BIND_INDEXES();
DROP ALIAS UPDATE_ALERT_DEFINE_MONITOR_BIND_INDEXES;

-- ========================================
-- hzb_collector_monitor_bind table
-- ========================================
CREATE ALIAS UPDATE_COLLECTOR_MONITOR_BIND_INDEXES AS $$
void updateCollectorMonitorBindIndexes(java.sql.Connection conn) throws java.sql.SQLException {
    boolean tableExists = false;
    try (java.sql.ResultSet rs = conn.getMetaData().getTables(null, null, "HZB_COLLECTOR_MONITOR_BIND", null)) {
        if (rs.next()) tableExists = true;
    }

    if (tableExists) {
        try (java.sql.Statement stmt = conn.createStatement()) {
            // Drop old index if exists
            try (java.sql.ResultSet rs = conn.getMetaData().getIndexInfo(null, null, "HZB_COLLECTOR_MONITOR_BIND", false, false)) {
                while (rs.next()) {
                    String indexName = rs.getString("INDEX_NAME");
                    if ("INDEX_COLLECTOR_MONITOR".equalsIgnoreCase(indexName)) {
                        stmt.execute("DROP INDEX INDEX_COLLECTOR_MONITOR");
                        break;
                    }
                }
            } catch (Exception e) {
                // Index may not exist, continue
            }

            // Create new indexes if not exist
            boolean collectorIndexExists = false;
            boolean monitorIdIndexExists = false;

            try (java.sql.ResultSet rs = conn.getMetaData().getIndexInfo(null, null, "HZB_COLLECTOR_MONITOR_BIND", false, false)) {
                while (rs.next()) {
                    String indexName = rs.getString("INDEX_NAME");
                    if ("IDX_COLLECTOR_MONITOR_COLLECTOR".equalsIgnoreCase(indexName)) {
                        collectorIndexExists = true;
                    }
                    if ("IDX_COLLECTOR_MONITOR_MONITOR_ID".equalsIgnoreCase(indexName)) {
                        monitorIdIndexExists = true;
                    }
                }
            }

            if (!collectorIndexExists) {
                stmt.execute("CREATE INDEX IDX_COLLECTOR_MONITOR_COLLECTOR ON HZB_COLLECTOR_MONITOR_BIND(COLLECTOR)");
            }

            if (!monitorIdIndexExists) {
                stmt.execute("CREATE INDEX IDX_COLLECTOR_MONITOR_MONITOR_ID ON HZB_COLLECTOR_MONITOR_BIND(MONITOR_ID)");
            }
        }
    }
}
$$;
CALL UPDATE_COLLECTOR_MONITOR_BIND_INDEXES();
DROP ALIAS UPDATE_COLLECTOR_MONITOR_BIND_INDEXES;

-- ========================================
-- hzb_monitor table
-- ========================================
CREATE ALIAS UPDATE_MONITOR_INDEXES AS $$
void updateMonitorIndexes(java.sql.Connection conn) throws java.sql.SQLException {
    boolean tableExists = false;
    try (java.sql.ResultSet rs = conn.getMetaData().getTables(null, null, "HZB_MONITOR", null)) {
        if (rs.next()) tableExists = true;
    }

    if (tableExists) {
        try (java.sql.Statement stmt = conn.createStatement()) {
            // Drop old index if exists
            try (java.sql.ResultSet rs = conn.getMetaData().getIndexInfo(null, null, "HZB_MONITOR", false, false)) {
                while (rs.next()) {
                    String indexName = rs.getString("INDEX_NAME");
                    if ("MONITOR_QUERY_INDEX".equalsIgnoreCase(indexName)) {
                        stmt.execute("DROP INDEX MONITOR_QUERY_INDEX");
                        break;
                    }
                }
            } catch (Exception e) {
                // Index may not exist, continue
            }

            // Create new indexes if not exist
            boolean appIndexExists = false;
            boolean instanceIndexExists = false;
            boolean nameIndexExists = false;

            try (java.sql.ResultSet rs = conn.getMetaData().getIndexInfo(null, null, "HZB_MONITOR", false, false)) {
                while (rs.next()) {
                    String indexName = rs.getString("INDEX_NAME");
                    if ("IDX_HZB_MONITOR_APP".equalsIgnoreCase(indexName)) {
                        appIndexExists = true;
                    }
                    if ("IDX_HZB_MONITOR_INSTANCE".equalsIgnoreCase(indexName)) {
                        instanceIndexExists = true;
                    }
                    if ("IDX_HZB_MONITOR_NAME".equalsIgnoreCase(indexName)) {
                        nameIndexExists = true;
                    }
                }
            }

            if (!appIndexExists) {
                stmt.execute("CREATE INDEX IDX_HZB_MONITOR_APP ON HZB_MONITOR(APP)");
            }

            if (!instanceIndexExists) {
                stmt.execute("CREATE INDEX IDX_HZB_MONITOR_INSTANCE ON HZB_MONITOR(INSTANCE)");
            }

            if (!nameIndexExists) {
                stmt.execute("CREATE INDEX IDX_HZB_MONITOR_NAME ON HZB_MONITOR(NAME)");
            }
        }
    }
}
$$;
CALL UPDATE_MONITOR_INDEXES();
DROP ALIAS UPDATE_MONITOR_INDEXES;

-- ========================================
-- hzb_monitor_bind table
-- ========================================
CREATE ALIAS UPDATE_MONITOR_BIND_INDEXES AS $$
void updateMonitorBindIndexes(java.sql.Connection conn) throws java.sql.SQLException {
    boolean tableExists = false;
    try (java.sql.ResultSet rs = conn.getMetaData().getTables(null, null, "HZB_MONITOR_BIND", null)) {
        if (rs.next()) tableExists = true;
    }

    if (tableExists) {
        try (java.sql.Statement stmt = conn.createStatement()) {
            // Create new index if not exist
            boolean bindIndexExists = false;

            try (java.sql.ResultSet rs = conn.getMetaData().getIndexInfo(null, null, "HZB_MONITOR_BIND", false, false)) {
                while (rs.next()) {
                    String indexName = rs.getString("INDEX_NAME");
                    if ("INDEX_MONITOR_BIND".equalsIgnoreCase(indexName)) {
                        bindIndexExists = true;
                    }
                }
            }

            if (!bindIndexExists) {
                stmt.execute("CREATE INDEX INDEX_MONITOR_BIND ON HZB_MONITOR_BIND(BIZ_ID)");
            }
        }
    }
}
$$;
CALL UPDATE_MONITOR_BIND_INDEXES();
DROP ALIAS UPDATE_MONITOR_BIND_INDEXES;

-- ========================================
-- hzb_status_page_incident_component_bind table
-- Special handling: component_id might have auto-created index from FK
-- ========================================
CREATE ALIAS UPDATE_STATUS_PAGE_INCIDENT_COMPONENT_BIND_INDEXES AS $$
void updateStatusPageIncidentComponentBindIndexes(java.sql.Connection conn) throws java.sql.SQLException {
    boolean tableExists = false;
    try (java.sql.ResultSet rs = conn.getMetaData().getTables(null, null, "HZB_STATUS_PAGE_INCIDENT_COMPONENT_BIND", null)) {
        if (rs.next()) tableExists = true;
    }

    if (tableExists) {
        try (java.sql.Statement stmt = conn.createStatement()) {
            // Check if component_id column already has any index
            boolean hasComponentIdIndex = false;
            try (java.sql.ResultSet rs = conn.getMetaData().getIndexInfo(null, null, "HZB_STATUS_PAGE_INCIDENT_COMPONENT_BIND", false, false)) {
                while (rs.next()) {
                    String columnName = rs.getString("COLUMN_NAME");
                    if (columnName != null && "COMPONENT_ID".equalsIgnoreCase(columnName)) {
                        hasComponentIdIndex = true;
                        break;
                    }
                }
            }

            // Create index on component_id only if no index exists on this column
            if (!hasComponentIdIndex) {
                stmt.execute("CREATE INDEX IDX_INCIDENT_COMPONENT_COMPONENT_ID ON HZB_STATUS_PAGE_INCIDENT_COMPONENT_BIND(COMPONENT_ID)");
            }
        }
    }
}
$$;
CALL UPDATE_STATUS_PAGE_INCIDENT_COMPONENT_BIND_INDEXES();
DROP ALIAS UPDATE_STATUS_PAGE_INCIDENT_COMPONENT_BIND_INDEXES;

-- ========================================
-- hzb_push_metrics table
-- ========================================
CREATE ALIAS UPDATE_PUSH_METRICS_INDEXES AS $$
void updatePushMetricsIndexes(java.sql.Connection conn) throws java.sql.SQLException {
    boolean tableExists = false;
    try (java.sql.ResultSet rs = conn.getMetaData().getTables(null, null, "HZB_PUSH_METRICS", null)) {
        if (rs.next()) tableExists = true;
    }

    if (tableExists) {
        try (java.sql.Statement stmt = conn.createStatement()) {
            // Drop old index if exists
            try (java.sql.ResultSet rs = conn.getMetaData().getIndexInfo(null, null, "HZB_PUSH_METRICS", false, false)) {
                while (rs.next()) {
                    String indexName = rs.getString("INDEX_NAME");
                    if ("PUSH_QUERY_INDEX".equalsIgnoreCase(indexName)) {
                        stmt.execute("DROP INDEX PUSH_QUERY_INDEX");
                        break;
                    }
                }
            } catch (Exception e) {
                // Index may not exist, continue
            }

            // Create new indexes if not exist
            boolean monitorIdIndexExists = false;
            boolean timeIndexExists = false;

            try (java.sql.ResultSet rs = conn.getMetaData().getIndexInfo(null, null, "HZB_PUSH_METRICS", false, false)) {
                while (rs.next()) {
                    String indexName = rs.getString("INDEX_NAME");
                    if ("IDX_PUSH_METRICS_MONITOR_ID".equalsIgnoreCase(indexName)) {
                        monitorIdIndexExists = true;
                    }
                    if ("IDX_PUSH_METRICS_TIME".equalsIgnoreCase(indexName)) {
                        timeIndexExists = true;
                    }
                }
            }

            if (!monitorIdIndexExists) {
                stmt.execute("CREATE INDEX IDX_PUSH_METRICS_MONITOR_ID ON HZB_PUSH_METRICS(MONITOR_ID)");
            }

            if (!timeIndexExists) {
                stmt.execute("CREATE INDEX IDX_PUSH_METRICS_TIME ON HZB_PUSH_METRICS(TIME)");
            }
        }
    }
}
$$;
CALL UPDATE_PUSH_METRICS_INDEXES();
DROP ALIAS UPDATE_PUSH_METRICS_INDEXES;

-- ========================================
-- hzb_history table
-- ========================================
CREATE ALIAS UPDATE_HISTORY_INDEXES AS $$
void updateHistoryIndexes(java.sql.Connection conn) throws java.sql.SQLException {
    boolean tableExists = false;
    try (java.sql.ResultSet rs = conn.getMetaData().getTables(null, null, "HZB_HISTORY", null)) {
        if (rs.next()) tableExists = true;
    }

    if (tableExists) {
        try (java.sql.Statement stmt = conn.createStatement()) {
            // Drop old index if exists
            try (java.sql.ResultSet rs = conn.getMetaData().getIndexInfo(null, null, "HZB_HISTORY", false, false)) {
                while (rs.next()) {
                    String indexName = rs.getString("INDEX_NAME");
                    if ("HISTORY_QUERY_INDEX".equalsIgnoreCase(indexName)) {
                        stmt.execute("DROP INDEX HISTORY_QUERY_INDEX");
                        break;
                    }
                }
            } catch (Exception e) {
                // Index may not exist, continue
            }

            // Create new indexes if not exist
            boolean instanceIndexExists = false;
            boolean appIndexExists = false;
            boolean metricsIndexExists = false;
            boolean metricIndexExists = false;

            try (java.sql.ResultSet rs = conn.getMetaData().getIndexInfo(null, null, "HZB_HISTORY", false, false)) {
                while (rs.next()) {
                    String indexName = rs.getString("INDEX_NAME");
                    if ("IDX_HZB_HISTORY_INSTANCE".equalsIgnoreCase(indexName)) {
                        instanceIndexExists = true;
                    }
                    if ("IDX_HZB_HISTORY_APP".equalsIgnoreCase(indexName)) {
                        appIndexExists = true;
                    }
                    if ("IDX_HZB_HISTORY_METRICS".equalsIgnoreCase(indexName)) {
                        metricsIndexExists = true;
                    }
                    if ("IDX_HZB_HISTORY_METRIC".equalsIgnoreCase(indexName)) {
                        metricIndexExists = true;
                    }
                }
            }

            if (!instanceIndexExists) {
                stmt.execute("CREATE INDEX IDX_HZB_HISTORY_INSTANCE ON HZB_HISTORY(INSTANCE)");
            }

            if (!appIndexExists) {
                stmt.execute("CREATE INDEX IDX_HZB_HISTORY_APP ON HZB_HISTORY(APP)");
            }

            if (!metricsIndexExists) {
                stmt.execute("CREATE INDEX IDX_HZB_HISTORY_METRICS ON HZB_HISTORY(METRICS)");
            }

            if (!metricIndexExists) {
                stmt.execute("CREATE INDEX IDX_HZB_HISTORY_METRIC ON HZB_HISTORY(METRIC)");
            }
        }
    }
}
$$;
CALL UPDATE_HISTORY_INDEXES();
DROP ALIAS UPDATE_HISTORY_INDEXES;

-- ========================================
-- hzb_param table
-- ========================================
CREATE ALIAS UPDATE_PARAM_TABLE_INDEXES AS $$
void updateParamTableIndexes(java.sql.Connection conn) throws java.sql.SQLException {
    boolean tableExists = false;
    try (java.sql.ResultSet rs = conn.getMetaData().getTables(null, null, "HZB_PARAM", null)) {
        if (rs.next()) tableExists = true;
    }

    if (tableExists) {
        try (java.sql.Statement stmt = conn.createStatement()) {
            // Drop old index if exists
            try (java.sql.ResultSet rs = conn.getMetaData().getIndexInfo(null, null, "HZB_PARAM", false, false)) {
                while (rs.next()) {
                    String indexName = rs.getString("INDEX_NAME");
                    if ("IDX_HZB_PARAM_MONITOR_ID".equalsIgnoreCase(indexName)) {
                        stmt.execute("DROP INDEX IDX_HZB_PARAM_MONITOR_ID");
                        break;
                    }
                }
            } catch (Exception e) {
                // Index may not exist, continue
            }

            // Create new index if not exist
            boolean indexExists = false;
            try (java.sql.ResultSet rs = conn.getMetaData().getIndexInfo(null, null, "HZB_PARAM", false, false)) {
                while (rs.next()) {
                    if ("IDX_HZB_PARAM_MONITOR_ID".equalsIgnoreCase(rs.getString("INDEX_NAME"))) {
                        indexExists = true;
                        break;
                    }
                }
            }
            if (!indexExists) {
                stmt.execute("CREATE INDEX IDX_HZB_PARAM_MONITOR_ID ON HZB_PARAM(MONITOR_ID)");
            }

            // Drop old unique constraint if exists
            try (java.sql.ResultSet rs = conn.getMetaData().getIndexInfo(null, null, "HZB_PARAM", true, false)) {
                while (rs.next()) {
                    String indexName = rs.getString("INDEX_NAME");
                    if (indexName != null && indexName.equalsIgnoreCase("UK_HZB_PARAM_MONITOR_FIELD")) {
                        stmt.execute("DROP INDEX UK_HZB_PARAM_MONITOR_FIELD");
                        break;
                    }
                }
            } catch (Exception e) {
                // Constraint may not exist, continue
            }

            // Create new unique constraint if not exist
            boolean constraintExists = false;
            try (java.sql.ResultSet rs = conn.getMetaData().getIndexInfo(null, null, "HZB_PARAM", true, false)) {
                while (rs.next()) {
                    String indexName = rs.getString("INDEX_NAME");
                    if (indexName != null && indexName.equalsIgnoreCase("UK_HZB_PARAM_MONITOR_FIELD")) {
                        constraintExists = true;
                        break;
                    }
                }
            }
            if (!constraintExists) {
                stmt.execute("CREATE UNIQUE INDEX UK_HZB_PARAM_MONITOR_FIELD ON HZB_PARAM(MONITOR_ID, FIELD)");
            }
        }
    }
}
$$;
CALL UPDATE_PARAM_TABLE_INDEXES();
DROP ALIAS UPDATE_PARAM_TABLE_INDEXES;

-- ========================================
-- hzb_plugin_param table
-- ========================================
CREATE ALIAS UPDATE_PLUGIN_PARAM_TABLE_INDEXES AS $$
void updatePluginParamTableIndexes(java.sql.Connection conn) throws java.sql.SQLException {
    boolean tableExists = false;
    try (java.sql.ResultSet rs = conn.getMetaData().getTables(null, null, "HZB_PLUGIN_PARAM", null)) {
        if (rs.next()) tableExists = true;
    }

    if (tableExists) {
        try (java.sql.Statement stmt = conn.createStatement()) {
            // Drop old index if exists
            try (java.sql.ResultSet rs = conn.getMetaData().getIndexInfo(null, null, "HZB_PLUGIN_PARAM", false, false)) {
                while (rs.next()) {
                    String indexName = rs.getString("INDEX_NAME");
                    if ("IDX_HZB_PLUGIN_PARAM_PLUGIN_METADATA_ID".equalsIgnoreCase(indexName)) {
                        stmt.execute("DROP INDEX IDX_HZB_PLUGIN_PARAM_PLUGIN_METADATA_ID");
                        break;
                    }
                }
            } catch (Exception e) {
                // Index may not exist, continue
            }

            // Create new index if not exist
            boolean indexExists = false;
            try (java.sql.ResultSet rs = conn.getMetaData().getIndexInfo(null, null, "HZB_PLUGIN_PARAM", false, false)) {
                while (rs.next()) {
                    if ("IDX_HZB_PLUGIN_PARAM_PLUGIN_METADATA_ID".equalsIgnoreCase(rs.getString("INDEX_NAME"))) {
                        indexExists = true;
                        break;
                    }
                }
            }
            if (!indexExists) {
                stmt.execute("CREATE INDEX IDX_HZB_PLUGIN_PARAM_PLUGIN_METADATA_ID ON HZB_PLUGIN_PARAM(PLUGIN_METADATA_ID)");
            }

            // Drop old unique constraint if exists
            try (java.sql.ResultSet rs = conn.getMetaData().getIndexInfo(null, null, "HZB_PLUGIN_PARAM", true, false)) {
                while (rs.next()) {
                    String indexName = rs.getString("INDEX_NAME");
                    if (indexName != null && indexName.equalsIgnoreCase("UK_HZB_PLUGIN_PARAM_METADATA_FIELD")) {
                        stmt.execute("DROP INDEX UK_HZB_PLUGIN_PARAM_METADATA_FIELD");
                        break;
                    }
                }
            } catch (Exception e) {
                // Constraint may not exist, continue
            }

            // Create new unique constraint if not exist
            boolean constraintExists = false;
            try (java.sql.ResultSet rs = conn.getMetaData().getIndexInfo(null, null, "HZB_PLUGIN_PARAM", true, false)) {
                while (rs.next()) {
                    String indexName = rs.getString("INDEX_NAME");
                    if (indexName != null && indexName.equalsIgnoreCase("UK_HZB_PLUGIN_PARAM_METADATA_FIELD")) {
                        constraintExists = true;
                        break;
                    }
                }
            }
            if (!constraintExists) {
                stmt.execute("CREATE UNIQUE INDEX UK_HZB_PLUGIN_PARAM_METADATA_FIELD ON HZB_PLUGIN_PARAM(PLUGIN_METADATA_ID, FIELD)");
            }
        }
    }
}
$$;
CALL UPDATE_PLUGIN_PARAM_TABLE_INDEXES();
DROP ALIAS UPDATE_PLUGIN_PARAM_TABLE_INDEXES;
