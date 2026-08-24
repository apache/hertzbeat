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

package org.apache.hertzbeat.manager.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.usthe.sureness.util.JsonWebTokenUtil;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.apache.hertzbeat.manager.service.AccountService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ManagerOtlpAccessTokenValidatorTest {

    @Mock
    private AccountService accountService;

    private ManagerOtlpAccessTokenValidator validator;

    @BeforeEach
    void setUp() {
        JsonWebTokenUtil.setDefaultSecretKey("CyaFv0bwq2Eik0jdrKUtsA6bx3sDJeFV643R"
                + "LnfKefTjsIfJLBa2YkhEqEGtcHDTNe4CU6+98tVt4bisXQ13rbN0oxhUZR73M6EByXIO+SV5"
                + "dKhaX0csgOCTlCxq20yhmUea6H6JIpSE2Rwp");
        validator = new ManagerOtlpAccessTokenValidator(accountService);
    }

    @Test
    void shouldRejectRefreshTokensBeforeAccountAccess() {
        String token = JsonWebTokenUtil.issueJwt("admin", 3600L, new HashMap<>(Map.of("refresh", true)));

        assertThat(validator.validate(token)).isEqualTo("Refresh token is not allowed");
        verify(accountService, never()).touchTokenLastUsedTime(token);
    }

    @Test
    void shouldValidateManagedAccessTokenAndRecordUsage() {
        String token = JsonWebTokenUtil.issueJwt("admin", 3600L, List.of("admin"),
                new HashMap<>(Map.of(AccountServiceImpl.CLAIM_MANAGED, true)));
        when(accountService.checkManagedTokenAccess("admin", List.of("admin"))).thenReturn(null);

        assertThat(validator.validate(token)).isNull();
        verify(accountService).checkTokenStatus(token);
        verify(accountService).touchTokenLastUsedTime(token);
    }

    @Test
    void shouldRejectRevokedManagedTokenWithoutUpdatingUsage() {
        String token = JsonWebTokenUtil.issueJwt("admin", 3600L, List.of("admin"),
                new HashMap<>(Map.of(AccountServiceImpl.CLAIM_MANAGED, true)));
        when(accountService.checkTokenStatus(token)).thenReturn("Token has been revoked");

        assertThat(validator.validate(token)).isEqualTo("Token has been revoked");
        verify(accountService, never()).touchTokenLastUsedTime(token);
    }
}
