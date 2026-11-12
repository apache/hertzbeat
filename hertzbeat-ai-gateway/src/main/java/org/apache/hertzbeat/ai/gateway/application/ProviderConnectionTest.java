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

package org.apache.hertzbeat.ai.gateway.application;

import org.apache.hertzbeat.common.entity.dto.ModelProviderConfig;

/** Synthetic connection tests carry no conversation, observation or tool input. */
public final class ProviderConnectionTest {
    private ProviderConnectionTest() { }

    /** Ephemeral form snapshot, never persisted. */
    public record Request(String requestId, ModelProviderConfig config) { }

    /** Redacted public diagnostic categories. */
    public enum Category {
        OK, CONFIGURATION, CREDENTIAL_REQUIRED, AUTHENTICATION, ADDRESS_PATH,
        MODEL, PROTOCOL, TIMEOUT, CANCELLED, BUSY, RATE_LIMIT, UPSTREAM, TLS, NETWORK
    }

    /** Only non-sensitive metadata leaves the probe. */
    public record Result(String protocol, String model, long elapsedMs, Category category, Integer httpStatus) { }
}
