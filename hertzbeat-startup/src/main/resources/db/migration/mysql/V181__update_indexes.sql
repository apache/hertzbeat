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
-- "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
-- or implied.  See the License for the specific language
-- governing permissions and limitations
-- under the License.

-- Ensure every SQL can rerun without error
-- This migration updates indexes to match the entity annotations

-- ========================================
-- hzb_alert_define_monitor_bind table
-- ========================================
DELIMITER //
CREATE PROCEDURE UpdateAlertDefineMonitorBindIndexes()
BEGIN
    DECLARE table_exists INT;

    SELECT COUNT(*) INTO table_exists
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hzb_alert_define_monitor_bind';

    IF table_exists = 1 THEN
        -- Drop old index if exists
        IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
                  WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'hzb_alert_define_monitor_bind'
                  AND INDEX_NAME = 'index_alert_define_monitor') THEN
            SET @drop_sql = 'DROP INDEX index_alert_define_monitor ON hzb_alert_define_monitor_bind';
            PREPARE stmt FROM @drop_sql;
            EXECUTE stmt;
            DEALLOCATE PREPARE stmt;
        END IF;

        -- Create new indexes if not exist
        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
                      WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'hzb_alert_define_monitor_bind'
                      AND INDEX_NAME = 'idx_alert_define_id') THEN
            CREATE INDEX idx_alert_define_id ON hzb_alert_define_monitor_bind(alert_define_id);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
                      WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'hzb_alert_define_monitor_bind'
                      AND INDEX_NAME = 'idx_monitor_id') THEN
            CREATE INDEX idx_monitor_id ON hzb_alert_define_monitor_bind(monitor_id);
        END IF;
    END IF;
END //
DELIMITER ;

CALL UpdateAlertDefineMonitorBindIndexes();
DROP PROCEDURE IF EXISTS UpdateAlertDefineMonitorBindIndexes;

-- ========================================
-- hzb_collector_monitor_bind table
-- ========================================
DELIMITER //
CREATE PROCEDURE UpdateCollectorMonitorBindIndexes()
BEGIN
    DECLARE table_exists INT;

    SELECT COUNT(*) INTO table_exists
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hzb_collector_monitor_bind';

    IF table_exists = 1 THEN
        -- Drop old index if exists
        IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
                  WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'hzb_collector_monitor_bind'
                  AND INDEX_NAME = 'index_collector_monitor') THEN
            SET @drop_sql = 'DROP INDEX index_collector_monitor ON hzb_collector_monitor_bind';
            PREPARE stmt FROM @drop_sql;
            EXECUTE stmt;
            DEALLOCATE PREPARE stmt;
        END IF;

        -- Create new indexes if not exist
        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
                      WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'hzb_collector_monitor_bind'
                      AND INDEX_NAME = 'idx_collector_monitor_collector') THEN
            CREATE INDEX idx_collector_monitor_collector ON hzb_collector_monitor_bind(collector);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
                      WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'hzb_collector_monitor_bind'
                      AND INDEX_NAME = 'idx_collector_monitor_monitor_id') THEN
            CREATE INDEX idx_collector_monitor_monitor_id ON hzb_collector_monitor_bind(monitor_id);
        END IF;
    END IF;
END //
DELIMITER ;

CALL UpdateCollectorMonitorBindIndexes();
DROP PROCEDURE IF EXISTS UpdateCollectorMonitorBindIndexes;

-- ========================================
-- hzb_monitor table
-- ========================================
DELIMITER //
CREATE PROCEDURE UpdateMonitorIndexes()
BEGIN
    DECLARE table_exists INT;

    SELECT COUNT(*) INTO table_exists
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hzb_monitor';

    IF table_exists = 1 THEN
        -- Drop old index if exists
        IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
                  WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'hzb_monitor'
                  AND INDEX_NAME = 'monitor_query_index') THEN
            SET @drop_sql = 'DROP INDEX monitor_query_index ON hzb_monitor';
            PREPARE stmt FROM @drop_sql;
            EXECUTE stmt;
            DEALLOCATE PREPARE stmt;
        END IF;

        -- Create new indexes if not exist
        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
                      WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'hzb_monitor'
                      AND INDEX_NAME = 'idx_hzb_monitor_app') THEN
            CREATE INDEX idx_hzb_monitor_app ON hzb_monitor(app);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
                      WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'hzb_monitor'
                      AND INDEX_NAME = 'idx_hzb_monitor_instance') THEN
            CREATE INDEX idx_hzb_monitor_instance ON hzb_monitor(instance);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
                      WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'hzb_monitor'
                      AND INDEX_NAME = 'idx_hzb_monitor_name') THEN
            CREATE INDEX idx_hzb_monitor_name ON hzb_monitor(name);
        END IF;
    END IF;
END //
DELIMITER ;

CALL UpdateMonitorIndexes();
DROP PROCEDURE IF EXISTS UpdateMonitorIndexes;

-- ========================================
-- hzb_monitor_bind table
-- ========================================
DELIMITER //
CREATE PROCEDURE UpdateMonitorBindIndexes()
BEGIN
    DECLARE table_exists INT;

    SELECT COUNT(*) INTO table_exists
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hzb_monitor_bind';

    IF table_exists = 1 THEN
        -- Create new index if not exist
        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
                      WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'hzb_monitor_bind'
                      AND INDEX_NAME = 'index_monitor_bind') THEN
            CREATE INDEX index_monitor_bind ON hzb_monitor_bind(biz_id);
        END IF;
    END IF;
END //
DELIMITER ;

CALL UpdateMonitorBindIndexes();
DROP PROCEDURE IF EXISTS UpdateMonitorBindIndexes;

-- ========================================
-- hzb_status_page_incident_component_bind table
-- Special handling: component_id might have auto-created index from FK
-- ========================================
DELIMITER //
CREATE PROCEDURE UpdateStatusPageIncidentComponentBindIndexes()
BEGIN
    DECLARE table_exists INT;
    DECLARE component_id_has_index INT;

    SELECT COUNT(*) INTO table_exists
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hzb_status_page_incident_component_bind';

    IF table_exists = 1 THEN
        -- Check if component_id column already has any index (including auto-created by FK)
        SELECT COUNT(*) INTO component_id_has_index
        FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'hzb_status_page_incident_component_bind'
        AND COLUMN_NAME = 'component_id'
        AND INDEX_NAME != 'PRIMARY';

        -- Create index on component_id only if no index exists on this column
        IF component_id_has_index = 0 THEN
            CREATE INDEX idx_incident_component_component_id ON hzb_status_page_incident_component_bind(component_id);
        END IF;
    END IF;
END //
DELIMITER ;

CALL UpdateStatusPageIncidentComponentBindIndexes();
DROP PROCEDURE IF EXISTS UpdateStatusPageIncidentComponentBindIndexes;

-- ========================================
-- hzb_push_metrics table
-- ========================================
DELIMITER //
CREATE PROCEDURE UpdatePushMetricsIndexes()
BEGIN
    DECLARE table_exists INT;

    SELECT COUNT(*) INTO table_exists
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hzb_push_metrics';

    IF table_exists = 1 THEN
        -- Drop old index if exists
        IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
                  WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'hzb_push_metrics'
                  AND INDEX_NAME = 'push_query_index') THEN
            SET @drop_sql = 'DROP INDEX push_query_index ON hzb_push_metrics';
            PREPARE stmt FROM @drop_sql;
            EXECUTE stmt;
            DEALLOCATE PREPARE stmt;
        END IF;

        -- Create new indexes if not exist
        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
                      WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'hzb_push_metrics'
                      AND INDEX_NAME = 'idx_push_metrics_monitor_id') THEN
            CREATE INDEX idx_push_metrics_monitor_id ON hzb_push_metrics(monitor_id);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
                      WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'hzb_push_metrics'
                      AND INDEX_NAME = 'idx_push_metrics_time') THEN
            CREATE INDEX idx_push_metrics_time ON hzb_push_metrics(time);
        END IF;
    END IF;
END //
DELIMITER ;

CALL UpdatePushMetricsIndexes();
DROP PROCEDURE IF EXISTS UpdatePushMetricsIndexes;

-- ========================================
-- hzb_history table
-- ========================================
DELIMITER //
CREATE PROCEDURE UpdateHistoryIndexes()
BEGIN
    DECLARE table_exists INT;

    SELECT COUNT(*) INTO table_exists
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hzb_history';

    IF table_exists = 1 THEN
        -- Drop old index if exists
        IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
                  WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'hzb_history'
                  AND INDEX_NAME = 'history_query_index') THEN
            SET @drop_sql = 'DROP INDEX history_query_index ON hzb_history';
            PREPARE stmt FROM @drop_sql;
            EXECUTE stmt;
            DEALLOCATE PREPARE stmt;
        END IF;

        -- Create new indexes if not exist
        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
                      WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'hzb_history'
                      AND INDEX_NAME = 'idx_hzb_history_instance') THEN
            CREATE INDEX idx_hzb_history_instance ON hzb_history(instance);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
                      WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'hzb_history'
                      AND INDEX_NAME = 'idx_hzb_history_app') THEN
            CREATE INDEX idx_hzb_history_app ON hzb_history(app);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
                      WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'hzb_history'
                      AND INDEX_NAME = 'idx_hzb_history_metrics') THEN
            CREATE INDEX idx_hzb_history_metrics ON hzb_history(metrics);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
                      WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'hzb_history'
                      AND INDEX_NAME = 'idx_hzb_history_metric') THEN
            CREATE INDEX idx_hzb_history_metric ON hzb_history(metric);
        END IF;
    END IF;
END //
DELIMITER ;

CALL UpdateHistoryIndexes();
DROP PROCEDURE IF EXISTS UpdateHistoryIndexes;

-- ========================================
-- hzb_param table
-- ========================================
DELIMITER //
CREATE PROCEDURE UpdateParamTableIndexes()
BEGIN
    DECLARE table_exists INT;

    SELECT COUNT(*) INTO table_exists
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hzb_param';

    IF table_exists = 1 THEN
        -- Drop old index if exists
        IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
                  WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'hzb_param'
                  AND INDEX_NAME = 'idx_hzb_param_monitor_id') THEN
            SET @drop_sql = 'DROP INDEX idx_hzb_param_monitor_id ON hzb_param';
            PREPARE stmt FROM @drop_sql;
            EXECUTE stmt;
            DEALLOCATE PREPARE stmt;
        END IF;

        -- Create new index if not exist
        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
                      WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'hzb_param'
                      AND INDEX_NAME = 'idx_hzb_param_monitor_id') THEN
            CREATE INDEX idx_hzb_param_monitor_id ON hzb_param(monitor_id);
        END IF;

        -- Drop old unique constraint if exists
        IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
                  WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'hzb_param'
                  AND CONSTRAINT_TYPE = 'UNIQUE'
                  AND CONSTRAINT_NAME = 'uk_hzb_param_monitor_field') THEN
            SET @drop_sql = 'ALTER TABLE hzb_param DROP INDEX uk_hzb_param_monitor_field';
            PREPARE stmt FROM @drop_sql;
            EXECUTE stmt;
            DEALLOCATE PREPARE stmt;
        END IF;

        -- Create new unique constraint if not exist
        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
                      WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'hzb_param'
                      AND CONSTRAINT_TYPE = 'UNIQUE'
                      AND CONSTRAINT_NAME = 'uk_hzb_param_monitor_field') THEN
            ALTER TABLE hzb_param
            ADD CONSTRAINT uk_hzb_param_monitor_field
            UNIQUE (monitor_id, field);
        END IF;
    END IF;
END //
DELIMITER ;

CALL UpdateParamTableIndexes();
DROP PROCEDURE IF EXISTS UpdateParamTableIndexes;

-- ========================================
-- hzb_plugin_param table
-- ========================================
DELIMITER //
CREATE PROCEDURE UpdatePluginParamTableIndexes()
BEGIN
    DECLARE table_exists INT;

    SELECT COUNT(*) INTO table_exists
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hzb_plugin_param';

    IF table_exists = 1 THEN
        -- Drop old index if exists
        IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
                  WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'hzb_plugin_param'
                  AND INDEX_NAME = 'idx_hzb_plugin_param_plugin_metadata_id') THEN
            SET @drop_sql = 'DROP INDEX idx_hzb_plugin_param_plugin_metadata_id ON hzb_plugin_param';
            PREPARE stmt FROM @drop_sql;
            EXECUTE stmt;
            DEALLOCATE PREPARE stmt;
        END IF;

        -- Create new index if not exist
        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.STATISTICS
                      WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'hzb_plugin_param'
                      AND INDEX_NAME = 'idx_hzb_plugin_param_plugin_metadata_id') THEN
            CREATE INDEX idx_hzb_plugin_param_plugin_metadata_id ON hzb_plugin_param(plugin_metadata_id);
        END IF;

        -- Drop old unique constraint if exists
        IF EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
                  WHERE TABLE_SCHEMA = DATABASE()
                  AND TABLE_NAME = 'hzb_plugin_param'
                  AND CONSTRAINT_TYPE = 'UNIQUE'
                  AND CONSTRAINT_NAME = 'uk_hzb_plugin_param_metadata_field') THEN
            SET @drop_sql = 'ALTER TABLE hzb_plugin_param DROP INDEX uk_hzb_plugin_param_metadata_field';
            PREPARE stmt FROM @drop_sql;
            EXECUTE stmt;
            DEALLOCATE PREPARE stmt;
        END IF;

        -- Create new unique constraint if not exist
        IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS
                      WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'hzb_plugin_param'
                      AND CONSTRAINT_TYPE = 'UNIQUE'
                      AND CONSTRAINT_NAME = 'uk_hzb_plugin_param_metadata_field') THEN
            ALTER TABLE hzb_plugin_param
            ADD CONSTRAINT uk_hzb_plugin_param_metadata_field
            UNIQUE (plugin_metadata_id, field);
        END IF;
    END IF;
END //
DELIMITER ;

CALL UpdatePluginParamTableIndexes();
DROP PROCEDURE IF EXISTS UpdatePluginParamTableIndexes;

COMMIT;
