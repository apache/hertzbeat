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

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.usthe.sureness.util.JsonWebTokenUtil;
import java.util.Optional;
import org.apache.hertzbeat.manager.dao.AuthTokenDao;
import org.apache.hertzbeat.manager.pojo.dto.LoginDto;
import org.apache.hertzbeat.manager.service.AccountService;
import org.apache.hertzbeat.manager.service.impl.AccountServiceImpl;
import org.junit.jupiter.api.Test;
import org.springframework.context.annotation.AnnotationConfigApplicationContext;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

class DatabaseIdentitySpringWiringTest {
    @Test
    void accountServiceReceivesDatabaseFirstProviderFromSpring() throws Exception {
        DatabaseAccountRepository repository = mock(DatabaseAccountRepository.class);
        DatabaseAccount account = new DatabaseAccount("owner",
                new BCryptPasswordEncoder(12).encode("correct"), "admin", 1, (short) 1);
        when(repository.findByUsername("owner")).thenReturn(Optional.of(account));
        JsonWebTokenUtil.setDefaultSecretKey("long-test-key-which-is-not-a-production-secret-1234567890");
        try (AnnotationConfigApplicationContext context = new AnnotationConfigApplicationContext()) {
            context.registerBean(DatabaseAccountRepository.class, () -> repository);
            context.registerBean(AuthTokenDao.class, () -> mock(AuthTokenDao.class));
            context.registerBean(LegacyAccountSource.class, () -> mock(LegacyAccountSource.class));
            context.register(DatabaseFirstAccountProvider.class, AccountCredentialVerifier.class,
                    IdentityPasswordPolicy.class, AccountServiceImpl.class);
            context.refresh();

            AccountService service = context.getBean(AccountService.class);
            assertNotNull(service.authGetToken(
                    LoginDto.builder().identifier("owner").credential("correct").build()).get("token"));
        }
    }
}
