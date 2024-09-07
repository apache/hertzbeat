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

package org.apache.hertzbeat.manager.service;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import com.usthe.sureness.provider.DefaultAccount;
import com.usthe.sureness.provider.SurenessAccount;
import com.usthe.sureness.provider.SurenessAccountProvider;
import com.usthe.sureness.provider.ducument.DocumentAccountProvider;
import com.usthe.sureness.util.JsonWebTokenUtil;
import com.usthe.sureness.util.Md5Util;
import io.jsonwebtoken.MalformedJwtException;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import javax.naming.AuthenticationException;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.pojo.dto.LoginDto;
import org.apache.hertzbeat.manager.pojo.dto.RefreshTokenResponse;
import org.apache.hertzbeat.manager.service.impl.AccountServiceImpl;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

/**
 * test case for {@link AccountServiceImpl}
 */

class AccountServiceTest {

    private AccountServiceImpl accountService;

    private SurenessAccountProvider accountProvider;

    private final String identifier = "admin";
    private final String password = "hertzbeat";
    private final String salt = "salt1";
    private final List<String> roles = List.of("admin");

    private final String jwt = """
              CyaFv0bwq2Eik0jdrKUtsA6bx3sDJeFV643R
              LnfKefTjsIfJLBa2YkhEqEGtcHDTNe4CU6+9
              8tVt4bisXQ13rbN0oxhUZR73M6EByXIO+SV5
              dKhaX0csgOCTlCxq20yhmUea6H6JIpSE2Rwp
            """;

    @BeforeEach
    void setUp() {

        accountProvider = mock(DocumentAccountProvider.class);
        accountService = new AccountServiceImpl();

        JsonWebTokenUtil.setDefaultSecretKey(jwt);
    }

    @Test
    void testAuthGetTokenWithValidAccount() throws AuthenticationException {

        SurenessAccount account = DefaultAccount.builder("app1")
                .setPassword(Md5Util.md5(password + salt))
                .setSalt(salt)
                .setOwnRoles(roles)
                .setDisabledAccount(Boolean.FALSE)
                .setExcessiveAttempts(Boolean.FALSE)
                .build();
        LoginDto loginDto = LoginDto.builder()
                .credential(password)
                .identifier(identifier)
                .build();

        when(accountProvider.loadAccount(identifier)).thenReturn(account);

        Map<String, String> response = accountService.authGetToken(loginDto);

        assertNotNull(response);
        assertNotNull(response.get("token"));
        assertNotNull(response.get("refreshToken"));
        assertNotNull(response.get("role"));
        assertEquals(JsonUtil.toJson(roles), response.get("role"));

    }

    @Test
    void testAuthGetTokenWithInvalidAccount() {

        String identifier = "user1";
        String password = "wrongPassword";
        LoginDto loginDto = LoginDto.builder()
                .credential(password)
                .identifier(identifier)
                .build();

        when(accountProvider.loadAccount(identifier)).thenReturn(null);

        Assertions.assertThrows(
                AuthenticationException.class,
                () -> accountService.authGetToken(loginDto)
        );
    }

    @Test
    void testRefreshTokenWithValidToken() throws Exception {

        String userId = "admin";
        String refreshToken = JsonWebTokenUtil.issueJwt(userId, 3600L, Collections.singletonMap("refresh", true));

        SurenessAccount account = DefaultAccount.builder("app1")
                .setPassword(Md5Util.md5(password + salt))
                .setSalt(salt)
                .setOwnRoles(roles)
                .setDisabledAccount(Boolean.FALSE)
                .setExcessiveAttempts(Boolean.FALSE)
                .build();
        when(accountProvider.loadAccount(userId)).thenReturn(account);

        RefreshTokenResponse response = accountService.refreshToken(refreshToken);

        assertNotNull(response);
        assertNotNull(response.getToken());
        assertNotNull(response.getRefreshToken());
    }

    @Test
    void testRefreshTokenWithInvalidToken() {

        String refreshToken = "invalidToken";

        Assertions.assertThrows(
                MalformedJwtException.class,
                () -> accountService.refreshToken(refreshToken)
        );
    }

}
