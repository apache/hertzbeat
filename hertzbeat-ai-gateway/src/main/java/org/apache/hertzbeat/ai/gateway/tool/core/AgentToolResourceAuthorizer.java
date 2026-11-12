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

import java.util.List;
import java.util.Optional;
import org.apache.hertzbeat.ai.gateway.identity.AgentActor;
import org.apache.hertzbeat.ai.gateway.identity.ActorSupport;

/** Uses the authenticated runtime actor, never model arguments or an ambient HTTP subject. */
public final class AgentToolResourceAuthorizer {

    private AgentToolResourceAuthorizer() {
    }

    public static Optional<String> denialReason(AgentActor actor, AgentToolDescriptor descriptor) {
        if (descriptor.getAccess() == AgentToolAccess.STANDARD) {
            return Optional.empty();
        }
        if (!ActorSupport.hasIdentity(actor) || !ActorSupport.TYPE_USER.equals(actor.getType())) {
            return Optional.of("This tool requires an authenticated user with resource permission");
        }
        List<String> roles = actor.getRoles();
        if (roles != null && roles.contains(ActorSupport.ROLE_ADMIN)) {
            return Optional.empty();
        }
        if (descriptor.getAccess() == AgentToolAccess.USER
                && roles != null && roles.contains(ActorSupport.ROLE_USER)) {
            return Optional.empty();
        }
        return Optional.of("The actor does not have permission for this resource operation");
    }
}
