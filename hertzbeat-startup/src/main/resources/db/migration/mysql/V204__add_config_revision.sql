-- Licensed to the Apache Software Foundation (ASF) under one or more
-- contributor license agreements. See the NOTICE file distributed with
-- this work for additional information regarding copyright ownership.
-- The ASF licenses this file to You under the Apache License, Version 2.0.

ALTER TABLE hzb_config ADD COLUMN config_revision VARCHAR(36) NULL;
UPDATE hzb_config SET config_revision = UUID() WHERE config_revision IS NULL;
ALTER TABLE hzb_config MODIFY COLUMN config_revision VARCHAR(36) NOT NULL;
