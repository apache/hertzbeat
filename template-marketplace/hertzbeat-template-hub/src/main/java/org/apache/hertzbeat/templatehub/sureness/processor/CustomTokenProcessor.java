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

package org.apache.hertzbeat.templatehub.sureness.processor;

import com.usthe.sureness.processor.BaseProcessor;
import com.usthe.sureness.processor.exception.IncorrectCredentialsException;
import com.usthe.sureness.processor.exception.SurenessAuthenticationException;
import com.usthe.sureness.processor.exception.SurenessAuthorizationException;
import com.usthe.sureness.processor.exception.UnauthorizedException;
import com.usthe.sureness.provider.SurenessAccount;
import com.usthe.sureness.provider.SurenessAccountProvider;
import com.usthe.sureness.subject.Subject;
import org.apache.hertzbeat.templatehub.controller.TokenStorage;
import org.apache.hertzbeat.templatehub.sureness.subject.CustomTokenSubject;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.UUID;

/**
 * custom token processor, support CustomTokenSubject
 * when token Expired and can refresh, return refresh token value
 *
 * @author tomsun28
 * @date 2020-12-03 20:37
 */
public class CustomTokenProcessor extends BaseProcessor {

    private static final Logger logger = LoggerFactory.getLogger(CustomTokenProcessor.class);
    private static final String TOKEN_SPLIT = "--";
    private static final int START_TIME_INDEX = 1;
    private static final int PERIOD_TIME_INDEX = 2;
    private static final int DOUBLE_TIME = 2;

    private SurenessAccountProvider accountProvider;

    @Override
    public boolean canSupportSubjectClass(Class<?> var) {
        return var == CustomTokenSubject.class;
    }

    @Override
    public Class<?> getSupportSubjectClass() {
        return CustomTokenSubject.class;
    }

    @Override
    @SuppressWarnings("unchecked")
    public Subject authenticated(Subject var) throws SurenessAuthenticationException {
        String token = (String) var.getCredential();
        String[] tokenArr = token.split(TOKEN_SPLIT);
        if (TokenStorage.matchToken(tokenArr[0], token)) {
            // auth passed
            String appId = tokenArr[0];
            SurenessAccount account = accountProvider.loadAccount(appId);
            // attention: need to set subject own roles from account
            var.setPrincipal(appId);
            var.setOwnRoles(account.getOwnRoles());
            return var;

        } else {
            // token expired or not exist, if token can refresh, refresh it
            // if expired time is not longer than refreshPeriodTime/2 , it can refresh
            if (Long.parseLong(tokenArr[START_TIME_INDEX]) + (Long.parseLong(tokenArr[PERIOD_TIME_INDEX]) * DOUBLE_TIME)
                    >= System.currentTimeMillis()) {
                long refreshPeriodTime = 36000L;
                String refreshToken = tokenArr[0] + TOKEN_SPLIT + System.currentTimeMillis()
                        + TOKEN_SPLIT + refreshPeriodTime
                        + TOKEN_SPLIT + UUID.randomUUID().toString().replace("-", "");
                TokenStorage.addToken(tokenArr[0], refreshToken);
                throw new RefreshExpiredTokenException(refreshToken);
            } else if (Long.parseLong(tokenArr[START_TIME_INDEX]) + Long.parseLong(tokenArr[PERIOD_TIME_INDEX])
                    <= System.currentTimeMillis()) {
                if (logger.isDebugEnabled()) {
                    logger.debug("CustomTokenProcessor authenticated expired");
                }
                throw new IncorrectCredentialsException("the token authenticated expired, please get new one");
            } else {
                if (logger.isDebugEnabled()) {
                    logger.debug("CustomTokenProcessor authenticated fail");
                }
                throw new IncorrectCredentialsException("the token authenticated error");
            }
        }
    }

    @SuppressWarnings("unchecked")
    @Override
    public void authorized(Subject var) throws SurenessAuthorizationException {
        List<String> ownRoles = (List<String>) var.getOwnRoles();
        List<String> supportRoles = (List<String>) var.getSupportRoles();
        // if null, note that not config this resource
        if (supportRoles == null) {
            return;
        }
        // if config, ownRole must contain the supportRole item
        if (ownRoles != null && supportRoles.stream().anyMatch(ownRoles::contains)) {
            return;
        }
        throw new UnauthorizedException("custom authorized: do not have the role to access resource");
    }

    public void setAccountProvider(SurenessAccountProvider accountProvider) {
        this.accountProvider = accountProvider;
    }
}
