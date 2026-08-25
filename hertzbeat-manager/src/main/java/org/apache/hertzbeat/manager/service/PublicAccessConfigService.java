/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.service;

import org.apache.hertzbeat.manager.pojo.dto.PublicAccessConfig;
import org.apache.hertzbeat.manager.pojo.dto.PublicAccessConfigRequest;

/** Reads setup defaults and updates the runtime public-access configuration. */
public interface PublicAccessConfigService {
    PublicAccessConfig getConfig();

    PublicAccessConfig saveAndGetConfig(PublicAccessConfigRequest request);
}
