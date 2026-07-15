-- Licensed to the Apache Software Foundation (ASF) under one or more
-- contributor license agreements. See the NOTICE file distributed with
-- this work for additional information regarding copyright ownership.
-- The ASF licenses this file to You under the Apache License, Version 2.0.

ALTER TABLE hzb_auth_token
    ADD COLUMN token_audience VARCHAR(32) NULL,
    ADD COLUMN collector_id VARCHAR(128) NULL,
    ADD COLUMN allowed_signals VARCHAR(64) NULL,
    ADD INDEX idx_hzb_auth_token_collector (collector_id);
