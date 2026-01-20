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
WHERE m.id = p.monitor_id AND p.field = 'port' AND p.param_value IS NOT NULL AND p.param_value != ''
  AND m.instance NOT LIKE ('%:' || p.param_value);

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

-- ========================================
-- hzb_alert_define_monitor_bind table
-- ========================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hzb_alert_define_monitor_bind') THEN
        -- Drop old index if exists
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'hzb_alert_define_monitor_bind' AND indexname = 'index_alert_define_monitor') THEN
            DROP INDEX IF EXISTS index_alert_define_monitor;
        END IF;

        -- Create new indexes if not exist
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'hzb_alert_define_monitor_bind' AND indexname = 'idx_alert_define_id') THEN
            CREATE INDEX idx_alert_define_id ON hzb_alert_define_monitor_bind(alert_define_id);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'hzb_alert_define_monitor_bind' AND indexname = 'idx_monitor_id') THEN
            CREATE INDEX idx_monitor_id ON hzb_alert_define_monitor_bind(monitor_id);
        END IF;
    END IF;
END $$;

-- ========================================
-- hzb_collector_monitor_bind table
-- ========================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hzb_collector_monitor_bind') THEN
        -- Drop old index if exists
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'hzb_collector_monitor_bind' AND indexname = 'index_collector_monitor') THEN
            DROP INDEX IF EXISTS index_collector_monitor;
        END IF;

        -- Create new indexes if not exist
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'hzb_collector_monitor_bind' AND indexname = 'idx_collector_monitor_collector') THEN
            CREATE INDEX idx_collector_monitor_collector ON hzb_collector_monitor_bind(collector);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'hzb_collector_monitor_bind' AND indexname = 'idx_collector_monitor_monitor_id') THEN
            CREATE INDEX idx_collector_monitor_monitor_id ON hzb_collector_monitor_bind(monitor_id);
        END IF;
    END IF;
END $$;

-- ========================================
-- hzb_monitor table
-- ========================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hzb_monitor') THEN
        -- Drop old index if exists
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'hzb_monitor' AND indexname = 'monitor_query_index') THEN
            DROP INDEX IF EXISTS monitor_query_index;
        END IF;

        -- Create new indexes if not exist
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'hzb_monitor' AND indexname = 'idx_hzb_monitor_app') THEN
            CREATE INDEX idx_hzb_monitor_app ON hzb_monitor(app);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'hzb_monitor' AND indexname = 'idx_hzb_monitor_instance') THEN
            CREATE INDEX idx_hzb_monitor_instance ON hzb_monitor(instance);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'hzb_monitor' AND indexname = 'idx_hzb_monitor_name') THEN
            CREATE INDEX idx_hzb_monitor_name ON hzb_monitor(name);
        END IF;
    END IF;
END $$;

-- ========================================
-- hzb_monitor_bind table
-- ========================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hzb_monitor_bind') THEN
        -- Create new index if not exist
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'hzb_monitor_bind' AND indexname = 'index_monitor_bind') THEN
            CREATE INDEX index_monitor_bind ON hzb_monitor_bind(biz_id);
        END IF;
    END IF;
END $$;

-- ========================================
-- hzb_status_page_incident_component_bind table
-- Special handling: component_id might have auto-created index from FK
-- ========================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hzb_status_page_incident_component_bind') THEN
        -- Check if component_id column already has any index, create if not
        IF NOT EXISTS (
            SELECT 1 FROM pg_indexes
            WHERE tablename = 'hzb_status_page_incident_component_bind'
            AND indexdef LIKE '%component_id%'
            AND indexname NOT LIKE '%_pkey'
        ) THEN
            CREATE INDEX idx_incident_component_component_id ON hzb_status_page_incident_component_bind(component_id);
        END IF;
    END IF;
END $$;

-- ========================================
-- hzb_push_metrics table
-- ========================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hzb_push_metrics') THEN
        -- Drop old index if exists
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'hzb_push_metrics' AND indexname = 'push_query_index') THEN
            DROP INDEX IF EXISTS push_query_index;
        END IF;

        -- Create new indexes if not exist
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'hzb_push_metrics' AND indexname = 'idx_push_metrics_monitor_id') THEN
            CREATE INDEX idx_push_metrics_monitor_id ON hzb_push_metrics(monitor_id);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'hzb_push_metrics' AND indexname = 'idx_push_metrics_time') THEN
            CREATE INDEX idx_push_metrics_time ON hzb_push_metrics(time);
        END IF;
    END IF;
END $$;

-- ========================================
-- hzb_history table
-- ========================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hzb_history') THEN
        -- Drop old index if exists
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'hzb_history' AND indexname = 'history_query_index') THEN
            DROP INDEX IF EXISTS history_query_index;
        END IF;

        -- Create new indexes if not exist
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'hzb_history' AND indexname = 'idx_hzb_history_instance') THEN
            CREATE INDEX idx_hzb_history_instance ON hzb_history(instance);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'hzb_history' AND indexname = 'idx_hzb_history_app') THEN
            CREATE INDEX idx_hzb_history_app ON hzb_history(app);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'hzb_history' AND indexname = 'idx_hzb_history_metrics') THEN
            CREATE INDEX idx_hzb_history_metrics ON hzb_history(metrics);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'hzb_history' AND indexname = 'idx_hzb_history_metric') THEN
            CREATE INDEX idx_hzb_history_metric ON hzb_history(metric);
        END IF;
    END IF;
END $$;

-- ========================================
-- hzb_param table
-- ========================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hzb_param') THEN
        -- Drop old index if exists
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'hzb_param' AND indexname = 'idx_hzb_param_monitor_id') THEN
            DROP INDEX IF EXISTS idx_hzb_param_monitor_id;
        END IF;

        -- Create new index if not exist
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'hzb_param' AND indexname = 'idx_hzb_param_monitor_id') THEN
            CREATE INDEX idx_hzb_param_monitor_id ON hzb_param(monitor_id);
        END IF;

        -- Drop old unique constraint if exists
        IF EXISTS (SELECT 1 FROM information_schema.table_constraints
                  WHERE table_name = 'hzb_param'
                  AND constraint_type = 'UNIQUE'
                  AND constraint_name = 'uk_hzb_param_monitor_field') THEN
            ALTER TABLE hzb_param DROP CONSTRAINT IF EXISTS uk_hzb_param_monitor_field;
        END IF;

        -- Create new unique constraint if not exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                      WHERE table_name = 'hzb_param'
                      AND constraint_type = 'UNIQUE'
                      AND constraint_name = 'uk_hzb_param_monitor_field') THEN
            ALTER TABLE hzb_param
            ADD CONSTRAINT uk_hzb_param_monitor_field
            UNIQUE (monitor_id, field);
        END IF;
    END IF;
END $$;

-- ========================================
-- hzb_plugin_param table
-- ========================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hzb_plugin_param') THEN
        -- Drop old index if exists
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'hzb_plugin_param' AND indexname = 'idx_hzb_plugin_param_plugin_metadata_id') THEN
            DROP INDEX IF EXISTS idx_hzb_plugin_param_plugin_metadata_id;
        END IF;

        -- Create new index if not exist
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'hzb_plugin_param' AND indexname = 'idx_hzb_plugin_param_plugin_metadata_id') THEN
            CREATE INDEX idx_hzb_plugin_param_plugin_metadata_id ON hzb_plugin_param(plugin_metadata_id);
        END IF;

        -- Drop old unique constraint if exists
        IF EXISTS (SELECT 1 FROM information_schema.table_constraints
                  WHERE table_name = 'hzb_plugin_param'
                  AND constraint_type = 'UNIQUE'
                  AND constraint_name = 'uk_hzb_plugin_param_metadata_field') THEN
            ALTER TABLE hzb_plugin_param DROP CONSTRAINT IF EXISTS uk_hzb_plugin_param_metadata_field;
        END IF;

        -- Create new unique constraint if not exist
        IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints
                      WHERE table_name = 'hzb_plugin_param'
                      AND constraint_type = 'UNIQUE'
                      AND constraint_name = 'uk_hzb_plugin_param_metadata_field') THEN
            ALTER TABLE hzb_plugin_param
            ADD CONSTRAINT uk_hzb_plugin_param_metadata_field
            UNIQUE (plugin_metadata_id, field);
        END IF;
    END IF;
END $$;

COMMIT;
