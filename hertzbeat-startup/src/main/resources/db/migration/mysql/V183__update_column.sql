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

-- Enlarge alert define expr to fit rules binding many monitors (#4171)
DELIMITER //

CREATE PROCEDURE ModifyAlertDefineExprColumn()
BEGIN
    DECLARE table_exists INT;
    DECLARE col_exists INT;

    SELECT COUNT(*) INTO table_exists
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hzb_alert_define';

    IF table_exists = 1 THEN
        SELECT COUNT(*) INTO col_exists
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
        AND TABLE_NAME = 'hzb_alert_define'
        AND COLUMN_NAME = 'expr'
        AND DATA_TYPE != 'longtext';

        IF col_exists = 1 THEN
            ALTER TABLE hzb_alert_define MODIFY COLUMN expr LONGTEXT;
        END IF;
    END IF;
END //

DELIMITER ;

CALL ModifyAlertDefineExprColumn();

DROP PROCEDURE IF EXISTS ModifyAlertDefineExprColumn;

COMMIT;
