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

package org.apache.hertzbeat.templatehub.service;

import com.usthe.sureness.provider.SurenessAccount;
import org.apache.hertzbeat.templatehub.model.DTO.LoginDto;
import org.apache.hertzbeat.templatehub.model.DTO.RefreshTokenResponse;
import org.apache.hertzbeat.templatehub.model.DTO.SignUpDto;

import javax.naming.AuthenticationException;
import java.util.List;
import java.util.Map;

/**
 * Account service
 */
public interface AccountService {
    /**
     * Verify account validity, username and password
     * @param account account info
     * @return success-true failed-false
     */
    boolean authenticateAccount(LoginDto account);

    /**
     * Get all roles owned by this username account, combine them into string list
     * @param username account username
     * @return role-string eg role1,role3,role2
     */
    List<String> loadAccountRoles(String username);

    /**
     * register account
     * @param account account info
     * @return success-true failed-false
     */
    boolean registerAccount(SignUpDto account);

    /**
     * Determine whether the account already exists
     * @param account account info
     * @return exist-true no-false
     */
    boolean isAccountExist(LoginDto account);

    /**
     * Account password login to obtain associated user information
     * @param loginDto loginDto
     * @return token info
     * @throws AuthenticationException when authentication is failed
     */
    Map<String, String> authGetToken(LoginDto loginDto) throws AuthenticationException;

    /**
     * Load the account information by username
     * @param username account username
     * @return account
     */
    SurenessAccount loadAccount(String username);

    /**
     * authority User Role by username and roleId
     * @param appId account username
     * @param roleId roleId
     * @return success-true failed-false
     */
    boolean authorityUserRole(String appId, Long roleId);

    /**
     * delete authority User Role by username and roleId
     * @param appId account username
     * @param roleId roleId
     * @return success-true failed-false
     */
    boolean deleteAuthorityUserRole(String appId, Long roleId);

    /**
     * Use refresh TOKEN to re-acquire TOKEN
     * @param refreshToken refreshToken
     * @return token and refresh token
     * @throws Exception failed to refresh
     */
    RefreshTokenResponse refreshToken(String refreshToken) throws Exception;
}
