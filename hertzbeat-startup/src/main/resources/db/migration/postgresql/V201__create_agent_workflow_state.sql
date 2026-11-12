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
);

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
);

CREATE TABLE IF NOT EXISTS hzb_website_batch_item (
    id VARCHAR(64) PRIMARY KEY,
    input_hash VARCHAR(64) NOT NULL,
    state VARCHAR(32) NOT NULL,
    monitor_id BIGINT,
    reason VARCHAR(64),
    version BIGINT
);
ALTER TABLE hzb_agent_run ADD COLUMN IF NOT EXISTS batch_root_run_uid VARCHAR(64);
ALTER TABLE hzb_agent_run ADD COLUMN IF NOT EXISTS batch_parent_run_uid VARCHAR(64);
ALTER TABLE hzb_agent_run ADD COLUMN IF NOT EXISTS batch_segment INT;
ALTER TABLE hzb_agent_run ADD COLUMN IF NOT EXISTS batch_read_only BOOLEAN;
CREATE INDEX IF NOT EXISTS idx_agent_run_batch_root ON hzb_agent_run(batch_root_run_uid);
CREATE UNIQUE INDEX IF NOT EXISTS uk_agent_run_batch_parent ON hzb_agent_run(batch_parent_run_uid);
CREATE UNIQUE INDEX IF NOT EXISTS uk_agent_run_batch_segment ON hzb_agent_run(batch_root_run_uid, batch_segment);

-- Legacy AI conversation credentials remain encrypted; existing rows stay unchanged.
ALTER TABLE IF EXISTS hzb_ai_conversation ADD COLUMN IF NOT EXISTS security_data VARCHAR(255);

-- Preserve newly mapped optional notification fields without changing existing receiver data.
ALTER TABLE IF EXISTS hzb_notice_receiver ADD COLUMN IF NOT EXISTS ntfy_server_url VARCHAR(300);
ALTER TABLE IF EXISTS hzb_notice_receiver ADD COLUMN IF NOT EXISTS ntfy_token VARCHAR(300);
ALTER TABLE IF EXISTS hzb_notice_receiver ADD COLUMN IF NOT EXISTS ntfy_topic VARCHAR(300);
ALTER TABLE IF EXISTS hzb_notice_receiver ADD COLUMN IF NOT EXISTS wpush_channel VARCHAR(64);
ALTER TABLE IF EXISTS hzb_notice_receiver ADD COLUMN IF NOT EXISTS wpush_token VARCHAR(300);
ALTER TABLE IF EXISTS hzb_notice_receiver ADD COLUMN IF NOT EXISTS wpush_topic_code VARCHAR(300);

-- Match the non-shrinking V190 expression type for older V200 baselines as well.
ALTER TABLE IF EXISTS hzb_alert_define ALTER COLUMN expr TYPE TEXT;
