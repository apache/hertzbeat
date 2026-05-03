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
    component_of TEXT,
    components TEXT,
    implemented_by TEXT,
    api_interface TEXT,
    inherit_from VARCHAR(255),
    languages TEXT,
    links TEXT,
    contacts TEXT,
    integrations TEXT,
    extensions TEXT,
    hertzbeat TEXT,
    source VARCHAR(32) NOT NULL,
    description VARCHAR(512),
    labels VARCHAR(4096),
    tags TEXT,
    creator VARCHAR(64),
    modifier VARCHAR(64),
    gmt_create TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    gmt_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_hzb_entity_type ON hzb_entity(entity_type);
CREATE INDEX idx_hzb_entity_status ON hzb_entity(status);
CREATE INDEX idx_hzb_entity_name ON hzb_entity(name);
CREATE INDEX idx_hzb_entity_owner ON hzb_entity(owner);

CREATE TABLE hzb_entity_identity (
    id BIGSERIAL PRIMARY KEY,
    entity_id BIGINT NOT NULL,
    identity_type VARCHAR(32) NOT NULL,
    identity_key VARCHAR(128) NOT NULL,
    identity_value VARCHAR(512) NOT NULL,
    normalized_value VARCHAR(512) NOT NULL,
    priority INT NOT NULL DEFAULT 40,
    primary_identity BOOLEAN NOT NULL DEFAULT FALSE,
    creator VARCHAR(64),
    modifier VARCHAR(64),
    gmt_create TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    gmt_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX uk_hzb_entity_identity ON hzb_entity_identity(entity_id, identity_key, normalized_value);
CREATE INDEX idx_hzb_entity_identity_lookup ON hzb_entity_identity(identity_key, normalized_value);
CREATE INDEX idx_hzb_entity_identity_entity ON hzb_entity_identity(entity_id);

CREATE TABLE hzb_entity_monitor_bind (
    id BIGSERIAL PRIMARY KEY,
    entity_id BIGINT NOT NULL,
    monitor_id BIGINT NOT NULL,
    bind_type VARCHAR(32) NOT NULL,
    bind_source VARCHAR(64) NOT NULL,
    status VARCHAR(16) NOT NULL,
    score INT NOT NULL DEFAULT 100,
    match_context TEXT,
    creator VARCHAR(64),
    modifier VARCHAR(64),
    gmt_create TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    gmt_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX uk_hzb_entity_monitor_bind ON hzb_entity_monitor_bind(entity_id, monitor_id);
CREATE INDEX idx_hzb_entity_monitor_bind_entity ON hzb_entity_monitor_bind(entity_id);
CREATE INDEX idx_hzb_entity_monitor_bind_monitor ON hzb_entity_monitor_bind(monitor_id);

CREATE TABLE hzb_entity_relation (
    id BIGSERIAL PRIMARY KEY,
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
    gmt_create TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    gmt_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX uk_hzb_entity_relation ON hzb_entity_relation(source_entity_id, target_entity_id, relation_type);
CREATE INDEX idx_hzb_entity_relation_source ON hzb_entity_relation(source_entity_id);
CREATE INDEX idx_hzb_entity_relation_target ON hzb_entity_relation(target_entity_id);
CREATE INDEX idx_hzb_entity_relation_target_ref ON hzb_entity_relation(target_ref);

CREATE TABLE hzb_entity_definition_activity (
    id BIGSERIAL PRIMARY KEY,
    entity_id BIGINT NOT NULL,
    activity_type VARCHAR(32) NOT NULL,
    format VARCHAR(16) NOT NULL,
    status VARCHAR(16) NOT NULL,
    summary VARCHAR(128) NOT NULL,
    detail VARCHAR(255),
    creator VARCHAR(64),
    gmt_create TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_hzb_entity_definition_activity_entity
    ON hzb_entity_definition_activity(entity_id);

CREATE INDEX idx_hzb_entity_definition_activity_time
    ON hzb_entity_definition_activity(gmt_create);

CREATE TABLE hzb_entity_governance_state (
    id BIGSERIAL PRIMARY KEY,
    state_scope VARCHAR(32) NOT NULL,
    state_kind VARCHAR(32) NOT NULL,
    state_key VARCHAR(128) NOT NULL,
    state_name VARCHAR(128),
    status VARCHAR(32),
    content TEXT,
    creator VARCHAR(64),
    gmt_create TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    gmt_update TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX uk_hzb_entity_governance_state_scope_kind_key
    ON hzb_entity_governance_state(state_scope, state_kind, state_key);

CREATE INDEX idx_hzb_entity_governance_state_scope_kind
    ON hzb_entity_governance_state(state_scope, state_kind);

CREATE INDEX idx_hzb_entity_governance_state_update
    ON hzb_entity_governance_state(gmt_update);

CREATE INDEX idx_hzb_entity_governance_state_creator
    ON hzb_entity_governance_state(creator);

CREATE TABLE hzb_auth_token (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255),
    token_hash VARCHAR(128) NOT NULL,
    token_mask VARCHAR(64),
    status SMALLINT NOT NULL DEFAULT 0,
    creator VARCHAR(64),
    gmt_create TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expire_time TIMESTAMP NULL,
    last_used_time TIMESTAMP NULL
);

CREATE UNIQUE INDEX uk_hzb_auth_token_hash ON hzb_auth_token(token_hash);
CREATE INDEX idx_hzb_auth_token_creator ON hzb_auth_token(creator);
CREATE INDEX idx_hzb_auth_token_status ON hzb_auth_token(status);
