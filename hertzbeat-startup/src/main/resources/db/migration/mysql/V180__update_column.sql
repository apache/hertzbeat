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

-- Update hzb_alert_define table type column to support log monitoring
DELIMITER //
CREATE PROCEDURE UpdateAlertDefineColumns()
BEGIN
    DECLARE table_exists INT;

SELECT COUNT(*) INTO table_exists
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hzb_alert_define';

IF table_exists = 1 THEN
UPDATE hzb_alert_define
SET type = 'realtime_metric'
WHERE type = 'realtime';

UPDATE hzb_alert_define
SET type = 'periodic_metric'
WHERE type = 'periodic';
END IF;
END //
DELIMITER ;

CALL UpdateAlertDefineColumns();
DROP PROCEDURE IF EXISTS UpdateAlertDefineColumns;

-- Rename host to instance
DELIMITER //
CREATE PROCEDURE RenameHostToInstance()
BEGIN
    DECLARE instance_exists INT;
    DECLARE host_exists INT;
    SELECT COUNT(*) INTO instance_exists FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hzb_monitor' AND COLUMN_NAME = 'instance';
    SELECT COUNT(*) INTO host_exists FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hzb_monitor' AND COLUMN_NAME = 'host';
    IF instance_exists > 0 THEN
        IF host_exists > 0 THEN
            SET @sql_update = 'UPDATE hzb_monitor SET instance = host WHERE instance IS NULL';
            PREPARE stmt_update FROM @sql_update;
            EXECUTE stmt_update;
            DEALLOCATE PREPARE stmt_update;

            SET @sql_drop = 'ALTER TABLE hzb_monitor DROP COLUMN host';
            PREPARE stmt_drop FROM @sql_drop;
            EXECUTE stmt_drop;
            DEALLOCATE PREPARE stmt_drop;
        END IF;
    ELSE
        IF host_exists > 0 THEN
            SET @sql_change = 'ALTER TABLE hzb_monitor CHANGE host instance VARCHAR(100)';
            PREPARE stmt_change FROM @sql_change;
            EXECUTE stmt_change;
            DEALLOCATE PREPARE stmt_change;
        END IF;
    END IF;
END //
DELIMITER ;
CALL RenameHostToInstance();
DROP PROCEDURE IF EXISTS RenameHostToInstance;

-- Update instance with port
UPDATE hzb_monitor m
INNER JOIN hzb_param p ON m.id = p.monitor_id AND p.field = 'port'
SET m.instance = CONCAT(m.instance, ':', p.param_value)
WHERE m.instance IS NOT NULL AND p.param_value IS NOT NULL AND p.param_value != ''
  AND m.instance NOT LIKE CONCAT('%:', p.param_value);

-- Migrate history table
DELIMITER //
CREATE PROCEDURE MigrateHistoryTable()
BEGIN
    DECLARE monitor_id_exists INT;
    DECLARE metric_labels_exists INT;

    SELECT COUNT(*) INTO monitor_id_exists FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hzb_history' AND COLUMN_NAME = 'monitor_id';
    SELECT COUNT(*) INTO metric_labels_exists FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hzb_history' AND COLUMN_NAME = 'metric_labels';
    
    IF monitor_id_exists > 0 THEN
        IF metric_labels_exists = 0 THEN
            SET @sql_rename = 'ALTER TABLE hzb_history CHANGE instance metric_labels VARCHAR(5000)';
            PREPARE stmt_rename FROM @sql_rename;
            EXECUTE stmt_rename;
            DEALLOCATE PREPARE stmt_rename;

            SET @sql_add = 'ALTER TABLE hzb_history ADD COLUMN instance VARCHAR(255)';
            PREPARE stmt_add FROM @sql_add;
            EXECUTE stmt_add;
            DEALLOCATE PREPARE stmt_add;
        ELSE
            UPDATE hzb_history SET metric_labels = instance WHERE metric_labels IS NULL;
            UPDATE hzb_history SET instance = NULL;
            SET @sql_resize = 'ALTER TABLE hzb_history MODIFY COLUMN instance VARCHAR(255)';
            PREPARE stmt_resize FROM @sql_resize;
            EXECUTE stmt_resize;
            DEALLOCATE PREPARE stmt_resize;
        END IF;
        
        UPDATE hzb_history h JOIN hzb_monitor m ON h.monitor_id = m.id SET h.instance = m.instance;
        
        SET @sql_drop = 'ALTER TABLE hzb_history DROP COLUMN monitor_id';
        PREPARE stmt_drop FROM @sql_drop;
        EXECUTE stmt_drop;
        DEALLOCATE PREPARE stmt_drop;
    END IF;
END //
DELIMITER ;
CALL MigrateHistoryTable();
DROP PROCEDURE IF EXISTS MigrateHistoryTable;

COMMIT;
