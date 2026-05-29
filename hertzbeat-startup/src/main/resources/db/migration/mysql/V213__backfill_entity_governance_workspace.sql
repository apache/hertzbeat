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

DELIMITER //
CREATE PROCEDURE BackfillEntityGovernanceWorkspace()
BEGIN
    DECLARE table_exists INT DEFAULT 0;
    DECLARE workspace_column_exists INT DEFAULT 0;
    DECLARE workspace_index_exists INT DEFAULT 0;
    DECLARE workspace_unique_exists INT DEFAULT 0;

    SELECT COUNT(*) INTO table_exists
    FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'hzb_entity_governance_state';

    IF table_exists = 1 THEN
        SELECT COUNT(*) INTO workspace_column_exists
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'hzb_entity_governance_state'
          AND COLUMN_NAME = 'workspace_id';

        IF workspace_column_exists = 0 THEN
            ALTER TABLE hzb_entity_governance_state
                ADD COLUMN workspace_id VARCHAR(64) DEFAULT 'default';
        END IF;

        UPDATE hzb_entity_governance_state
        SET workspace_id = 'default'
        WHERE workspace_id IS NULL OR workspace_id = '';

        SELECT COUNT(*) INTO workspace_unique_exists
        FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'hzb_entity_governance_state'
          AND INDEX_NAME = 'uk_hzb_entity_governance_state_scope_kind_workspace_key';

        IF workspace_unique_exists = 0 THEN
            CREATE UNIQUE INDEX uk_hzb_entity_governance_state_scope_kind_workspace_key
                ON hzb_entity_governance_state(state_scope, state_kind, workspace_id, state_key);
        END IF;

        SELECT COUNT(*) INTO workspace_index_exists
        FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'hzb_entity_governance_state'
          AND INDEX_NAME = 'idx_hzb_entity_governance_state_scope_kind_workspace';

        IF workspace_index_exists = 0 THEN
            CREATE INDEX idx_hzb_entity_governance_state_scope_kind_workspace
                ON hzb_entity_governance_state(state_scope, state_kind, workspace_id);
        END IF;
    END IF;
END //
DELIMITER ;

CALL BackfillEntityGovernanceWorkspace();
DROP PROCEDURE IF EXISTS BackfillEntityGovernanceWorkspace;
