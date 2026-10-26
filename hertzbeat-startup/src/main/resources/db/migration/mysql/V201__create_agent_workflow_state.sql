-- Licensed to the Apache Software Foundation (ASF) under one or more
-- contributor license agreements.  See the NOTICE file distributed with
-- this work for additional information regarding copyright ownership.
-- The ASF licenses this file to You under the Apache License, Version 2.0
-- (the "License"); you may not use this file except in compliance with
-- the License.  You may obtain a copy of the License at
--
--     http://www.apache.org/licenses/LICENSE-2.0
--
-- Unless required by applicable law or agreed to in writing, software
-- distributed under the License is distributed on an "AS IS" BASIS,
-- WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
-- See the License for the specific language governing permissions and
-- limitations under the License.

CREATE TABLE IF NOT EXISTS hzb_agent_permission_state (
    id VARCHAR(64) PRIMARY KEY,
    session_uid VARCHAR(64) NOT NULL,
    mode VARCHAR(16) NOT NULL DEFAULT 'MANUAL',
    generation BIGINT NOT NULL DEFAULT 0,
    expires_at BIGINT NOT NULL DEFAULT 0,
    roles_hash VARCHAR(64),
    challenge_hash VARCHAR(64),
    challenge_generation BIGINT NOT NULL DEFAULT 0,
    not_before BIGINT NOT NULL DEFAULT 0,
    challenge_expires_at BIGINT NOT NULL DEFAULT 0,
    consumed_challenge_hash VARCHAR(64),
    consumed_generation BIGINT NOT NULL DEFAULT 0,
    consumed_grant_generation BIGINT NOT NULL DEFAULT 0,
    row_version BIGINT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS hzb_agent_permission_audit (
    id VARCHAR(64) PRIMARY KEY,
    scope_id VARCHAR(64) NOT NULL,
    session_uid VARCHAR(64) NOT NULL,
    actor_id VARCHAR(128) NOT NULL,
    workspace_id VARCHAR(128) NOT NULL,
    action VARCHAR(32) NOT NULL,
    generation BIGINT NOT NULL DEFAULT 0,
    occurred_at BIGINT NOT NULL DEFAULT 0,
    expires_at BIGINT NOT NULL DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE IF NOT EXISTS hzb_website_batch_item (
    id VARCHAR(64) PRIMARY KEY,
    input_hash VARCHAR(64) NOT NULL,
    state VARCHAR(32) NOT NULL,
    monitor_id BIGINT,
    reason VARCHAR(64),
    version BIGINT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

-- Existing V200/auto-updated installations may already contain individual columns/indexes.
SET @hzb_ai_ddl = IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='hzb_agent_run' AND column_name='batch_root_run_uid')=0, 'ALTER TABLE hzb_agent_run ADD COLUMN batch_root_run_uid VARCHAR(64)', 'SELECT 1');
PREPARE hzb_ai_statement FROM @hzb_ai_ddl;
EXECUTE hzb_ai_statement;
DEALLOCATE PREPARE hzb_ai_statement;
SET @hzb_ai_ddl = IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='hzb_agent_run' AND column_name='batch_parent_run_uid')=0, 'ALTER TABLE hzb_agent_run ADD COLUMN batch_parent_run_uid VARCHAR(64)', 'SELECT 1');
PREPARE hzb_ai_statement FROM @hzb_ai_ddl;
EXECUTE hzb_ai_statement;
DEALLOCATE PREPARE hzb_ai_statement;
SET @hzb_ai_ddl = IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='hzb_agent_run' AND column_name='batch_segment')=0, 'ALTER TABLE hzb_agent_run ADD COLUMN batch_segment INT', 'SELECT 1');
PREPARE hzb_ai_statement FROM @hzb_ai_ddl;
EXECUTE hzb_ai_statement;
DEALLOCATE PREPARE hzb_ai_statement;
SET @hzb_ai_ddl = IF((SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='hzb_agent_run' AND column_name='batch_read_only')=0, 'ALTER TABLE hzb_agent_run ADD COLUMN batch_read_only BOOLEAN', 'SELECT 1');
PREPARE hzb_ai_statement FROM @hzb_ai_ddl;
EXECUTE hzb_ai_statement;
DEALLOCATE PREPARE hzb_ai_statement;
SET @hzb_ai_ddl = IF((SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='hzb_agent_run' AND index_name='idx_agent_run_batch_root')=0, 'CREATE INDEX idx_agent_run_batch_root ON hzb_agent_run(batch_root_run_uid)', 'SELECT 1');
PREPARE hzb_ai_statement FROM @hzb_ai_ddl;
EXECUTE hzb_ai_statement;
DEALLOCATE PREPARE hzb_ai_statement;
SET @hzb_ai_ddl = IF((SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='hzb_agent_run' AND index_name='uk_agent_run_batch_parent')=0, 'CREATE UNIQUE INDEX uk_agent_run_batch_parent ON hzb_agent_run(batch_parent_run_uid)', 'SELECT 1');
PREPARE hzb_ai_statement FROM @hzb_ai_ddl;
EXECUTE hzb_ai_statement;
DEALLOCATE PREPARE hzb_ai_statement;
SET @hzb_ai_ddl = IF((SELECT COUNT(*) FROM information_schema.statistics WHERE table_schema=DATABASE() AND table_name='hzb_agent_run' AND index_name='uk_agent_run_batch_segment')=0, 'CREATE UNIQUE INDEX uk_agent_run_batch_segment ON hzb_agent_run(batch_root_run_uid, batch_segment)', 'SELECT 1');
PREPARE hzb_ai_statement FROM @hzb_ai_ddl;
EXECUTE hzb_ai_statement;
DEALLOCATE PREPARE hzb_ai_statement;

-- Legacy AI conversation credentials remain encrypted; existing rows stay unchanged.
SET @hzb_ai_ddl = IF((SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='hzb_ai_conversation')=1 AND (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='hzb_ai_conversation' AND column_name='security_data')=0, 'ALTER TABLE hzb_ai_conversation ADD COLUMN security_data VARCHAR(255)', 'SELECT 1');
PREPARE hzb_ai_statement FROM @hzb_ai_ddl;
EXECUTE hzb_ai_statement;
DEALLOCATE PREPARE hzb_ai_statement;

-- Preserve newly mapped optional notification fields without changing existing receiver data.
SET @hzb_ai_ddl = IF((SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='hzb_notice_receiver')=1 AND (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='hzb_notice_receiver' AND column_name='ntfy_server_url')=0, 'ALTER TABLE hzb_notice_receiver ADD COLUMN ntfy_server_url VARCHAR(300)', 'SELECT 1');
PREPARE hzb_ai_statement FROM @hzb_ai_ddl;
EXECUTE hzb_ai_statement;
DEALLOCATE PREPARE hzb_ai_statement;
SET @hzb_ai_ddl = IF((SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='hzb_notice_receiver')=1 AND (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='hzb_notice_receiver' AND column_name='ntfy_token')=0, 'ALTER TABLE hzb_notice_receiver ADD COLUMN ntfy_token VARCHAR(300)', 'SELECT 1');
PREPARE hzb_ai_statement FROM @hzb_ai_ddl;
EXECUTE hzb_ai_statement;
DEALLOCATE PREPARE hzb_ai_statement;
SET @hzb_ai_ddl = IF((SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='hzb_notice_receiver')=1 AND (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='hzb_notice_receiver' AND column_name='ntfy_topic')=0, 'ALTER TABLE hzb_notice_receiver ADD COLUMN ntfy_topic VARCHAR(300)', 'SELECT 1');
PREPARE hzb_ai_statement FROM @hzb_ai_ddl;
EXECUTE hzb_ai_statement;
DEALLOCATE PREPARE hzb_ai_statement;
SET @hzb_ai_ddl = IF((SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='hzb_notice_receiver')=1 AND (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='hzb_notice_receiver' AND column_name='wpush_channel')=0, 'ALTER TABLE hzb_notice_receiver ADD COLUMN wpush_channel VARCHAR(64)', 'SELECT 1');
PREPARE hzb_ai_statement FROM @hzb_ai_ddl;
EXECUTE hzb_ai_statement;
DEALLOCATE PREPARE hzb_ai_statement;
SET @hzb_ai_ddl = IF((SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='hzb_notice_receiver')=1 AND (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='hzb_notice_receiver' AND column_name='wpush_token')=0, 'ALTER TABLE hzb_notice_receiver ADD COLUMN wpush_token VARCHAR(300)', 'SELECT 1');
PREPARE hzb_ai_statement FROM @hzb_ai_ddl;
EXECUTE hzb_ai_statement;
DEALLOCATE PREPARE hzb_ai_statement;
SET @hzb_ai_ddl = IF((SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='hzb_notice_receiver')=1 AND (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='hzb_notice_receiver' AND column_name='wpush_topic_code')=0, 'ALTER TABLE hzb_notice_receiver ADD COLUMN wpush_topic_code VARCHAR(300)', 'SELECT 1');
PREPARE hzb_ai_statement FROM @hzb_ai_ddl;
EXECUTE hzb_ai_statement;
DEALLOCATE PREPARE hzb_ai_statement;
