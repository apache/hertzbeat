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

package org.apache.hertzbeat.manager.setup.security;

/** Typed setup unlock failure that an API boundary can map without parsing exception text. */
public final class SetupUnlockRejected extends IllegalStateException {
    /** Stable rejection categories exposed to the setup HTTP boundary. */
    public enum Reason {
        INVALID,
        EXPIRED,
        RATE_LIMITED
    }

    private final Reason reason;

    public SetupUnlockRejected(Reason reason) {
        super(safeMessage(reason));
        this.reason = reason;
    }

    public Reason reason() {
        return reason;
    }

    private static String safeMessage(Reason reason) {
        return switch (reason) {
            case INVALID -> "Setup unlock proof is invalid";
            case EXPIRED -> "Setup unlock proof is expired";
            case RATE_LIMITED -> "Setup unlock attempts exceeded";
        };
    }
}
