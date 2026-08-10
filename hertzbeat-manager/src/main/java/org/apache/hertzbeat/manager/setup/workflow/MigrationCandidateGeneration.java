/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import org.apache.hertzbeat.manager.setup.api.OperationIdValidator;

/** Deterministic, secret-free candidate generation derived from a validated operation id. */
final class MigrationCandidateGeneration {

    private MigrationCandidateGeneration() {
    }

    static String fromOperationId(String operationId) {
        if (!OperationIdValidator.isSafe(operationId)) {
            throw new IllegalArgumentException("Invalid migration operation id");
        }
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(operationId.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException impossible) {
            throw new IllegalStateException("SHA-256 is unavailable");
        }
    }
}
