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

-- Add 'define_id' if it doesn't exist, compatible with MySQL 5.x

DELIMITER //
CREATE PROCEDURE AddDefineIdColumnIfNotExists()
BEGIN
    DECLARE col_exists INT DEFAULT 0;
    SELECT COUNT(*) INTO col_exists
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'HZB_ALERT_SINGLE'
        AND COLUMN_NAME = 'define_id';
    IF col_exists = 0 THEN
        ALTER TABLE HZB_ALERT_SINGLE ADD COLUMN define_id BIGINT;
    END IF;
END //
DELIMITER ;

CALL AddDefineIdColumnIfNotExists();
DROP PROCEDURE IF EXISTS AddDefineIdColumnIfNotExists;
COMMIT;