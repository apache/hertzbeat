/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.util.Objects;
import java.util.regex.Pattern;
import org.apache.hertzbeat.manager.setup.api.OperationIdValidator;

/** Secret-free identity required to durably prepare one retained cutover. */
record RetainedCutoverPreparationContext(String operationId, String targetIdentityHash) {

    private static final Pattern IDENTITY_HASH = Pattern.compile("[0-9a-f]{64}");

    RetainedCutoverPreparationContext {
        if (!OperationIdValidator.isSafe(operationId)) {
            throw new IllegalArgumentException("Unsafe operation identifier");
        }
        Objects.requireNonNull(targetIdentityHash, "targetIdentityHash");
        if (!IDENTITY_HASH.matcher(targetIdentityHash).matches()) {
            throw new IllegalArgumentException("Invalid target identity hash");
        }
    }
}
