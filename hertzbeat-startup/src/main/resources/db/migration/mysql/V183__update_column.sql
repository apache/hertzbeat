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

CREATE TABLE hzb_agent_session (
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
    transcript_sequence BIGINT NOT NULL DEFAULT 0,
    gmt_create DATETIME DEFAULT CURRENT_TIMESTAMP,
    gmt_update DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_agent_session_uid (session_uid),
    UNIQUE KEY uk_agent_session_key (session_key),
    KEY idx_agent_session_owner (channel, actor_type, actor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE hzb_agent_run (
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
    started_at DATETIME,
    completed_at DATETIME,
    gmt_create DATETIME DEFAULT CURRENT_TIMESTAMP,
    gmt_update DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_agent_run_uid (run_uid),
    UNIQUE KEY uk_agent_run_session_message (session_id, message_id),
    KEY idx_agent_run_session (session_id),
    KEY idx_agent_run_target (target_monitor_id, target_alert_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE hzb_agent_tool_call (
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
    approval_expires_at DATETIME,
    approval_decided_at DATETIME,
    approval_actor_type VARCHAR(64),
    approval_actor_id VARCHAR(128),
    approval_reason VARCHAR(1024),
    result_output TEXT,
    elapsed_ms BIGINT,
    error_message TEXT,
    gmt_create DATETIME DEFAULT CURRENT_TIMESTAMP,
    gmt_update DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uk_agent_tool_call_run_call (run_id, tool_call_id),
    UNIQUE KEY uk_agent_tool_call_approval_id (approval_id),
    KEY idx_agent_tool_call_run (run_id),
    KEY idx_agent_tool_call_session (session_id),
    KEY idx_agent_tool_call_name (tool_name),
    KEY idx_agent_tool_call_status (status),
    KEY idx_agent_tool_call_approval_status (approval_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE hzb_agent_transcript_entry (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    session_id BIGINT NOT NULL,
    run_id BIGINT,
    session_sequence BIGINT NOT NULL,
    payload_json TEXT NOT NULL,
    message_role VARCHAR(32) NOT NULL,
    gmt_create DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uk_agent_transcript_session_sequence (session_id, session_sequence),
    KEY idx_agent_transcript_run (run_id, session_sequence),
    KEY idx_agent_transcript_checkpoint (session_id, message_role, session_sequence)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE hzb_agent_scheduled_command (
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
    last_run_time DATETIME,
    next_run_time DATETIME,
    gmt_create DATETIME DEFAULT CURRENT_TIMESTAMP,
    gmt_update DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_agent_scheduled_command_session (session_id),
    KEY idx_agent_scheduled_command_due (enabled, next_run_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE hzb_alert_analysis_policy (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT TRUE,
    match_labels VARCHAR(4096) NOT NULL,
    group_by_labels VARCHAR(2048) NOT NULL,
    window_seconds BIGINT NOT NULL,
    minimum_alert_count INT NOT NULL,
    cooldown_seconds BIGINT NOT NULL,
    gmt_create DATETIME DEFAULT CURRENT_TIMESTAMP,
    gmt_update DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    KEY idx_alert_analysis_enabled (enabled)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

DELETE FROM hzb_config WHERE type = 'provider';

ALTER TABLE hzb_config MODIFY COLUMN content TEXT;

DROP TABLE IF EXISTS hzb_ai_message;
DROP TABLE IF EXISTS hzb_ai_conversation;
DROP TABLE IF EXISTS hzb_sop_schedule;
