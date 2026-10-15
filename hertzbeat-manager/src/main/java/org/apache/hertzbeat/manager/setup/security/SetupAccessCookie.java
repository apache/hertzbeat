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

import java.time.Duration;
import java.time.Clock;
import org.springframework.http.ResponseCookie;

/** Transport policy for the remote setup capability. */
public final class SetupAccessCookie {
    public static final String NAME = "hertzbeat_setup";

    private SetupAccessCookie() {
    }

    public static ResponseCookie create(SetupAccessSession session, boolean secure, Clock clock) {
        long seconds = Math.max(1, Duration.between(clock.instant(), session.expiresAt()).getSeconds());
        return ResponseCookie.from(NAME, session.token()).httpOnly(true).sameSite("Strict").secure(secure)
                .path("/api/setup").maxAge(Duration.ofSeconds(seconds)).build();
    }
}
