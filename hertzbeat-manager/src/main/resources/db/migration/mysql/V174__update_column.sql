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

-- Create hzb_metrics_favorite table for MySQL

DELIMITER //
CREATE PROCEDURE CreateMetricsFavoriteTable()
BEGIN
    DECLARE table_exists INT;

    -- Check if the table exists
    SELECT COUNT(*) INTO table_exists 
    FROM INFORMATION_SCHEMA.TABLES 
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hzb_metrics_favorite';
    
    IF table_exists = 0 THEN
        CREATE TABLE hzb_metrics_favorite
        (
            id          BIGINT AUTO_INCREMENT PRIMARY KEY,
            monitor_id  BIGINT NOT NULL,
            metrics_name VARCHAR(255) NOT NULL,
            creator VARCHAR(255) NOT NULL,
            create_time DATETIME(6) DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
        
        -- Create unique index for hzb_metrics_favorite table
        CREATE UNIQUE INDEX uk_monitor_metrics ON hzb_metrics_favorite (creator, monitor_id, metrics_name);
    END IF;
END //

DELIMITER ;

CALL CreateMetricsFavoriteTable();
DROP PROCEDURE IF EXISTS CreateMetricsFavoriteTable;
COMMIT;