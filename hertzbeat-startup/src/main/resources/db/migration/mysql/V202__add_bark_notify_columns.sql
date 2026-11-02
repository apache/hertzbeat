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

-- Preserve the newly mapped optional Bark notification fields without changing existing receiver data.
SET @hzb_ai_ddl = IF((SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='hzb_notice_receiver')=1 AND (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='hzb_notice_receiver' AND column_name='bark_server_url')=0, 'ALTER TABLE hzb_notice_receiver ADD COLUMN bark_server_url VARCHAR(300)', 'SELECT 1');
PREPARE hzb_ai_statement FROM @hzb_ai_ddl;
EXECUTE hzb_ai_statement;
DEALLOCATE PREPARE hzb_ai_statement;
SET @hzb_ai_ddl = IF((SELECT COUNT(*) FROM information_schema.tables WHERE table_schema=DATABASE() AND table_name='hzb_notice_receiver')=1 AND (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema=DATABASE() AND table_name='hzb_notice_receiver' AND column_name='bark_device_key')=0, 'ALTER TABLE hzb_notice_receiver ADD COLUMN bark_device_key VARCHAR(300)', 'SELECT 1');
PREPARE hzb_ai_statement FROM @hzb_ai_ddl;
EXECUTE hzb_ai_statement;
DEALLOCATE PREPARE hzb_ai_statement;
