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

-- Update hzb_alert_define table type column to support log monitoring and modify annotations/query_expr columns

DELIMITER //
CREATE PROCEDURE UpdateAlertDefineColumns()
BEGIN
        DECLARE table_exists INT;
    DECLARE column_exists INT;

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
        
        ALTER TABLE hzb_alert_define 
        MODIFY COLUMN annotations VARCHAR(2048);
        
        SELECT COUNT(*) INTO column_exists 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hzb_alert_define' AND COLUMN_NAME = 'query_expr';
        
        IF column_exists = 0 THEN
            ALTER TABLE hzb_alert_define 
            ADD COLUMN query_expr VARCHAR(2048);
        END IF;
    END IF;
END //

DELIMITER ;

CALL UpdateAlertDefineColumns();
DROP PROCEDURE IF EXISTS UpdateAlertDefineColumns;
COMMIT;