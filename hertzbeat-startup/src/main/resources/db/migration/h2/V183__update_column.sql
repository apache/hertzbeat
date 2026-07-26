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

CREATE TABLE IF NOT EXISTS hzb_agent_session (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    session_uid VARCHAR(64) NOT NULL,
    session_key VARCHAR(128) NOT NULL,
    channel VARCHAR(64),
    conversation_id VARCHAR(256),
    actor_type VARCHAR(64),
    actor_id VARCHAR(128),
    actor_roles VARCHAR(1024),
    status VARCHAR(32),
    title VARCHAR(256),
    transcript_sequence BIGINT DEFAULT 0 NOT NULL,
    gmt_create TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    gmt_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS uk_agent_session_uid ON hzb_agent_session(session_uid);
CREATE UNIQUE INDEX IF NOT EXISTS uk_agent_session_key ON hzb_agent_session(session_key);
CREATE INDEX IF NOT EXISTS idx_agent_session_owner ON hzb_agent_session(channel, actor_type, actor_id);

CREATE TABLE IF NOT EXISTS hzb_agent_run (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    run_uid VARCHAR(64) NOT NULL,
    session_id BIGINT NOT NULL,
    message_id VARCHAR(128) NOT NULL,
    target_monitor_id BIGINT,
    target_alert_id BIGINT,
    target_collector VARCHAR(128),
    status VARCHAR(32) NOT NULL,
    result_summary TEXT,
    error_message VARCHAR(1024),
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    gmt_create TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    gmt_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS uk_agent_run_uid ON hzb_agent_run(run_uid);
CREATE UNIQUE INDEX IF NOT EXISTS uk_agent_run_session_message ON hzb_agent_run(session_id, message_id);
CREATE INDEX IF NOT EXISTS idx_agent_run_session ON hzb_agent_run(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_run_target ON hzb_agent_run(target_monitor_id, target_alert_id);

CREATE TABLE IF NOT EXISTS hzb_agent_tool_call (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    tool_call_id VARCHAR(128) NOT NULL,
    run_id BIGINT NOT NULL,
    session_id BIGINT,
    run_uid VARCHAR(64),
    session_uid VARCHAR(64),
    tool_name VARCHAR(128) NOT NULL,
    exposure VARCHAR(64),
    risk VARCHAR(32),
    policy_decision VARCHAR(32),
    status VARCHAR(32) NOT NULL,
    input_json TEXT,
    input_hash VARCHAR(64),
    approval_id VARCHAR(64),
    approval_status VARCHAR(32),
    approval_expires_at TIMESTAMP,
    approval_decided_at TIMESTAMP,
    approval_actor_type VARCHAR(64),
    approval_actor_id VARCHAR(128),
    approval_reason VARCHAR(1024),
    result_output TEXT,
    elapsed_ms BIGINT,
    error_message TEXT,
    gmt_create TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    gmt_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS uk_agent_tool_call_run_call ON hzb_agent_tool_call(run_id, tool_call_id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_agent_tool_call_approval_id ON hzb_agent_tool_call(approval_id);
CREATE INDEX IF NOT EXISTS idx_agent_tool_call_run ON hzb_agent_tool_call(run_id);
CREATE INDEX IF NOT EXISTS idx_agent_tool_call_session ON hzb_agent_tool_call(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_tool_call_name ON hzb_agent_tool_call(tool_name);
CREATE INDEX IF NOT EXISTS idx_agent_tool_call_status ON hzb_agent_tool_call(status);
CREATE INDEX IF NOT EXISTS idx_agent_tool_call_approval_status ON hzb_agent_tool_call(approval_status);

CREATE TABLE IF NOT EXISTS hzb_agent_transcript_entry (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    session_id BIGINT NOT NULL,
    run_id BIGINT,
    session_sequence BIGINT NOT NULL,
    payload_json TEXT NOT NULL,
    message_role VARCHAR(32) NOT NULL,
    gmt_create TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS uk_agent_transcript_session_sequence
    ON hzb_agent_transcript_entry(session_id, session_sequence);
CREATE INDEX IF NOT EXISTS idx_agent_transcript_run
    ON hzb_agent_transcript_entry(run_id, session_sequence);
CREATE INDEX IF NOT EXISTS idx_agent_transcript_checkpoint
    ON hzb_agent_transcript_entry(session_id, message_role, session_sequence);

CREATE TABLE IF NOT EXISTS hzb_agent_scheduled_command (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    session_id BIGINT NOT NULL,
    channel VARCHAR(64) NOT NULL,
    conversation_id VARCHAR(256) NOT NULL,
    actor_type VARCHAR(64) NOT NULL,
    actor_id VARCHAR(128) NOT NULL,
    actor_roles VARCHAR(1024) NOT NULL,
    message VARCHAR(4096) NOT NULL,
    cron_expression VARCHAR(64) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    last_run_time TIMESTAMP,
    next_run_time TIMESTAMP,
    gmt_create TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    gmt_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_agent_scheduled_command_session
    ON hzb_agent_scheduled_command(session_id);
CREATE INDEX IF NOT EXISTS idx_agent_scheduled_command_due
    ON hzb_agent_scheduled_command(enabled, next_run_time);

CREATE TABLE IF NOT EXISTS hzb_alert_analysis_policy (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    match_labels VARCHAR(4096) NOT NULL,
    group_by_labels VARCHAR(2048) NOT NULL,
    window_seconds BIGINT NOT NULL,
    minimum_alert_count INT NOT NULL,
    cooldown_seconds BIGINT NOT NULL,
    gmt_create TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    gmt_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_alert_analysis_enabled
    ON hzb_alert_analysis_policy(enabled);

DELETE FROM hzb_config WHERE type = 'provider';

ALTER TABLE hzb_config ALTER COLUMN content CLOB;
