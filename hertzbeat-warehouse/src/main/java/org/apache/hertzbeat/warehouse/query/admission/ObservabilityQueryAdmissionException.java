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

package org.apache.hertzbeat.warehouse.query.admission;

/** Signals an overloaded or cancelled observability query before execution. */
public class ObservabilityQueryAdmissionException extends RuntimeException {

    private final String signal;
    private final Reason reason;

    public ObservabilityQueryAdmissionException(String signal, Reason reason, Throwable cause) {
        super(message(signal, reason), cause);
        this.signal = signal;
        this.reason = reason;
    }

    public String getSignal() {
        return signal;
    }

    public Reason getReason() {
        return reason;
    }

    private static String message(String signal, Reason reason) {
        return switch (reason) {
            case OVERLOADED -> "Observability " + signal + " query capacity is exhausted.";
            case CANCELLED -> "Observability " + signal + " query admission was cancelled.";
        };
    }

    /** Query admission failure classification used by the HTTP exception boundary. */
    public enum Reason {
        OVERLOADED,
        CANCELLED
    }
}
