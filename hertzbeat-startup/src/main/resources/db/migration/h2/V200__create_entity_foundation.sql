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

CREATE TABLE IF NOT EXISTS hzb_entity (
    id BIGINT PRIMARY KEY,
    entity_type VARCHAR(32) NOT NULL,
    name VARCHAR(128) NOT NULL,
    display_name VARCHAR(128),
    sub_type VARCHAR(128),
    namespace VARCHAR(128),
    environment VARCHAR(128),
    status VARCHAR(32) NOT NULL,
    criticality VARCHAR(32),
    owner VARCHAR(128),
    additional_owners TEXT,
    runbook VARCHAR(512),
    lifecycle VARCHAR(64),
    tier VARCHAR(64),
    system_name VARCHAR(128),
    component_of CLOB,
    components CLOB,
    implemented_by TEXT,
    api_interface TEXT,
    inherit_from VARCHAR(255),
    languages CLOB,
    links TEXT,
    contacts TEXT,
    integrations CLOB,
    extensions CLOB,
    hertzbeat CLOB,
    source VARCHAR(32) NOT NULL,
    description VARCHAR(512),
    labels VARCHAR(4096),
    tags CLOB,
    workspace_id VARCHAR(64) NOT NULL DEFAULT 'default',
    creator VARCHAR(64),
    modifier VARCHAR(64),
    gmt_create DATETIME DEFAULT CURRENT_TIMESTAMP,
    gmt_update DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hzb_entity_type ON hzb_entity(entity_type);
CREATE INDEX IF NOT EXISTS idx_hzb_entity_status ON hzb_entity(status);
CREATE INDEX IF NOT EXISTS idx_hzb_entity_name ON hzb_entity(name);
CREATE INDEX IF NOT EXISTS idx_hzb_entity_owner ON hzb_entity(owner);
CREATE INDEX IF NOT EXISTS idx_hzb_entity_workspace ON hzb_entity(workspace_id);

CREATE TABLE IF NOT EXISTS hzb_entity_identity (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    entity_id BIGINT NOT NULL,
    identity_type VARCHAR(32) NOT NULL,
    identity_key VARCHAR(128) NOT NULL,
    identity_value VARCHAR(512) NOT NULL,
    normalized_value VARCHAR(512) NOT NULL,
    priority INT NOT NULL DEFAULT 40,
    primary_identity BOOLEAN NOT NULL DEFAULT FALSE,
    creator VARCHAR(64),
    modifier VARCHAR(64),
    gmt_create DATETIME DEFAULT CURRENT_TIMESTAMP,
    gmt_update DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_hzb_entity_identity ON hzb_entity_identity(entity_id, identity_key, normalized_value);
CREATE INDEX IF NOT EXISTS idx_hzb_entity_identity_lookup ON hzb_entity_identity(identity_key, normalized_value);
CREATE INDEX IF NOT EXISTS idx_hzb_entity_identity_entity ON hzb_entity_identity(entity_id);

CREATE TABLE IF NOT EXISTS hzb_entity_monitor_bind (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    entity_id BIGINT NOT NULL,
    monitor_id BIGINT NOT NULL,
    bind_type VARCHAR(32) NOT NULL,
    bind_source VARCHAR(64) NOT NULL,
    status VARCHAR(16) NOT NULL,
    score INT NOT NULL DEFAULT 100,
    match_context TEXT,
    creator VARCHAR(64),
    modifier VARCHAR(64),
    gmt_create DATETIME DEFAULT CURRENT_TIMESTAMP,
    gmt_update DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_hzb_entity_monitor_bind ON hzb_entity_monitor_bind(entity_id, monitor_id);
CREATE INDEX IF NOT EXISTS idx_hzb_entity_monitor_bind_entity ON hzb_entity_monitor_bind(entity_id);
CREATE INDEX IF NOT EXISTS idx_hzb_entity_monitor_bind_monitor ON hzb_entity_monitor_bind(monitor_id);

CREATE TABLE IF NOT EXISTS hzb_entity_relation (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    source_entity_id BIGINT NOT NULL,
    target_entity_id BIGINT,
    target_ref VARCHAR(255),
    relation_type VARCHAR(32) NOT NULL,
    relation_source VARCHAR(32) NOT NULL,
    status VARCHAR(16) NOT NULL,
    score INT NOT NULL DEFAULT 100,
    description VARCHAR(255),
    attributes TEXT,
    creator VARCHAR(64),
    modifier VARCHAR(64),
    gmt_create DATETIME DEFAULT CURRENT_TIMESTAMP,
    gmt_update DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_hzb_entity_relation ON hzb_entity_relation(source_entity_id, target_entity_id, relation_type);
CREATE INDEX IF NOT EXISTS idx_hzb_entity_relation_source ON hzb_entity_relation(source_entity_id);
CREATE INDEX IF NOT EXISTS idx_hzb_entity_relation_target ON hzb_entity_relation(target_entity_id);
CREATE INDEX IF NOT EXISTS idx_hzb_entity_relation_target_ref ON hzb_entity_relation(target_ref);

CREATE TABLE IF NOT EXISTS hzb_entity_definition_activity (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    entity_id BIGINT NOT NULL,
    workspace_id VARCHAR(64) NOT NULL DEFAULT 'default',
    activity_type VARCHAR(32) NOT NULL,
    format VARCHAR(16) NOT NULL,
    status VARCHAR(16) NOT NULL,
    summary VARCHAR(128) NOT NULL,
    detail VARCHAR(255),
    creator VARCHAR(64),
    gmt_create DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_hzb_entity_definition_activity_entity
    ON hzb_entity_definition_activity(entity_id);

CREATE INDEX IF NOT EXISTS idx_hzb_entity_definition_activity_workspace_time
    ON hzb_entity_definition_activity(workspace_id, gmt_create);

CREATE INDEX IF NOT EXISTS idx_hzb_entity_definition_activity_time
    ON hzb_entity_definition_activity(gmt_create);

CREATE TABLE IF NOT EXISTS hzb_entity_governance_state (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    state_scope VARCHAR(32) NOT NULL,
    state_kind VARCHAR(32) NOT NULL,
    workspace_id VARCHAR(64) NOT NULL DEFAULT 'default',
    state_key VARCHAR(128) NOT NULL,
    state_name VARCHAR(128),
    status VARCHAR(32),
    content CLOB,
    creator VARCHAR(64),
    gmt_create TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    gmt_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_hzb_entity_governance_state_scope_kind_workspace_key
    ON hzb_entity_governance_state(state_scope, state_kind, workspace_id, state_key);

CREATE INDEX IF NOT EXISTS idx_hzb_entity_governance_state_scope_kind
    ON hzb_entity_governance_state(state_scope, state_kind);

CREATE INDEX IF NOT EXISTS idx_hzb_entity_governance_state_scope_kind_workspace
    ON hzb_entity_governance_state(state_scope, state_kind, workspace_id);

CREATE INDEX IF NOT EXISTS idx_hzb_entity_governance_state_update
    ON hzb_entity_governance_state(gmt_update);

CREATE INDEX IF NOT EXISTS idx_hzb_entity_governance_state_creator
    ON hzb_entity_governance_state(creator);

CREATE TABLE IF NOT EXISTS hzb_auth_token (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255),
    token_hash VARCHAR(128) NOT NULL,
    token_mask VARCHAR(64),
    token_scope VARCHAR(32) NOT NULL DEFAULT 'api-admin',
    workspace_id VARCHAR(64) NOT NULL DEFAULT 'default',
    status TINYINT NOT NULL DEFAULT 0,
    creator VARCHAR(64),
    gmt_create TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expire_time TIMESTAMP,
    last_used_time TIMESTAMP,
    revoked_time TIMESTAMP,
    revoked_by VARCHAR(64)
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_hzb_auth_token_hash ON hzb_auth_token(token_hash);
CREATE INDEX IF NOT EXISTS idx_hzb_auth_token_creator ON hzb_auth_token(creator);
CREATE INDEX IF NOT EXISTS idx_hzb_auth_token_scope ON hzb_auth_token(token_scope);
CREATE INDEX IF NOT EXISTS idx_hzb_auth_token_workspace ON hzb_auth_token(workspace_id);
CREATE INDEX IF NOT EXISTS idx_hzb_auth_token_scope_workspace ON hzb_auth_token(token_scope, workspace_id);
CREATE INDEX IF NOT EXISTS idx_hzb_auth_token_status ON hzb_auth_token(status);
CREATE INDEX IF NOT EXISTS idx_hzb_auth_token_revoked_by ON hzb_auth_token(revoked_by);

CREATE TABLE IF NOT EXISTS hzb_signal_saved_view (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    creator VARCHAR(255) NOT NULL,
    signal VARCHAR(32) NOT NULL,
    view_key VARCHAR(128) NOT NULL,
    label VARCHAR(255) NOT NULL,
    description VARCHAR(512),
    route VARCHAR(2048) NOT NULL,
    query_snapshot TEXT,
    payload TEXT,
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_hzb_signal_saved_view_signal_key
    ON hzb_signal_saved_view(signal, view_key);

CREATE INDEX IF NOT EXISTS idx_hzb_signal_saved_view_signal
    ON hzb_signal_saved_view(signal);

CREATE INDEX IF NOT EXISTS idx_hzb_signal_saved_view_update
    ON hzb_signal_saved_view(update_time);

CREATE TABLE IF NOT EXISTS hzb_signal_dashboard_panel_draft (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    creator VARCHAR(255) NOT NULL,
    signal VARCHAR(32) NOT NULL,
    draft_key VARCHAR(128) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description VARCHAR(512),
    visualization VARCHAR(32) NOT NULL,
    route VARCHAR(2048) NOT NULL,
    query_snapshot TEXT,
    payload TEXT,
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_hzb_signal_dashboard_panel_draft_creator_signal_key
    ON hzb_signal_dashboard_panel_draft(creator, signal, draft_key);

CREATE INDEX IF NOT EXISTS idx_hzb_signal_dashboard_panel_draft_creator_signal
    ON hzb_signal_dashboard_panel_draft(creator, signal);

CREATE INDEX IF NOT EXISTS idx_hzb_signal_dashboard_panel_draft_update
    ON hzb_signal_dashboard_panel_draft(update_time);

CREATE TABLE IF NOT EXISTS hzb_signal_dashboard (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    creator VARCHAR(255) NOT NULL,
    dashboard_key VARCHAR(128) NOT NULL,
    title VARCHAR(255) NOT NULL,
    description VARCHAR(512),
    tags VARCHAR(512),
    layout TEXT NOT NULL,
    widgets TEXT NOT NULL,
    variables TEXT,
    panel_map TEXT,
    version VARCHAR(32),
    create_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    update_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_hzb_signal_dashboard_key
    ON hzb_signal_dashboard(dashboard_key);

CREATE INDEX IF NOT EXISTS idx_hzb_signal_dashboard_update
    ON hzb_signal_dashboard(update_time);

-- HertzBeat 2.0.0 baseline additions.

-- V201  add collector intake token boundary.sql.
ALTER TABLE hzb_auth_token ADD COLUMN IF NOT EXISTS token_audience VARCHAR(32);
ALTER TABLE hzb_auth_token ADD COLUMN IF NOT EXISTS collector_id VARCHAR(128);
ALTER TABLE hzb_auth_token ADD COLUMN IF NOT EXISTS allowed_signals VARCHAR(64);
CREATE INDEX IF NOT EXISTS idx_hzb_auth_token_collector ON hzb_auth_token(collector_id);

-- V202  add collector runtime config.sql.
ALTER TABLE hzb_collector ADD COLUMN IF NOT EXISTS runtime_config CLOB;

-- V203  add collector instrumentation intake.sql.
ALTER TABLE hzb_collector ADD COLUMN IF NOT EXISTS instrumentation_intake CLOB;

-- V204  add config revision.sql.
ALTER TABLE hzb_config ADD COLUMN IF NOT EXISTS config_revision VARCHAR(36);
UPDATE hzb_config SET config_revision = CAST(RANDOM_UUID() AS VARCHAR)
    WHERE config_revision IS NULL;
ALTER TABLE hzb_config ALTER COLUMN config_revision SET NOT NULL;

-- V205  add monitor metric layout.sql.
CREATE TABLE IF NOT EXISTS hzb_monitor_metric_layout (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    creator VARCHAR(255) NOT NULL,
    application VARCHAR(128) NOT NULL,
    schema_version INT NOT NULL,
    layout_document CLOB NOT NULL,
    revision VARCHAR(64) NOT NULL,
    create_time TIMESTAMP NOT NULL,
    update_time TIMESTAMP NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS uk_hzb_monitor_metric_layout_creator_app
    ON hzb_monitor_metric_layout(creator, application);

-- V206  add agent gateway.sql.
CREATE TABLE IF NOT EXISTS hzb_agent_session (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    session_uid VARCHAR(64) NOT NULL,
    session_key VARCHAR(128) NOT NULL,
    channel VARCHAR(64),
    origin_entry_type VARCHAR(32) NOT NULL,
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
    entry_type VARCHAR(32) NOT NULL,
    target_monitor_id BIGINT,
    target_alert_id BIGINT,
    target_collector VARCHAR(128),
    target_context_json TEXT,
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
CREATE UNIQUE INDEX IF NOT EXISTS uk_agent_tool_call_run_call
    ON hzb_agent_tool_call(run_id, tool_call_id);
CREATE UNIQUE INDEX IF NOT EXISTS uk_agent_tool_call_approval_id
    ON hzb_agent_tool_call(approval_id);
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

CREATE TABLE IF NOT EXISTS hzb_agent_schedule (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(128) NOT NULL,
    instruction VARCHAR(4096) NOT NULL,
    cron_expression VARCHAR(64) NOT NULL,
    enabled BOOLEAN DEFAULT TRUE NOT NULL,
    session_id BIGINT,
    receiver_ids VARCHAR(2048) NOT NULL,
    template_id BIGINT,
    created_from_session_uid VARCHAR(64),
    last_trigger_at BIGINT,
    next_trigger_at BIGINT,
    creator VARCHAR(64),
    modifier VARCHAR(64),
    gmt_create TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    gmt_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS idx_agent_schedule_due
    ON hzb_agent_schedule(enabled, next_trigger_at);
CREATE INDEX IF NOT EXISTS idx_agent_schedule_session
    ON hzb_agent_schedule(session_id);

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
CREATE INDEX IF NOT EXISTS idx_alert_analysis_enabled ON hzb_alert_analysis_policy(enabled);

ALTER TABLE hzb_config ALTER COLUMN content CLOB;

CREATE TABLE IF NOT EXISTS hzb_account (
    id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
    username VARCHAR(64) NOT NULL,
    password_hash VARCHAR(100) NOT NULL,
    roles VARCHAR(128) NOT NULL,
    credential_version BIGINT NOT NULL,
    disabled BOOLEAN NOT NULL,
    bootstrap_slot SMALLINT,
    CONSTRAINT uk_hzb_account_username UNIQUE (username),
    CONSTRAINT uk_hzb_account_bootstrap UNIQUE (bootstrap_slot)
);

CREATE TABLE IF NOT EXISTS hzb_installation (
    id SMALLINT PRIMARY KEY,
    installation_fingerprint VARCHAR(64) NOT NULL UNIQUE,
    complete BOOLEAN NOT NULL
);
