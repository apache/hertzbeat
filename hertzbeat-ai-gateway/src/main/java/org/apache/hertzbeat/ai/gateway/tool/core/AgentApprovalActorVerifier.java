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

package org.apache.hertzbeat.ai.gateway.tool.core;

import com.usthe.sureness.provider.SurenessAccountProvider;
import java.util.HashSet;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.identity.ActorSupport;
import org.springframework.stereotype.Service;

/** Revalidates the original roles without granting newly assigned roles or reading credential material. */
@Service
public class AgentApprovalActorVerifier {
    private final SurenessAccountProvider accountProvider;

    public AgentApprovalActorVerifier(SurenessAccountProvider accountProvider) {
        this.accountProvider = accountProvider;
    }

    public boolean isCurrent(AgentActor actor) {
        if (!ActorSupport.hasIdentity(actor) || !ActorSupport.TYPE_USER.equals(actor.getType())
                || actor.getRoles() == null || actor.getRoles().isEmpty()
                || !(actor.getRoles().contains(ActorSupport.ROLE_ADMIN)
                || actor.getRoles().contains(ActorSupport.ROLE_USER))) {
            return false;
        }
        try {
            var account = accountProvider.loadAccount(actor.getId());
            return account != null && !account.isDisabledAccount() && !account.isExcessiveAttempts()
                    && account.getOwnRoles() != null
                    && new HashSet<>(account.getOwnRoles()).containsAll(actor.getRoles());
        } catch (RuntimeException failure) {
            return false;
        }
    }
}
