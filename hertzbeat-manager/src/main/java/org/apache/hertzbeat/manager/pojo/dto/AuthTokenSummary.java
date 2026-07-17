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

package org.apache.hertzbeat.manager.pojo.dto;

import java.time.LocalDateTime;
import org.apache.hertzbeat.common.entity.manager.AuthToken;

/** Public token metadata. Hashes and raw credentials are intentionally absent. */
public record AuthTokenSummary(
        Long id,
        String name,
        String tokenMask,
        String tokenScope,
        String workspaceId,
        String tokenAudience,
        String collectorId,
        String allowedSignals,
        Byte status,
        String creator,
        LocalDateTime gmtCreate,
        LocalDateTime expireTime,
        LocalDateTime lastUsedTime,
        LocalDateTime revokedTime,
        String revokedBy) {

    public static AuthTokenSummary fromEntity(AuthToken token) {
        return new AuthTokenSummary(
                token.getId(), token.getName(), token.getTokenMask(), token.getTokenScope(), token.getWorkspaceId(),
                token.getTokenAudience(), token.getCollectorId(), token.getAllowedSignals(), token.getStatus(),
                token.getCreator(), token.getGmtCreate(), token.getExpireTime(), token.getLastUsedTime(),
                token.getRevokedTime(), token.getRevokedBy());
    }
}
