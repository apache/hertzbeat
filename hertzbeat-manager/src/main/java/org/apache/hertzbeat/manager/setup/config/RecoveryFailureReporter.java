/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.manager.setup.config;

/** Secret-free diagnostic boundary for managed configuration recovery failures. */
@FunctionalInterface
public interface RecoveryFailureReporter {
    void report(Stage stage, Store store, String exceptionClass);

    /** Reports diagnostics without allowing an adapter failure to change recovery control flow. */
    static void reportSafely(RecoveryFailureReporter reporter, Stage stage, Store store, Exception failure) {
        try {
            reporter.report(stage, store, failure.getClass().getName());
        } catch (RuntimeException ignored) {
            // Recovery and rollback outcomes are authoritative over diagnostics.
        }
    }

    /** Recovery operation stage that failed. */
    enum Stage {
        DISCARD_CANDIDATE,
        PROMOTE_CANDIDATE,
        RESTORE_ACTIVE
    }

    /** Managed aggregate member involved in the failure. */
    enum Store {
        APPLICATION,
        SECRET
    }
}
