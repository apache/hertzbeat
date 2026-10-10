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

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/** Explicit provisioned self database; never creates databases or grants permissions. */
@Component
@ConfigurationProperties(prefix = "warehouse.store.greptime.self")
public class SelfTelemetryProperties {
    private boolean enabled;
    private String database = "";
    private String workspaceId = "";
    private volatile boolean ready;
    private volatile String statusReason = "NOT_CONFIGURED";

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getDatabase() {
        return database;
    }

    public void setDatabase(String database) {
        this.database = database;
    }

    public String getWorkspaceId() {
        return workspaceId;
    }

    public void setWorkspaceId(String workspaceId) {
        this.workspaceId = workspaceId;
    }

    public boolean isReady() {
        return enabled && ready;
    }

    public void markReady() {
        statusReason = "READY";
        ready = true;
    }

    public void markUnavailable() {
        markUnavailable("STORAGE_UNAVAILABLE");
    }

    public void markUnavailable(String reason) {
        ready = false;
        statusReason = reason;
    }

    public String getStatusReason() {
        return statusReason;
    }

    public void validateAgainst(String externalDatabase) {
        if (!enabled) { return; }
        String external = externalDatabase == null || externalDatabase.isBlank()
                ? "public" : externalDatabase.trim();
        if (database == null || !database.matches("[A-Za-z_][A-Za-z0-9_]*")
                || database.equalsIgnoreCase(external)
                || workspaceId == null || workspaceId.isBlank()
                || !workspaceId.equals(AuthTokenScopes.normalizeWorkspaceId(workspaceId))) {
            throw new IllegalArgumentException("Self telemetry requires a separate database identifier and explicit normalized workspace-id");
        }
    }
}
