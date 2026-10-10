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

import com.usthe.sureness.processor.exception.ExpiredCredentialsException;
import com.usthe.sureness.processor.support.JwtProcessor;
import com.usthe.sureness.provider.SurenessAccount;
import com.usthe.sureness.provider.SurenessAccountProvider;
import com.usthe.sureness.subject.Subject;
import com.usthe.sureness.util.JsonWebTokenUtil;
import io.jsonwebtoken.Claims;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenScopes;
import org.apache.hertzbeat.common.observability.gateway.ObservabilityAccessTokenGateway;

/** Enforces credential generations when UI-session JWTs enter through Sureness directly. */
final class VersionedJwtProcessor extends JwtProcessor {
    private final SurenessAccountProvider accounts;

    VersionedJwtProcessor(SurenessAccountProvider accounts) {
        this.accounts = accounts;
    }

    @Override
    public Subject authenticated(Subject subject) {
        Subject authenticated = super.authenticated(subject);
        Claims claims = JsonWebTokenUtil.parseJwt(String.valueOf(subject.getCredential()));
        if (!AuthTokenScopes.UI_SESSION.equals(claims.get(AuthTokenScopes.CLAIM_TOKEN_SCOPE, String.class))) {
            return authenticated;
        }
        SurenessAccount account = accounts.loadAccount(claims.getSubject());
        requireUsable(account);
        Long claimed = claims.get(ObservabilityAccessTokenGateway.CLAIM_CREDENTIAL_VERSION, Long.class);
        if (account instanceof VersionedAccount versioned
                && (claimed == null || claimed != versioned.credentialVersion())) {
            throw new ExpiredCredentialsException("session credentials are outdated");
        }
        return authenticated;
    }

    private static void requireUsable(SurenessAccount account) {
        if (account == null || account.isDisabledAccount() || account.isExcessiveAttempts()) {
            throw new ExpiredCredentialsException("session account is unavailable");
        }
    }
}
