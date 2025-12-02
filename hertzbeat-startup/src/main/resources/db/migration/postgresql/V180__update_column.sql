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
WHERE m.id = p.monitor_id AND p.field = 'port' AND p.param_value IS NOT NULL AND p.param_value != '';

-- Migrate history table
DO $$
BEGIN
    IF EXISTS(SELECT * FROM information_schema.columns WHERE table_name = 'hzb_history' AND column_name = 'monitor_id') THEN
        IF NOT EXISTS(SELECT * FROM information_schema.columns WHERE table_name = 'hzb_history' AND column_name = 'metric_labels') THEN
            ALTER TABLE hzb_history RENAME COLUMN instance TO metric_labels;
            ALTER TABLE hzb_history ALTER COLUMN metric_labels TYPE VARCHAR(5000);
            ALTER TABLE hzb_history ADD COLUMN instance VARCHAR(255);
        ELSE
            UPDATE hzb_history SET metric_labels = instance WHERE metric_labels IS NULL;
            UPDATE hzb_history SET instance = NULL;
            ALTER TABLE hzb_history ALTER COLUMN instance TYPE VARCHAR(255);
        END IF;
        
        UPDATE hzb_history h
        SET instance = m.instance
        FROM hzb_monitor m
        WHERE h.monitor_id = m.id;
        
        ALTER TABLE hzb_history DROP COLUMN monitor_id;
    END IF;
END $$;

commit;
