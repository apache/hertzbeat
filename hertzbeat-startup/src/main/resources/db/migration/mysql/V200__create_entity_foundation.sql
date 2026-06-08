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

CREATE TABLE hzb_entity (
    id BIGINT PRIMARY KEY COMMENT 'Entity ID',
    entity_type VARCHAR(32) NOT NULL COMMENT 'Entity type',
    name VARCHAR(128) NOT NULL COMMENT 'Entity name',
    display_name VARCHAR(128) COMMENT 'Entity display name',
    sub_type VARCHAR(128) COMMENT 'Entity subtype from HertzBeat v1 definition',
    namespace VARCHAR(128) COMMENT 'Namespace',
    environment VARCHAR(128) COMMENT 'Deployment environment',
    status VARCHAR(32) NOT NULL COMMENT 'Aggregated entity status',
    criticality VARCHAR(32) COMMENT 'Entity criticality',
    owner VARCHAR(128) COMMENT 'Entity owner',
    additional_owners TEXT COMMENT 'Additional owners json',
    runbook VARCHAR(512) COMMENT 'Runbook URL or identifier',
    lifecycle VARCHAR(64) COMMENT 'Entity lifecycle',
    tier VARCHAR(64) COMMENT 'Entity tier',
    system_name VARCHAR(128) COMMENT 'Owning system',
    component_of TEXT COMMENT 'Parent components or systems',
    components TEXT COMMENT 'Child components that belong to this system',
    implemented_by TEXT COMMENT 'ImplementedBy references json',
    api_interface TEXT COMMENT 'API interface definition json',
    inherit_from VARCHAR(255) COMMENT 'Entity inheritance reference',
    languages TEXT COMMENT 'Programming languages json',
    links TEXT COMMENT 'Entity links json',
    contacts TEXT COMMENT 'Entity contacts json',
    integrations TEXT COMMENT 'Entity integrations json',
    extensions TEXT COMMENT 'Entity custom extensions json',
    hertzbeat TEXT COMMENT 'HertzBeat definition blocks json',
    source VARCHAR(32) NOT NULL COMMENT 'Entity source',
    description VARCHAR(512) COMMENT 'Entity description',
    labels VARCHAR(4096) COMMENT 'Entity labels json',
    tags TEXT COMMENT 'Entity catalog tags json',
    workspace_id VARCHAR(64) NOT NULL DEFAULT 'default' COMMENT 'Entity workspace boundary',
    creator VARCHAR(64) COMMENT 'Creator',
    modifier VARCHAR(64) COMMENT 'Modifier',
    gmt_create DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Create time',
    gmt_update DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    INDEX idx_hzb_entity_type (entity_type),
    INDEX idx_hzb_entity_status (status),
    INDEX idx_hzb_entity_name (name),
    INDEX idx_hzb_entity_owner (owner),
    INDEX idx_hzb_entity_workspace (workspace_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE hzb_entity_identity (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    entity_id BIGINT NOT NULL COMMENT 'Entity ID',
    identity_type VARCHAR(32) NOT NULL COMMENT 'Identity source type',
    identity_key VARCHAR(128) NOT NULL COMMENT 'Identity key',
    identity_value VARCHAR(512) NOT NULL COMMENT 'Identity value',
    normalized_value VARCHAR(512) NOT NULL COMMENT 'Normalized identity value',
    priority INT NOT NULL DEFAULT 40 COMMENT 'Identity priority',
    primary_identity TINYINT NOT NULL DEFAULT 0 COMMENT 'Whether primary identity',
    creator VARCHAR(64) COMMENT 'Creator',
    modifier VARCHAR(64) COMMENT 'Modifier',
    gmt_create DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Create time',
    gmt_update DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    UNIQUE KEY uk_hzb_entity_identity (entity_id, identity_key, normalized_value),
    INDEX idx_hzb_entity_identity_lookup (identity_key, normalized_value),
    INDEX idx_hzb_entity_identity_entity (entity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE hzb_entity_monitor_bind (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    entity_id BIGINT NOT NULL COMMENT 'Entity ID',
    monitor_id BIGINT NOT NULL COMMENT 'Monitor ID',
    bind_type VARCHAR(32) NOT NULL COMMENT 'Bind type',
    bind_source VARCHAR(64) NOT NULL COMMENT 'Bind source',
    status VARCHAR(16) NOT NULL COMMENT 'Bind status',
    score INT NOT NULL DEFAULT 100 COMMENT 'Bind score',
    match_context TEXT COMMENT 'Matched identities json',
    creator VARCHAR(64) COMMENT 'Creator',
    modifier VARCHAR(64) COMMENT 'Modifier',
    gmt_create DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Create time',
    gmt_update DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    UNIQUE KEY uk_hzb_entity_monitor_bind (entity_id, monitor_id),
    INDEX idx_hzb_entity_monitor_bind_entity (entity_id),
    INDEX idx_hzb_entity_monitor_bind_monitor (monitor_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE hzb_entity_relation (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    source_entity_id BIGINT NOT NULL COMMENT 'Source entity ID',
    target_entity_id BIGINT NULL COMMENT 'Target entity ID',
    target_ref VARCHAR(255) COMMENT 'Target entity reference',
    relation_type VARCHAR(32) NOT NULL COMMENT 'Relation type',
    relation_source VARCHAR(32) NOT NULL COMMENT 'Relation source',
    status VARCHAR(16) NOT NULL COMMENT 'Relation status',
    score INT NOT NULL DEFAULT 100 COMMENT 'Relation score',
    description VARCHAR(255) COMMENT 'Relation description',
    attributes TEXT COMMENT 'Relation attributes json',
    creator VARCHAR(64) COMMENT 'Creator',
    modifier VARCHAR(64) COMMENT 'Modifier',
    gmt_create DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Create time',
    gmt_update DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    UNIQUE KEY uk_hzb_entity_relation (source_entity_id, target_entity_id, relation_type),
    INDEX idx_hzb_entity_relation_source (source_entity_id),
    INDEX idx_hzb_entity_relation_target (target_entity_id),
    INDEX idx_hzb_entity_relation_target_ref (target_ref)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE hzb_entity_definition_activity (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    entity_id BIGINT NOT NULL COMMENT 'Entity ID',
    workspace_id VARCHAR(64) NOT NULL DEFAULT 'default' COMMENT 'Workspace ID',
    activity_type VARCHAR(32) NOT NULL COMMENT 'Definition activity type',
    format VARCHAR(16) NOT NULL COMMENT 'Definition format',
    status VARCHAR(16) NOT NULL COMMENT 'Activity status',
    summary VARCHAR(128) NOT NULL COMMENT 'Activity summary',
    detail VARCHAR(255) COMMENT 'Activity detail',
    creator VARCHAR(64) COMMENT 'Creator',
    gmt_create DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Create time',
    INDEX idx_hzb_entity_definition_activity_entity (entity_id),
    INDEX idx_hzb_entity_definition_activity_workspace_time (workspace_id, gmt_create),
    INDEX idx_hzb_entity_definition_activity_time (gmt_create)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE hzb_entity_governance_state (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    state_scope VARCHAR(32) NOT NULL COMMENT 'Governance scope, such as discovery',
    state_kind VARCHAR(32) NOT NULL COMMENT 'State kind, such as preset or activity',
    workspace_id VARCHAR(64) NOT NULL DEFAULT 'default' COMMENT 'Workspace ID',
    state_key VARCHAR(128) NOT NULL COMMENT 'Stable state key',
    state_name VARCHAR(128) COMMENT 'State display name',
    status VARCHAR(32) COMMENT 'State status',
    content TEXT COMMENT 'State JSON content',
    creator VARCHAR(64) COMMENT 'Creator',
    gmt_create DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Create time',
    gmt_update DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    UNIQUE KEY uk_hzb_entity_governance_state_scope_kind_workspace_key (state_scope, state_kind, workspace_id, state_key),
    INDEX idx_hzb_entity_governance_state_scope_kind (state_scope, state_kind),
    INDEX idx_hzb_entity_governance_state_scope_kind_workspace (state_scope, state_kind, workspace_id),
    INDEX idx_hzb_entity_governance_state_update (gmt_update),
    INDEX idx_hzb_entity_governance_state_creator (creator)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE hzb_auth_token (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) COMMENT 'API token name',
    token_hash VARCHAR(128) NOT NULL COMMENT 'SHA-256 hash of token value',
    token_mask VARCHAR(64) COMMENT 'Masked token value for display',
    token_scope VARCHAR(32) NOT NULL DEFAULT 'api-admin' COMMENT 'Token access scope',
    workspace_id VARCHAR(64) NOT NULL DEFAULT 'default' COMMENT 'Token workspace boundary',
    status TINYINT NOT NULL DEFAULT 0 COMMENT 'Token status, 0 means active',
    creator VARCHAR(64) COMMENT 'Token creator',
    gmt_create DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Create time',
    expire_time DATETIME NULL COMMENT 'Expire time, null means long-lived',
    last_used_time DATETIME NULL COMMENT 'Last used time',
    revoked_time DATETIME NULL COMMENT 'Token revoked time',
    revoked_by VARCHAR(64) COMMENT 'Token revoker',
    UNIQUE KEY uk_hzb_auth_token_hash (token_hash),
    INDEX idx_hzb_auth_token_creator (creator),
    INDEX idx_hzb_auth_token_scope (token_scope),
    INDEX idx_hzb_auth_token_workspace (workspace_id),
    INDEX idx_hzb_auth_token_scope_workspace (token_scope, workspace_id),
    INDEX idx_hzb_auth_token_status (status),
    INDEX idx_hzb_auth_token_revoked_by (revoked_by)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE hzb_signal_saved_view (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    creator VARCHAR(255) NOT NULL COMMENT 'Saved view creator',
    signal VARCHAR(32) NOT NULL COMMENT 'Signal type: logs, traces, or metrics',
    view_key VARCHAR(128) NOT NULL COMMENT 'Stable saved view key',
    label VARCHAR(255) NOT NULL COMMENT 'Saved view display label',
    description VARCHAR(512) COMMENT 'Saved view description',
    route VARCHAR(2048) NOT NULL COMMENT 'Explorer route snapshot',
    query_snapshot TEXT COMMENT 'Query-state snapshot JSON',
    payload TEXT COMMENT 'Additional saved view payload JSON',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Create time',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    UNIQUE KEY uk_hzb_signal_saved_view_signal_key (signal, view_key),
    INDEX idx_hzb_signal_saved_view_signal (signal),
    INDEX idx_hzb_signal_saved_view_update (update_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE hzb_signal_dashboard_panel_draft (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    creator VARCHAR(255) NOT NULL COMMENT 'Panel draft creator',
    signal VARCHAR(32) NOT NULL COMMENT 'Signal type: logs, traces, or metrics',
    draft_key VARCHAR(128) NOT NULL COMMENT 'Stable dashboard panel draft key',
    title VARCHAR(255) NOT NULL COMMENT 'Dashboard panel title',
    description VARCHAR(512) COMMENT 'Dashboard panel description',
    visualization VARCHAR(32) NOT NULL COMMENT 'Dashboard panel visualization type',
    route VARCHAR(2048) NOT NULL COMMENT 'Explorer route snapshot',
    query_snapshot TEXT COMMENT 'Query-state snapshot JSON',
    payload TEXT COMMENT 'Additional dashboard panel payload JSON',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Create time',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    UNIQUE KEY uk_hzb_signal_dashboard_panel_draft_creator_signal_key (creator, signal, draft_key),
    INDEX idx_hzb_signal_dashboard_panel_draft_creator_signal (creator, signal),
    INDEX idx_hzb_signal_dashboard_panel_draft_update (update_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;

CREATE TABLE hzb_signal_dashboard (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    creator VARCHAR(255) NOT NULL COMMENT 'Dashboard creator',
    dashboard_key VARCHAR(128) NOT NULL COMMENT 'Stable dashboard key',
    title VARCHAR(255) NOT NULL COMMENT 'Dashboard title',
    description VARCHAR(512) COMMENT 'Dashboard description',
    tags VARCHAR(512) COMMENT 'Comma-separated dashboard tags',
    layout TEXT NOT NULL COMMENT 'Dashboard layout JSON',
    widgets TEXT NOT NULL COMMENT 'Dashboard widgets JSON',
    variables TEXT COMMENT 'Dashboard variables JSON',
    panel_map TEXT COMMENT 'Dashboard panel grouping JSON',
    version VARCHAR(32) COMMENT 'Dashboard schema version',
    create_time DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT 'Create time',
    update_time DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT 'Update time',
    UNIQUE KEY uk_hzb_signal_dashboard_key (dashboard_key),
    INDEX idx_hzb_signal_dashboard_update (update_time)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
