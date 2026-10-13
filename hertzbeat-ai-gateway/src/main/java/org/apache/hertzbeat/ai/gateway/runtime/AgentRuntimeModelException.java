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

/**
 * Runtime model boundary exception with explicit retry semantics.
 */
public class AgentRuntimeModelException extends RuntimeException {

    private final boolean retryable;

    public AgentRuntimeModelException(String message, boolean retryable) {
        super(message);
        this.retryable = retryable;
    }

    public AgentRuntimeModelException(String message, boolean retryable, Throwable cause) {
        super(message, cause);
        this.retryable = retryable;
    }

    public boolean isRetryable() {
        return retryable;
    }

    public static AgentRuntimeModelException retryable(String message, Throwable cause) {
        return new AgentRuntimeModelException(message, true, cause);
    }

    public static AgentRuntimeModelException nonRetryable(String message, Throwable cause) {
        return new AgentRuntimeModelException(message, false, cause);
    }
}
