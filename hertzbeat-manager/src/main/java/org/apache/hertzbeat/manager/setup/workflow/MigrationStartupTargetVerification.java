/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

/** Stable, secret-free result of read-only restart target verification. */
enum MigrationStartupTargetVerification {
    CONFIRMED,
    DETERMINISTIC_MISMATCH,
    TRANSIENT_UNAVAILABLE
}
