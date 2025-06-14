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

-- Modify hzb_alert_group table columns to TEXT type to resolve MySQL row size limit issue

DELIMITER //
CREATE PROCEDURE ModifyGroupAlertColumns()
BEGIN
    DECLARE table_exists INT;
    DECLARE col_exists INT;

    -- Check if the table exists
    SELECT COUNT(*) INTO table_exists 
    FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'HZB_ALERT_GROUP';
    
    IF table_exists = 1 THEN
        -- Check and modify common_annotations column to TEXT
        SELECT COUNT(*) INTO col_exists 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'HZB_ALERT_GROUP' 
        AND COLUMN_NAME = 'common_annotations'
        AND DATA_TYPE != 'text';
        
        IF col_exists = 1 THEN
            ALTER TABLE HZB_ALERT_GROUP MODIFY COLUMN common_annotations TEXT;
        END IF;
        
        -- Check and modify alert_fingerprints column to TEXT
        SELECT COUNT(*) INTO col_exists 
        FROM INFORMATION_SCHEMA.COLUMNS 
        WHERE TABLE_SCHEMA = DATABASE() 
        AND TABLE_NAME = 'HZB_ALERT_GROUP' 
        AND COLUMN_NAME = 'alert_fingerprints'
        AND DATA_TYPE != 'text';
        
        IF col_exists = 1 THEN
            ALTER TABLE HZB_ALERT_GROUP MODIFY COLUMN alert_fingerprints TEXT;
        END IF;
    END IF;
END //

DELIMITER ;

CALL ModifyGroupAlertColumns();
DROP PROCEDURE IF EXISTS ModifyGroupAlertColumns;
COMMIT;