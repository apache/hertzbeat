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

ALTER TABLE hzb_entity_governance_state
    ADD COLUMN IF NOT EXISTS workspace_id VARCHAR(64) DEFAULT 'default';

UPDATE hzb_entity_governance_state
SET workspace_id = 'default'
WHERE workspace_id IS NULL OR workspace_id = '';

ALTER TABLE hzb_entity_governance_state
    ALTER COLUMN workspace_id SET DEFAULT 'default';

CREATE UNIQUE INDEX IF NOT EXISTS uk_hzb_entity_governance_state_scope_kind_workspace_key
    ON hzb_entity_governance_state(state_scope, state_kind, workspace_id, state_key);

CREATE INDEX IF NOT EXISTS idx_hzb_entity_governance_state_scope_kind_workspace
    ON hzb_entity_governance_state(state_scope, state_kind, workspace_id);
