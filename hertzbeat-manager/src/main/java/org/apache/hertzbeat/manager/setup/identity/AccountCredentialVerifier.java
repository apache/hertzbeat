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

import com.usthe.sureness.provider.SurenessAccount;
import java.nio.ByteBuffer;
import java.nio.CharBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Arrays;
import java.util.HexFormat;
import org.apache.commons.lang3.StringUtils;
import org.springframework.stereotype.Component;

/** Single password-verification policy shared by form and BASIC authentication. */
@Component
public final class AccountCredentialVerifier {
    private final IdentityPasswordPolicy passwords;

    public AccountCredentialVerifier(IdentityPasswordPolicy passwords) {
        this.passwords = passwords;
    }

    public boolean matches(SurenessAccount account, String supplied) {
        if (supplied == null) {
            return false;
        }
        char[] copy = supplied.toCharArray();
        try {
            return matches(account, copy);
        } finally {
            Arrays.fill(copy, '\0');
        }
    }

    public boolean matches(SurenessAccount account, char[] supplied) {
        if (account == null || StringUtils.isBlank(account.getPassword()) || supplied == null) {
            return false;
        }
        if (account instanceof VersionedAccount versioned && versioned.bcryptPassword()) {
            return passwords.matches(CharBuffer.wrap(supplied), account.getPassword());
        }
        if (StringUtils.isBlank(account.getSalt())) {
            return account.getPassword().contentEquals(CharBuffer.wrap(supplied));
        }
        return account.getPassword().equals(legacyMd5(supplied, account.getSalt()));
    }

    public boolean usable(SurenessAccount account) {
        return account != null && !account.isDisabledAccount() && !account.isExcessiveAttempts();
    }

    private static String legacyMd5(char[] supplied, String salt) {
        ByteBuffer encodedPassword = StandardCharsets.UTF_8.encode(CharBuffer.wrap(supplied));
        byte[] encodedSalt = salt.getBytes(StandardCharsets.UTF_8);
        try {
            MessageDigest md5 = MessageDigest.getInstance("MD5");
            md5.update(encodedPassword);
            md5.update(encodedSalt);
            return HexFormat.of().withUpperCase().formatHex(md5.digest());
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("MD5 is unavailable for legacy credential migration", exception);
        } finally {
            if (encodedPassword.hasArray()) {
                Arrays.fill(encodedPassword.array(), (byte) 0);
            }
            Arrays.fill(encodedSalt, (byte) 0);
        }
    }
}
