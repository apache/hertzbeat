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

package org.apache.hertzbeat.manager.setup.workflow;

import java.util.Objects;
import org.apache.hertzbeat.manager.setup.api.SetupApiContract.SetupErrorCode;

/**
 * Stable store failure whose own message never retains provider messages, paths, or operation payloads.
 * An optional cause may be attached for diagnostics without changing the stable public message.
 */
public final class MigrationOperationStoreException extends RuntimeException {

    private final SetupErrorCode errorCode;

    MigrationOperationStoreException(SetupErrorCode errorCode) {
        this(errorCode, null);
    }

    MigrationOperationStoreException(SetupErrorCode errorCode, Throwable cause) {
        super("Migration operation store failed: " + Objects.requireNonNull(errorCode, "errorCode").value(),
                cause);
        this.errorCode = errorCode;
    }

    public SetupErrorCode errorCode() {
        return errorCode;
    }
}
