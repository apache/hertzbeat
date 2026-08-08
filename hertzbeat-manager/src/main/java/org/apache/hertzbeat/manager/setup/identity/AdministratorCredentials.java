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

package org.apache.hertzbeat.manager.setup.identity;

import java.util.Arrays;
import org.apache.commons.lang3.StringUtils;

/** Write-only administrator credential input. */
public final class AdministratorCredentials implements AutoCloseable {
    private final String username;
    private final char[] password;

    public AdministratorCredentials(String username, char[] password) {
        String normalizedUsername = StringUtils.trimToNull(username);
        if (normalizedUsername == null) {
            throw new IllegalArgumentException("Administrator username is required");
        }
        if (password == null || password.length == 0) {
            throw new IllegalArgumentException("Administrator password is required");
        }
        this.username = normalizedUsername;
        this.password = password.clone();
    }

    String username() {
        return username;
    }

    char[] copyPassword() {
        return password.clone();
    }

    @Override
    public void close() {
        Arrays.fill(password, '\0');
    }

    @Override
    public String toString() {
        return "AdministratorCredentials[username=" + username + ", password=redacted]";
    }
}
