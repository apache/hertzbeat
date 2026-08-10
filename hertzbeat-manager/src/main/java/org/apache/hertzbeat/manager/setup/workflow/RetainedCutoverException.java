/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import java.util.Locale;
import java.util.Objects;

/** Cause-free retained cutover failure safe for a later workflow boundary. */
final class RetainedCutoverException extends RuntimeException {

    private final RetainedCutoverErrorCode code;

    RetainedCutoverException(RetainedCutoverErrorCode code) {
        super("Retained cutover failed: "
                + Objects.requireNonNull(code, "code").name().toLowerCase(Locale.ROOT));
        this.code = code;
    }

    RetainedCutoverErrorCode code() {
        return code;
    }
}
