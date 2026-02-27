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

package org.apache.hertzbeat.templatehub.service.impl;

import com.usthe.sureness.provider.DefaultAccount;
import com.usthe.sureness.provider.SurenessAccount;
import com.usthe.sureness.util.JsonWebTokenUtil;
import com.usthe.sureness.util.Md5Util;
import com.usthe.sureness.util.SurenessCommonUtil;
import io.jsonwebtoken.Claims;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.templatehub.model.DAO.AuthUserDao;
import org.apache.hertzbeat.templatehub.model.DAO.AuthUserRoleBindDao;
import org.apache.hertzbeat.templatehub.model.DTO.LoginDto;
import org.apache.hertzbeat.templatehub.model.DTO.RefreshTokenResponse;
import org.apache.hertzbeat.templatehub.model.DO.AuthUserDO;
import org.apache.hertzbeat.templatehub.model.DO.AuthUserRoleBindDO;
import org.apache.hertzbeat.templatehub.model.DTO.SignUpDto;
import org.apache.hertzbeat.templatehub.service.AccountService;
import org.apache.hertzbeat.templatehub.util.JsonUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Service;

import javax.naming.AuthenticationException;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

/**
 * Implementation of Account service
 */
@Service
@Order(value = Ordered.HIGHEST_PRECEDENCE)
@Slf4j
public class AccountServiceImpl implements AccountService {
    /**
     * Token validity time in seconds
     */
    private static final long PERIOD_TIME = 3600L;

    @Autowired
    private AuthUserDao authUserDao;

    @Autowired
    private AuthUserRoleBindDao userRoleBindDao;

    @Override
    public Map<String, String> authGetToken(LoginDto loginDto) throws AuthenticationException {
        SurenessAccount account = loadAccount(loginDto.getIdentifier());
        if (account == null || StringUtils.isBlank(account.getPassword())) {
            throw new AuthenticationException("Incorrect Account or Password");
        } else {
            String password = loginDto.getCredential();
            if (StringUtils.isNotBlank(account.getSalt())) {
                password = Md5Util.md5(password + account.getSalt());
            }
            if (!account.getPassword().equals(password)) {
                throw new AuthenticationException("Incorrect Account or Password");
            }
            if (account.isDisabledAccount() || account.isExcessiveAttempts()) {
                throw new AuthenticationException("Expired or Illegal Account");
            }
        }
        // Get the roles the user has - rbac
        List<String> roles = account.getOwnRoles();
        // Issue TOKEN
        String issueToken = JsonWebTokenUtil.issueJwt(loginDto.getIdentifier(), PERIOD_TIME, roles);
        Map<String, Object> customClaimMap = new HashMap<>(1);
        customClaimMap.put("refresh", true);
        String issueRefresh = JsonWebTokenUtil.issueJwt(loginDto.getIdentifier(), PERIOD_TIME << 5, customClaimMap);
        Map<String, String> resp = new HashMap<>(2);
        resp.put("token", issueToken);
        resp.put("refreshToken", issueRefresh);
        resp.put("role", JsonUtil.toJson(roles));

        Optional<AuthUserDO> authUserByEmail = this.authUserDao.findAuthUserByEmail(loginDto.getIdentifier());
        resp.put("id", String.valueOf(authUserByEmail.map(AuthUserDO::getId).orElse(null)));

        return resp;
    }

    @Override
    public boolean authenticateAccount(LoginDto account) {
        Optional<AuthUserDO> authUserOptional = authUserDao.findAuthUserByEmail(account.getIdentifier());
        if (authUserOptional.isEmpty()) {
            return false;
        }
        AuthUserDO authUser = authUserOptional.get();
        String password = account.getCredential();
        if (password == null) {
            return false;
        }
        if (Objects.nonNull(authUser.getSalt())) {
            // md5 with salt
            password = Md5Util.md5(password + authUser.getSalt());

        }
        return authUser.getPassword().equals(password);
    }

    @Override
    public List<String> loadAccountRoles(String username) {
        return authUserDao.findAccountOwnRoles(username);
    }

    @Override
    public boolean registerAccount(SignUpDto account) {
        if (isAccountExist(new LoginDto((byte) 1, account.getEmail(), account.getPassword()))) {
            return false;
        }
        String salt = SurenessCommonUtil.getRandomString(6);
        String password = Md5Util.md5(account.getPassword() + salt);
        AuthUserDO authUser = AuthUserDO.builder().name(account.getName())
                .password(password).salt(salt).status(1).build();

        authUser.setCreateTime(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
        authUser.setUpdateTime(LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
        authUser.setLogOffTime("0");
        authUser.setEmail(account.getEmail());

        authUserDao.save(authUser);
        return true;
    }

    @Override
    public boolean isAccountExist(LoginDto account) {
        Optional<AuthUserDO> authUserOptional = authUserDao.findAuthUserByEmail(account.getIdentifier());
        return authUserOptional.isPresent();
    }

    @Override
    public SurenessAccount loadAccount(String username) {
        Optional<AuthUserDO> authUserOptional = authUserDao.findAuthUserByEmail(username);
        if (authUserOptional.isPresent()) {
            AuthUserDO authUser = authUserOptional.get();
            DefaultAccount.Builder accountBuilder = DefaultAccount.builder(username)
                    .setPassword(authUser.getPassword())
                    .setSalt(authUser.getSalt())
                    .setDisabledAccount(1 != authUser.getStatus())
                    .setExcessiveAttempts(2 == authUser.getStatus());
            List<String> roles = loadAccountRoles(username);
            if (roles != null) {
                accountBuilder.setOwnRoles(roles);
            }
            return accountBuilder.build();
        } else {
            return null;
        }
    }

    @Override
    public RefreshTokenResponse refreshToken(String refreshToken) throws Exception {
        Claims claims = JsonWebTokenUtil.parseJwt(refreshToken);
        String userId = String.valueOf(claims.getSubject());
        boolean isRefresh = claims.get("refresh", Boolean.class);
        if (StringUtils.isBlank(userId) || !isRefresh) {
            throw new AuthenticationException("Illegal Refresh Token");
        }
        SurenessAccount account = loadAccount(userId);
        if (account == null) {
            throw new AuthenticationException("Not Exists This Token Mapping Account");
        }
        List<String> roles = account.getOwnRoles();
        String issueToken = issueToken(userId, roles, PERIOD_TIME);
        String issueRefresh = issueToken(userId, roles, PERIOD_TIME << 5);
        return new RefreshTokenResponse(issueToken, issueRefresh);
    }

    private String issueToken(String userId, List<String> roles, long expirationMillis) {
        Map<String, Object> customClaimMap = new HashMap<>(1);
        customClaimMap.put("refresh", true);
        return JsonWebTokenUtil.issueJwt(userId, expirationMillis, roles, customClaimMap);
    }

    @Override
    public boolean authorityUserRole(String appId, Long roleId) {
        Optional<AuthUserDO> optional = authUserDao.findAuthUserByEmail(appId);
        if (optional.isEmpty()) {
            return false;
        }
        Long userId = optional.get().getId();
        AuthUserRoleBindDO userRoleBindDO = AuthUserRoleBindDO.builder().userId(userId).roleId(roleId).build();

        userRoleBindDao.save(userRoleBindDO);
        return true;
    }

    @Override
    public boolean deleteAuthorityUserRole(String appId, Long roleId) {
        Optional<AuthUserDO> optional = authUserDao.findAuthUserByEmail(appId);
        if (optional.isEmpty()) {
            return false;
        }
        Long userId = optional.get().getId();
        userRoleBindDao.deleteRoleResourceBind(roleId, userId);
        return true;
    }
}
