/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

package org.apache.hertzbeat.manager.setup.workflow;

/** Secret-free signal that exact cutover cleanup still belongs to the same operation. */
final class RetainedCutoverReleaseRequiredException extends RuntimeException {

    RetainedCutoverReleaseRequiredException() {
        super("Retained cutover release requires recovery");
    }

    static void attach(Error fatal) {
        for (Throwable suppressed : fatal.getSuppressed()) {
            if (suppressed instanceof RetainedCutoverReleaseRequiredException) {
                return;
            }
        }
        fatal.addSuppressed(new RetainedCutoverReleaseRequiredException());
    }
}
