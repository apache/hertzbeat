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

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.usthe.sureness.processor.exception.DisabledAccountException;
import com.usthe.sureness.subject.support.PasswordSubject;
import java.util.Optional;
import org.junit.jupiter.api.Test;

/** Proves the fixed credential in the packaged startup resource is migration-only. */
class PackagedLegacyDefaultAuthenticationTest {

    @Test
    void packagedAdminDefaultCannotAuthenticate() {
        DatabaseAccountRepository repository = mock(DatabaseAccountRepository.class);
        when(repository.findByUsername("admin")).thenReturn(Optional.empty());
        when(repository.count()).thenReturn(0L);
        DatabaseFirstAccountProvider provider = new DatabaseFirstAccountProvider(repository, new LegacyAccountSource());
        BcryptPasswordProcessor processor = new BcryptPasswordProcessor(provider,
                new AccountCredentialVerifier(new IdentityPasswordPolicy()));

        assertThrows(DisabledAccountException.class,
                () -> processor.authenticated(PasswordSubject.builder("admin", "hertzbeat").build()));
    }
}
