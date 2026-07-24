-- Licensed to the Apache Software Foundation (ASF) under one or more
-- contributor license agreements. See the NOTICE file distributed with
-- this work for additional information regarding copyright ownership.
-- The ASF licenses this file to You under the Apache License, Version 2.0.

ALTER TABLE hzb_auth_token ADD COLUMN token_audience VARCHAR(32);
ALTER TABLE hzb_auth_token ADD COLUMN collector_id VARCHAR(128);
ALTER TABLE hzb_auth_token ADD COLUMN allowed_signals VARCHAR(64);
CREATE INDEX idx_hzb_auth_token_collector ON hzb_auth_token(collector_id);
