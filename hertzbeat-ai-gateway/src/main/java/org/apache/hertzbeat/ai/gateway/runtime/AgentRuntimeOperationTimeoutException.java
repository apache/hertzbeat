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

package org.apache.hertzbeat.ai.gateway.runtime;

import java.time.Duration;
import java.util.Objects;
import org.springframework.util.StringUtils;

/**
 * Raised when one bounded operation exceeds its own timeout before runtime stop is requested.
 */
public class AgentRuntimeOperationTimeoutException extends RuntimeException {

    private final Duration timeout;

    public AgentRuntimeOperationTimeoutException(String operation, Duration timeout) {
        // BlockingTaskRunner creates this exception only for a named operation with a validated timeout.
        super(timeoutMessage(operation, timeout));
        this.timeout = timeout;
    }

    private static String timeoutMessage(String operation, Duration timeout) {
        // Exception message construction precedes field assignment, so this helper owns constructor validation.
        if (!StringUtils.hasText(operation)) {
            throw new IllegalArgumentException("operation must not be blank");
        }
        Objects.requireNonNull(timeout, "timeout must not be null");
        if (timeout.isZero() || timeout.isNegative()) {
            throw new IllegalArgumentException("timeout must be positive");
        }
        return operation + " timed out after " + timeout.toMillis() + "ms.";
    }

    public Duration getTimeout() {
        return timeout;
    }
}
