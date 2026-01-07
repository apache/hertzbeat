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
-- "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
-- or implied.  See the License for the specific language
-- governing permissions and limitations
-- under the License.

-- Ensure every SQL can rerun without error
-- This migration updates indexes to match the entity annotations

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
-- ========================================
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'hzb_status_page_incident_component_bind') THEN
        -- Drop old index if exists
        IF EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'hzb_status_page_incident_component_bind' AND indexname = 'index_incident_component') THEN
            DROP INDEX IF EXISTS index_incident_component;
        END IF;

        -- Create new indexes if not exist
        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'hzb_status_page_incident_component_bind' AND indexname = 'idx_incident_component_incident_id') THEN
            CREATE INDEX idx_incident_component_incident_id ON hzb_status_page_incident_component_bind(incident_id);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE tablename = 'hzb_status_page_incident_component_bind' AND indexname = 'idx_incident_component_component_id') THEN
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
