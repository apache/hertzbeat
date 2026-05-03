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

package org.apache.hertzbeat.common.observability.gateway;

import java.util.List;

/**
 * Validates and touches managed OTLP access tokens.
 */
public interface ObservabilityAccessTokenGateway {

    String CLAIM_MANAGED = "managed";

    /**
     * Check the status of a managed token.
     *
     * @param tokenValue raw token value
     * @return null when token is valid, otherwise rejection reason
     */
    String checkTokenStatus(String tokenValue);

    /**
     * Check whether the owner behind a managed token is still allowed.
     *
     * @param userId subject from token
     * @param claimedRoles roles embedded in token
     * @return null when owner is still allowed, otherwise rejection reason
     */
    String checkManagedTokenAccess(String userId, List<String> claimedRoles);

    /**
     * Touch token last used time.
     *
     * @param tokenValue raw token value
     */
    void touchTokenLastUsedTime(String tokenValue);
}
