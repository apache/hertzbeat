/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.manager.ui.session;

import java.time.Instant;

/**
 * Internal token handoff from session service to cookie writer.
 */
final class UiSessionTokens {

    private final String accessToken;
    private final String refreshToken;
    private final Instant accessExpiresAt;
    private final Instant refreshExpiresAt;
    private final UiSessionView session;

    UiSessionTokens(String accessToken, String refreshToken, Instant accessExpiresAt,
                    Instant refreshExpiresAt, UiSessionView session) {
        this.accessToken = accessToken;
        this.refreshToken = refreshToken;
        this.accessExpiresAt = accessExpiresAt;
        this.refreshExpiresAt = refreshExpiresAt;
        this.session = session;
    }

    String accessToken() {
        return accessToken;
    }

    String refreshToken() {
        return refreshToken;
    }

    Instant accessExpiresAt() {
        return accessExpiresAt;
    }

    Instant refreshExpiresAt() {
        return refreshExpiresAt;
    }

    UiSessionView session() {
        return session;
    }

    @Override
    public String toString() {
        return "UiSessionTokens[redacted]";
    }
}
