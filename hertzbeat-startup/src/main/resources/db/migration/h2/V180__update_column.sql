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
WHERE EXISTS (SELECT 1 FROM HZB_PARAM p WHERE p.monitor_id = m.id AND p.field = 'port' AND p.param_value IS NOT NULL AND p.param_value != '');

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
