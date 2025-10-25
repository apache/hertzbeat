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

-- ensure every sql can rerun without error

ALTER TABLE HZB_PARAM ADD COLUMN IF NOT EXISTS "value" VARCHAR(255);
UPDATE HZB_PARAM SET param_value = "value" WHERE "value" IS NOT NULL AND param_value IS NULL;
ALTER TABLE HZB_PARAM DROP COLUMN "value";

ALTER TABLE HZB_TAG ADD COLUMN IF NOT EXISTS "value" VARCHAR(255);
UPDATE HZB_TAG SET tag_value = "value" WHERE "value" IS NOT NULL AND tag_value IS NULL;
ALTER TABLE HZB_TAG DROP COLUMN "value";

ALTER TABLE HZB_STATUS_PAGE_HISTORY ADD COLUMN IF NOT EXISTS "unknown" integer;
UPDATE HZB_STATUS_PAGE_HISTORY SET unknowing = "unknown" WHERE "unknown" IS NOT NULL AND unknowing IS NULL;
ALTER TABLE HZB_STATUS_PAGE_HISTORY DROP COLUMN "unknown";
