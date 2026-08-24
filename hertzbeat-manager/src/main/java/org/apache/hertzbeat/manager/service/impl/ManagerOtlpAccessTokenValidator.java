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

import com.usthe.sureness.util.JsonWebTokenUtil;
import io.jsonwebtoken.Claims;
import java.util.Collections;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.apache.hertzbeat.common.security.OtlpAccessTokenValidator;
import org.apache.hertzbeat.manager.service.AccountService;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/** Validates managed HertzBeat API tokens used by the OTLP gRPC listener. */
@Service
@RequiredArgsConstructor
public class ManagerOtlpAccessTokenValidator implements OtlpAccessTokenValidator {

    private final AccountService accountService;

    @Override
    public String validate(String token) {
        if (!StringUtils.hasText(token)) {
            return "Missing OTLP access token";
        }
        try {
            Claims claims = JsonWebTokenUtil.parseJwt(token);
            if (Boolean.TRUE.equals(claims.get("refresh", Boolean.class))) {
                return "Refresh token is not allowed";
            }
            if (Boolean.TRUE.equals(claims.get(AccountServiceImpl.CLAIM_MANAGED, Boolean.class))) {
                String rejectReason = accountService.checkTokenStatus(token);
                if (rejectReason != null) {
                    return rejectReason;
                }
            }
            @SuppressWarnings("unchecked")
            List<String> roles = claims.get("roles", List.class);
            String rejectReason = accountService.checkManagedTokenAccess(claims.getSubject(),
                    roles == null ? Collections.emptyList() : roles);
            if (rejectReason == null) {
                accountService.touchTokenLastUsedTime(token);
            }
            return rejectReason;
        } catch (Exception exception) {
            return "Invalid OTLP access token";
        }
    }
}
