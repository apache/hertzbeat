/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.api;

import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.FactoryResetRequest;
import org.apache.hertzbeat.manager.setup.api.DeploymentApiContract.FactoryResetResponse;

/** Authenticated boundary for durably admitting a complete HertzBeat factory reset. */
public interface FactoryResetWorkflow {

    FactoryResetResponse reset(FactoryResetRequest request);
}
