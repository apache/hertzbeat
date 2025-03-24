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

-- add repair table sql
REPAIR TABLE HZB_ALERT_DEFINE;

DELIMITER //
CREATE PROCEDURE AddOrDropColumns()
BEGIN
    DECLARE col_exists INT;

    -- Drop 'app' column if it exists
SELECT COUNT(*) INTO col_exists FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='HZB_ALERT_DEFINE' AND COLUMN_NAME='app';
IF col_exists = 1 THEN
ALTER TABLE HZB_ALERT_DEFINE DROP COLUMN app;
END IF;

    -- Drop 'metric' column if it exists
SELECT COUNT(*) INTO col_exists FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='HZB_ALERT_DEFINE' AND COLUMN_NAME='metric';
IF col_exists = 1 THEN
ALTER TABLE HZB_ALERT_DEFINE DROP COLUMN metric;
END IF;

    -- Drop 'field' column if it exists
SELECT COUNT(*) INTO col_exists FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='HZB_ALERT_DEFINE' AND COLUMN_NAME='field';
IF col_exists = 1 THEN
ALTER TABLE HZB_ALERT_DEFINE DROP COLUMN field;
END IF;

    -- Drop 'preset' column if it exists
SELECT COUNT(*) INTO col_exists FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='HZB_ALERT_DEFINE' AND COLUMN_NAME='preset';
IF col_exists = 1 THEN
ALTER TABLE HZB_ALERT_DEFINE DROP COLUMN preset;
END IF;

    -- Drop 'priority' column if it exists
SELECT COUNT(*) INTO col_exists FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='HZB_ALERT_DEFINE' AND COLUMN_NAME='priority';
IF col_exists = 1 THEN
ALTER TABLE HZB_ALERT_DEFINE DROP COLUMN priority;
END IF;

    -- Drop 'tags' column if it exists
SELECT COUNT(*) INTO col_exists FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='HZB_ALERT_DEFINE' AND COLUMN_NAME='tags';
IF col_exists = 1 THEN
ALTER TABLE HZB_ALERT_DEFINE DROP COLUMN tags;
END IF;
END //

DELIMITER ;


CALL AddOrDropColumns();
DROP PROCEDURE IF EXISTS AddOrDropColumns;
commit;
