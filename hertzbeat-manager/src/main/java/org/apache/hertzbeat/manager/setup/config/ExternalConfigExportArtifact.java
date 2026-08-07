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

package org.apache.hertzbeat.manager.setup.config;

import java.util.Objects;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupOperationState;

/** Safe attachment metadata and sensitive bytes for operator-applied configuration. */
public record ExternalConfigExportArtifact(
        String fileName,
        String mediaType,
        SensitiveExportContent content) {

    public ExternalConfigExportArtifact {
        if (fileName == null || !fileName.matches("[A-Za-z0-9._-]+")) {
            throw new IllegalArgumentException("Export filename is unsafe");
        }
        if (mediaType == null || mediaType.isBlank() || mediaType.indexOf('\\') >= 0
                || mediaType.indexOf('\r') >= 0 || mediaType.indexOf('\n') >= 0) {
            throw new IllegalArgumentException("Export media type is unsafe");
        }
        Objects.requireNonNull(content, "content");
    }

    public SetupOperationState state() {
        return SetupOperationState.AWAITING_EXTERNAL_APPLY;
    }

    public boolean noStore() {
        return true;
    }

    @Override
    public String toString() {
        return "ExternalConfigExportArtifact[fileName=" + fileName + ", mediaType=" + mediaType
                + ", content=<redacted>, state=awaiting_external_apply, noStore=true]";
    }
}
