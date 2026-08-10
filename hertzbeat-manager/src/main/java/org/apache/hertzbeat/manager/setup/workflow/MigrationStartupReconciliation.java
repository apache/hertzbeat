/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

/** Secret-free startup reconciliation outcome. */
enum MigrationStartupReconciliation {
    NO_MIGRATION,
    GATED,
    SUCCEEDED,
    ALREADY_SUCCEEDED,
    ROLLED_BACK_RESTART_REQUIRED,
    ALREADY_ROLLED_BACK_RESTART_REQUIRED
}
