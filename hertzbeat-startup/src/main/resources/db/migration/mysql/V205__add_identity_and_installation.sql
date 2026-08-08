-- Licensed to the Apache Software Foundation (ASF) under one or more
-- contributor license agreements. See the NOTICE file distributed with
-- this work for additional information regarding copyright ownership.
-- The ASF licenses this file to You under the Apache License, Version 2.0.
CREATE TABLE IF NOT EXISTS hzb_account (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
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
