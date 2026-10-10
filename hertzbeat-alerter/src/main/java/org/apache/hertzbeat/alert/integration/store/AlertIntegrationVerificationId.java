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

package org.apache.hertzbeat.alert.integration.store;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.io.Serial;
import java.io.Serializable;
import java.util.Objects;

/**
 * Workspace and source identity for one external-alert verification.
 */
@Embeddable
public class AlertIntegrationVerificationId implements Serializable {

    @Serial
    private static final long serialVersionUID = 1L;

    @Column(name = "workspace_id", nullable = false, length = 128)
    private String workspaceId;

    @Column(name = "source", nullable = false, length = 64)
    private String source;

    protected AlertIntegrationVerificationId() {
    }

    public AlertIntegrationVerificationId(String workspaceId, String source) {
        this.workspaceId = workspaceId;
        this.source = source;
    }

    public String getWorkspaceId() {
        return workspaceId;
    }

    public String getSource() {
        return source;
    }

    @Override
    public boolean equals(Object candidate) {
        if (this == candidate) {
            return true;
        }
        if (!(candidate instanceof AlertIntegrationVerificationId that)) {
            return false;
        }
        return Objects.equals(workspaceId, that.workspaceId) && Objects.equals(source, that.source);
    }

    @Override
    public int hashCode() {
        return Objects.hash(workspaceId, source);
    }
}
