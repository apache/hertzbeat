/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

/** Secret-free manager-side startup recovery disposition. */
public enum ManagedMigrationStartupRecoveryDisposition {
    NO_MIGRATION,
    GATED_RECOVERY,
    RELOAD_FULL_GATED
}
