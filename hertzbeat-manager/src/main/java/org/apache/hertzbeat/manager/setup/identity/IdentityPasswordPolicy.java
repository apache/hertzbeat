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

import java.nio.CharBuffer;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Component;

/** Owns the persisted identity password algorithm and work factor. */
@Component
public final class IdentityPasswordPolicy {
    static final int BCRYPT_COST = 12;
    private final BCryptPasswordEncoder bcrypt = new BCryptPasswordEncoder(BCRYPT_COST);

    public String encode(char[] clearPassword) {
        return bcrypt.encode(CharBuffer.wrap(clearPassword));
    }

    public boolean matches(CharSequence supplied, String hash) {
        return bcrypt.matches(supplied, hash);
    }
}
