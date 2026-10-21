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
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.doThrow;
import javax.naming.AuthenticationException;
import org.apache.hertzbeat.manager.controller.AccountController;
import org.apache.hertzbeat.manager.pojo.dto.LoginDto;
import org.apache.hertzbeat.manager.pojo.dto.TokenDto;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

/** Authentication failures must not disclose account existence or account roles. */
class AccountAuthenticationResponseTest {

    @Test
    void signInFailuresHaveTheSamePublicResponse() throws Exception {
        AccountService service = mock(AccountService.class);
        AccountController controller = new AccountController();
        ReflectionTestUtils.setField(controller, "accountService", service);
        LoginDto login = new LoginDto();
        String previous = null;
        for (String reason : new String[]{"Incorrect Account or Password", "Expired or Illegal Account",
                "Management access requires the admin role; manual account migration is required"}) {
            doThrow(new AuthenticationException(reason)).when(service).authGetToken(login);
            var body = controller.authGetToken(login).getBody();
            assertNull(body.getData());
            assertTrue(body.getMsg().startsWith("Sign-in failed."));
            if (previous != null) {
                assertEquals(previous, body.getMsg());
            }
            previous = body.getMsg();
        }
    }

    @Test
    void refreshFailuresDoNotDiscloseTheAccountState() throws Exception {
        AccountService service = mock(AccountService.class);
        AccountController controller = new AccountController();
        ReflectionTestUtils.setField(controller, "accountService", service);
        TokenDto token = new TokenDto();
        token.setToken("synthetic-refresh-token");
        String previous = null;
        for (String reason : new String[]{"Not Exists This Token Mapping Account", "Expired or Illegal Account",
                "Management access requires the admin role"}) {
            doThrow(new AuthenticationException(reason)).when(service).refreshToken(token.getToken());
            var body = controller.refreshToken(token).getBody();
            assertNull(body.getData());
            assertTrue(body.getMsg().startsWith("Sign-in failed."));
            if (previous != null) {
                assertEquals(previous, body.getMsg());
            }
            previous = body.getMsg();
        }
    }
}
