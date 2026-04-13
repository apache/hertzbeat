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

import java.util.List;
import java.util.Map;
import javax.naming.AuthenticationException;

import org.apache.hertzbeat.common.entity.manager.AuthToken;
import org.apache.hertzbeat.manager.pojo.dto.LoginDto;
import org.apache.hertzbeat.manager.pojo.dto.RefreshTokenResponse;

/**
 * Account service
 */
public interface AccountService {
    /**
     * Account password login to obtain associated user information
     *
     * @param loginDto loginDto
     * @return token info
     * @throws AuthenticationException when authentication is failed
     */
    Map<String, String> authGetToken(LoginDto loginDto) throws AuthenticationException;

    /**
     * Use refresh TOKEN to re-acquire TOKEN
     *
     * @param refreshToken refreshToken
     * @return token and refresh token
     * @throws Exception failed to refresh
     */
    RefreshTokenResponse refreshToken(String refreshToken) throws Exception;

    /**
     * Generate a managed API token and persist it for lifecycle management
     *
     * @param tokenName     optional name/description for the token
     * @param expireSeconds optional expiration time in seconds, null means never expire
     * @return token string
     */
    String generateToken(String tokenName, Long expireSeconds) throws AuthenticationException;

    /**
     * List all API tokens
     *
     * @return list of auth tokens
     */
    List<AuthToken> listTokens();

    /**
     * Delete/revoke an API token by id
     *
     * @param id token id
     */
    void deleteToken(Long id) throws AuthenticationException;

    /**
     * Check the status of a managed token (revocation + expiration)
     *
     * @param tokenValue the raw token string
     * @return null if the token is valid, otherwise a rejection reason string
     */
    String checkTokenStatus(String tokenValue);

    /**
     * Check whether the current account behind a managed token is still valid
     * and still owns the roles claimed in that token.
     *
     * @param userId        token subject
     * @param claimedRoles  roles embedded in the token claims
     * @return null if the token owner is still valid, otherwise a rejection reason string
     */
    String checkManagedTokenAccess(String userId, List<String> claimedRoles);

    /**
     * Update the last used time of a managed token
     *
     * @param tokenValue the raw token string
     */
    void touchTokenLastUsedTime(String tokenValue);
}
