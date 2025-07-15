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
CREATE PROCEDURE UpdateAlertDefineType()
BEGIN
    DECLARE table_exists INT;

    -- Check if the table exists
    SELECT COUNT(*) INTO table_exists 
    FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'HZB_ALERT_DEFINE';
    
    IF table_exists = 1 THEN
        -- Update type from 'realtime' to 'realtime_metric'
        UPDATE HZB_ALERT_DEFINE 
        SET type = 'realtime_metric' 
        WHERE type = 'realtime';
        
        -- Update type from 'periodic' to 'periodic_metric'
        UPDATE HZB_ALERT_DEFINE 
        SET type = 'periodic_metric' 
        WHERE type = 'periodic';
    END IF;
END //

DELIMITER ;

CALL UpdateAlertDefineType();
DROP PROCEDURE IF EXISTS UpdateAlertDefineType;
COMMIT;