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
DO $$
BEGIN
    IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name = 'hzb_monitor' AND column_name = 'instance') THEN
        IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name = 'hzb_monitor' AND column_name = 'host') THEN
            EXECUTE 'UPDATE HZB_MONITOR SET instance = host WHERE instance IS NULL';
            EXECUTE 'ALTER TABLE HZB_MONITOR DROP COLUMN host';
        END IF;
    ELSE
        IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name = 'hzb_monitor' AND column_name = 'host') THEN
            EXECUTE 'ALTER TABLE HZB_MONITOR RENAME COLUMN host TO instance';
        END IF;
    END IF;
END $$;

-- Update instance with port
UPDATE HZB_MONITOR m
SET instance = m.instance || ':' || p.param_value
FROM HZB_PARAM p
WHERE m.id = p.monitor_id AND p.field = 'port';

commit;
