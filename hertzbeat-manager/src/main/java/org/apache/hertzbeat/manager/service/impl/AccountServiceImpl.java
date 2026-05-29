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

import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import com.usthe.sureness.provider.SurenessAccount;
import com.usthe.sureness.provider.SurenessAccountProvider;
import com.usthe.sureness.provider.ducument.DocumentAccountProvider;
import com.usthe.sureness.subject.SubjectSum;
import com.usthe.sureness.util.JsonWebTokenUtil;
import com.usthe.sureness.util.Md5Util;
import com.usthe.sureness.util.SurenessContextHolder;
import io.jsonwebtoken.Claims;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.apache.hertzbeat.alert.util.CryptoUtils;
import org.apache.hertzbeat.common.entity.manager.AuthToken;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenScopes;
import org.apache.hertzbeat.common.util.JsonUtil;
import org.apache.hertzbeat.manager.dao.AuthTokenDao;
import org.apache.hertzbeat.manager.pojo.dto.LoginDto;
import org.apache.hertzbeat.manager.pojo.dto.RefreshTokenResponse;
import org.apache.hertzbeat.manager.service.AccountService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Service;

import javax.naming.AuthenticationException;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;

/**
 * Implementation of Account service
 */
@Service
@Order(value = Ordered.HIGHEST_PRECEDENCE)
@Slf4j
public class AccountServiceImpl implements AccountService {

    private static final String REFRESH_CLAIM = "refresh";

    /**
     * Token validity time in seconds
     */
    private static final long PERIOD_TIME = 3600L;

    /**
     * Non-expiring managed token duration: 100 years in seconds
     */
    private static final long NON_EXPIRING_TOKEN_SECONDS = 365L * 24 * 3600 * 100;

    private static final byte TOKEN_STATUS_ACTIVE = 0;

    private static final byte TOKEN_STATUS_REVOKED = 1;

    private static final long MAX_ACTIVE_TOKENS_PER_SCOPE_PER_USER = 20;

    /**
     * Custom JWT claim key to mark tokens as managed (persisted in DB for lifecycle management).
     * Only tokens with this claim will be validated against the database.
     * Legacy tokens without this claim are allowed to pass through for backward compatibility.
     */
    public static final String CLAIM_MANAGED = "managed";

    /**
     * Minimum interval (in minutes) between lastUsedTime DB updates for the same token.
     * Reduces write pressure under high-frequency requests.
     */
    private static final long LAST_USED_UPDATE_INTERVAL_MINUTES = 5;

    /**
     * Local cache: tokenHash -> isActive.
     * TTL 60s to reduce DB queries; invalidated on token revocation.
     */
    private final Cache<String, Boolean> tokenStatusCache = Caffeine.newBuilder()
        .maximumSize(1000)
        .expireAfterWrite(60, TimeUnit.SECONDS)
        .build();

    /**
     * Tracks when each token's lastUsedTime was last written to DB.
     * Used to throttle DB writes to at most once per LAST_USED_UPDATE_INTERVAL_MINUTES.
     */
    private final ConcurrentHashMap<String, LocalDateTime> lastUsedWriteTimestamps = new ConcurrentHashMap<>();

    /**
     * account data provider
     */
    private final SurenessAccountProvider accountProvider;

    public AccountServiceImpl() {
        this(new DocumentAccountProvider());
    }

    public AccountServiceImpl(SurenessAccountProvider accountProvider) {
        this.accountProvider = accountProvider;
    }

    @Autowired
    private AuthTokenDao authTokenDao;

    @Override
    public Map<String, String> authGetToken(LoginDto loginDto) throws AuthenticationException {
        SurenessAccount account = accountProvider.loadAccount(loginDto.getIdentifier());
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
        String issueToken = issueAccessToken(loginDto.getIdentifier(), roles, PERIOD_TIME);
        String issueRefresh = issueRefreshToken(loginDto.getIdentifier(), PERIOD_TIME << 5);
        Map<String, String> resp = new HashMap<>(2);
        resp.put("token", issueToken);
        resp.put("refreshToken", issueRefresh);
        resp.put("role", JsonUtil.toJson(roles));

        return resp;
    }

    @Override
    public RefreshTokenResponse refreshToken(String refreshToken) throws Exception {
        Claims claims = JsonWebTokenUtil.parseJwt(refreshToken);
        String userId = claims.getSubject();
        Boolean isRefresh = claims.get(REFRESH_CLAIM, Boolean.class);
        if (StringUtils.isBlank(userId) || !Boolean.TRUE.equals(isRefresh)) {
            throw new AuthenticationException("Illegal Refresh Token");
        }
        SurenessAccount account = accountProvider.loadAccount(userId);
        if (account == null) {
            throw new AuthenticationException("Not Exists This Token Mapping Account");
        }
        if (account.isDisabledAccount() || account.isExcessiveAttempts()) {
            throw new AuthenticationException("Expired or Illegal Account");
        }
        List<String> roles = account.getOwnRoles();
        String issueToken = issueAccessToken(userId, roles, PERIOD_TIME);
        String issueRefresh = issueRefreshToken(userId, PERIOD_TIME << 5);
        return new RefreshTokenResponse(issueToken, issueRefresh);
    }

    @Override
    public String generateToken(String tokenName, Long expireSeconds) throws AuthenticationException {
        return generateToken(tokenName, expireSeconds, AuthTokenScopes.API_ADMIN);
    }

    @Override
    public String generateToken(String tokenName, Long expireSeconds, String tokenScope) throws AuthenticationException {
        return generateToken(tokenName, expireSeconds, tokenScope, AuthTokenScopes.DEFAULT_WORKSPACE_ID);
    }

    @Override
    public String generateToken(String tokenName, Long expireSeconds, String tokenScope, String workspaceId)
            throws AuthenticationException {
        SubjectSum subjectSum = requireCurrentSubject();
        String userId = getCurrentUserId(subjectSum);
        SurenessAccount account = accountProvider.loadAccount(userId);
        if (account == null) {
            throw new AuthenticationException("Not Exists This Token Mapping Account");
        }
        if (account.isDisabledAccount() || account.isExcessiveAttempts()) {
            throw new AuthenticationException("Expired or Illegal Account");
        }
        String normalizedScope = AuthTokenScopes.normalizeApiTokenScope(tokenScope);
        String normalizedWorkspaceId = AuthTokenScopes.normalizeWorkspaceId(workspaceId);
        long activeTokens = authTokenDao.countByStatusAndCreatorAndTokenScopeAndWorkspaceId(
            TOKEN_STATUS_ACTIVE, userId, normalizedScope, normalizedWorkspaceId);
        if (activeTokens >= MAX_ACTIVE_TOKENS_PER_SCOPE_PER_USER) {
            throw new AuthenticationException("Token quota exceeded");
        }
        List<String> roles = account.getOwnRoles();
        String token = issueApiToken(userId, roles, expireSeconds, normalizedScope, normalizedWorkspaceId);

        // Persist token metadata for management
        String tokenHash = CryptoUtils.sha256Hex(token);
        String tokenMask = maskToken(token);
        LocalDateTime expireTime = null;
        if (expireSeconds != null && expireSeconds > 0) {
            expireTime = LocalDateTime.now().plusSeconds(expireSeconds);
        }
        AuthToken authToken = AuthToken.builder()
            .name(tokenName)
            .tokenHash(tokenHash)
            .tokenMask(tokenMask)
            .tokenScope(normalizedScope)
            .workspaceId(normalizedWorkspaceId)
            .status(TOKEN_STATUS_ACTIVE)
            .creator(userId)
            .expireTime(expireTime)
            .build();
        authTokenDao.save(authToken);

        return token;
    }

    private String issueAccessToken(String userId, List<String> roles, long expirationSeconds) {
        Map<String, Object> customClaimMap = new HashMap<>(2);
        customClaimMap.put(AuthTokenScopes.CLAIM_TOKEN_SCOPE, AuthTokenScopes.UI_SESSION);
        customClaimMap.put(AuthTokenScopes.CLAIM_WORKSPACE_ID, AuthTokenScopes.DEFAULT_WORKSPACE_ID);
        return JsonWebTokenUtil.issueJwt(userId, expirationSeconds, roles, customClaimMap);
    }

    @Override
    public List<AuthToken> listTokens() {
        SubjectSum subjectSum = SurenessContextHolder.getBindSubject();
        if (subjectSum == null) {
            return List.of();
        }
        String workspaceId = AuthTokenRequestContext.currentWorkspaceId();
        if (StringUtils.isNotBlank(workspaceId)) {
            String normalizedWorkspaceId = AuthTokenScopes.normalizeWorkspaceId(workspaceId);
            if (subjectSum.hasRole("admin")) {
                return authTokenDao.findByStatusAndWorkspaceId(TOKEN_STATUS_ACTIVE, normalizedWorkspaceId);
            }
            return authTokenDao.findByStatusAndCreatorAndWorkspaceId(
                    TOKEN_STATUS_ACTIVE,
                    getCurrentUserId(subjectSum),
                    normalizedWorkspaceId);
        }
        if (subjectSum.hasRole("admin")) {
            return authTokenDao.findByStatus(TOKEN_STATUS_ACTIVE);
        }
        return authTokenDao.findByStatusAndCreator(TOKEN_STATUS_ACTIVE, getCurrentUserId(subjectSum));
    }

    @Override
    public void deleteToken(Long id) throws AuthenticationException {
        SubjectSum subjectSum = requireCurrentSubject();
        String userId = getCurrentUserId(subjectSum);
        AuthToken token = authTokenDao.findById(id).orElse(null);
        if (token == null) {
            return;
        }
        if (!subjectSum.hasRole("admin") && !StringUtils.equals(userId, token.getCreator())) {
            throw new AuthenticationException("No permission");
        }
        String workspaceId = AuthTokenRequestContext.currentWorkspaceId();
        if (StringUtils.isNotBlank(workspaceId)
                && !StringUtils.equals(
                        AuthTokenScopes.normalizeWorkspaceId(workspaceId),
                        AuthTokenScopes.normalizeWorkspaceId(token.getWorkspaceId()))) {
            throw new AuthenticationException("No workspace permission");
        }
        if (!Byte.valueOf(TOKEN_STATUS_ACTIVE).equals(token.getStatus())) {
            return;
        }
        String tokenHash = token.getTokenHash();
        if (StringUtils.isNotBlank(tokenHash)) {
            invalidateTokenStatusCache(tokenHash);
            lastUsedWriteTimestamps.remove(tokenHash);
        }
        token.setStatus(TOKEN_STATUS_REVOKED);
        token.setRevokedBy(userId);
        token.setRevokedTime(LocalDateTime.now());
        authTokenDao.save(token);
    }

    @Override
    public String checkTokenStatus(String tokenValue) {
        String tokenHash = CryptoUtils.sha256Hex(tokenValue);
        Boolean active = tokenStatusCache.get(tokenHash,
            hash -> authTokenDao.existsByTokenHashAndStatus(hash, TOKEN_STATUS_ACTIVE));
        if (!Boolean.TRUE.equals(active)) {
            return "Token has been revoked";
        }
        return null;
    }

    @Override
    public String checkTokenStatus(String tokenValue, String requiredScope) {
        String tokenHash = CryptoUtils.sha256Hex(tokenValue);
        String normalizedRequiredScope = AuthTokenScopes.normalizeRequiredScope(requiredScope);
        Set<String> allowedScopes = AuthTokenScopes.allowedTokenScopesFor(normalizedRequiredScope);
        Boolean active = tokenStatusCache.get(statusCacheKey(tokenHash, normalizedRequiredScope),
            cacheKey -> authTokenDao.existsByTokenHashAndStatusAndTokenScopeIn(
                tokenHash, TOKEN_STATUS_ACTIVE, allowedScopes));
        if (Boolean.TRUE.equals(active)) {
            return null;
        }
        if (authTokenDao.existsByTokenHashAndStatus(tokenHash, TOKEN_STATUS_ACTIVE)) {
            return "Token scope is not allowed";
        }
        return "Token has been revoked";
    }

    @Override
    public String checkTokenStatus(String tokenValue, String requiredScope, String workspaceId) {
        if (StringUtils.isBlank(workspaceId)) {
            return checkTokenStatus(tokenValue, requiredScope);
        }
        String tokenHash = CryptoUtils.sha256Hex(tokenValue);
        String normalizedRequiredScope = AuthTokenScopes.normalizeRequiredScope(requiredScope);
        String normalizedWorkspaceId = AuthTokenScopes.normalizeWorkspaceId(workspaceId);
        Set<String> allowedScopes = AuthTokenScopes.allowedTokenScopesFor(normalizedRequiredScope);
        Boolean active = tokenStatusCache.get(
            statusCacheKey(tokenHash, normalizedRequiredScope, normalizedWorkspaceId),
            cacheKey -> authTokenDao.existsByTokenHashAndStatusAndTokenScopeInAndWorkspaceId(
                tokenHash, TOKEN_STATUS_ACTIVE, allowedScopes, normalizedWorkspaceId));
        if (Boolean.TRUE.equals(active)) {
            return null;
        }
        if (authTokenDao.existsByTokenHashAndStatusAndTokenScopeIn(
            tokenHash, TOKEN_STATUS_ACTIVE, allowedScopes)) {
            return "Token workspace is not allowed";
        }
        if (authTokenDao.existsByTokenHashAndStatus(tokenHash, TOKEN_STATUS_ACTIVE)) {
            return "Token scope is not allowed";
        }
        return "Token has been revoked";
    }

    @Override
    public String checkManagedTokenAccess(String userId, List<String> claimedRoles) {
        if (StringUtils.isBlank(userId)) {
            return "Token owner account is no longer valid";
        }
        SurenessAccount account = accountProvider.loadAccount(userId);
        if (account == null || account.isDisabledAccount() || account.isExcessiveAttempts()) {
            return "Token owner account is no longer valid";
        }
        if (claimedRoles == null || claimedRoles.isEmpty()) {
            return null;
        }
        List<String> currentRoles = account.getOwnRoles();
        if (currentRoles == null || !new HashSet<>(currentRoles).containsAll(claimedRoles)) {
            return "Token permissions are outdated";
        }
        return null;
    }

    @Override
    public void touchTokenLastUsedTime(String tokenValue) {
        String tokenHash = CryptoUtils.sha256Hex(tokenValue);
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime lastWrite = lastUsedWriteTimestamps.get(tokenHash);
        if (lastWrite != null && lastWrite.plusMinutes(LAST_USED_UPDATE_INTERVAL_MINUTES).isAfter(now)) {
            return;
        }
        lastUsedWriteTimestamps.put(tokenHash, now);
        authTokenDao.updateLastUsedTime(tokenHash, now);
    }

    /**
     * Issue a api token with the "managed" claim.
     * This claim distinguishes new managed tokens from legacy unmanaged tokens,
     * allowing the validation filter to only check managed tokens against the DB.
     *
     * @param expireSeconds optional expiration in seconds, null means never expire
     */
    private String issueApiToken(String userId,
                                 List<String> roles,
                                 Long expireSeconds,
                                 String tokenScope,
                                 String workspaceId) {
        Map<String, Object> customClaimMap = new HashMap<>(4);
        customClaimMap.put(CLAIM_MANAGED, true);
        customClaimMap.put(AuthTokenScopes.CLAIM_TOKEN_SCOPE, tokenScope);
        customClaimMap.put(AuthTokenScopes.CLAIM_WORKSPACE_ID, workspaceId);
        long effectiveExpire = (expireSeconds != null && expireSeconds > 0) ? expireSeconds : NON_EXPIRING_TOKEN_SECONDS;
        return JsonWebTokenUtil.issueJwt(userId, effectiveExpire, roles, customClaimMap);
    }

    private String issueRefreshToken(String userId, Long expirationMillis) {
        Map<String, Object> customClaimMap = new HashMap<>(1);
        customClaimMap.put(REFRESH_CLAIM, true);
        return JsonWebTokenUtil.issueJwt(userId, expirationMillis, customClaimMap);
    }

    private static String maskToken(String token) {
        return token.substring(0, 4) + "****" + token.substring(token.length() - 4);
    }

    private SubjectSum requireCurrentSubject() throws AuthenticationException {
        SubjectSum subjectSum = SurenessContextHolder.getBindSubject();
        if (subjectSum == null) {
            throw new AuthenticationException("No login user");
        }
        return subjectSum;
    }

    private String getCurrentUserId(SubjectSum subjectSum) {
        Object principal = subjectSum.getPrincipal();
        return principal == null ? null : String.valueOf(principal);
    }

    private void invalidateTokenStatusCache(String tokenHash) {
        tokenStatusCache.invalidate(tokenHash);
        tokenStatusCache.asMap().keySet().removeIf(key -> key.startsWith(tokenHash + ":"));
    }

    private String statusCacheKey(String tokenHash, String requiredScope) {
        return tokenHash + ":" + requiredScope;
    }

    private String statusCacheKey(String tokenHash, String requiredScope, String workspaceId) {
        return tokenHash + ":" + requiredScope + ":" + workspaceId;
    }
}
