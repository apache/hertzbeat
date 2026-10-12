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

import com.usthe.sureness.processor.exception.DisabledAccountException;
import com.usthe.sureness.processor.exception.ExcessiveAttemptsException;
import com.usthe.sureness.processor.exception.IncorrectCredentialsException;
import com.usthe.sureness.processor.exception.UnknownAccountException;
import com.usthe.sureness.processor.support.PasswordProcessor;
import com.usthe.sureness.provider.SurenessAccount;
import com.usthe.sureness.provider.SurenessAccountProvider;
import com.usthe.sureness.subject.Subject;

/** Adds BCrypt verification to Sureness BASIC authentication while retaining legacy verification. */
final class BcryptPasswordProcessor extends PasswordProcessor {
    private final SurenessAccountProvider accounts;
    private final AccountCredentialVerifier verifier;

    BcryptPasswordProcessor(SurenessAccountProvider accounts, AccountCredentialVerifier verifier) {
        this.accounts = accounts;
        this.verifier = verifier;
        setAccountProvider(accounts);
    }

    @Override
    public Subject authenticated(Subject subject) {
        SurenessAccount account = accounts.loadAccount(String.valueOf(subject.getPrincipal()));
        if (account == null) {
            throw new UnknownAccountException("account does not exist");
        }
        if (!verifier.matches(account, subject.getCredential() == null ? null : String.valueOf(subject.getCredential()))) {
            throw new IncorrectCredentialsException("incorrect password");
        }
        if (account.isDisabledAccount()) {
            throw new DisabledAccountException("account is disabled");
        }
        if (account.isExcessiveAttempts()) {
            throw new ExcessiveAttemptsException("account attempts exceeded");
        }
        subject.setOwnRoles(account.getOwnRoles());
        return subject;
    }
}
