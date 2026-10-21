/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.manager.setup.workflow;

import org.apache.hertzbeat.manager.setup.api.SetupApiContract.MetadataDatabaseKind;

/** Safe failure boundary that does not retain target credentials, URLs, or baseline SQL. */
public final class TargetSchemaProvisioningException extends RuntimeException {

    private final TargetSchemaProvisioningFailure failure;
    private final TargetSchemaConnectionDisposition disposition;

    TargetSchemaProvisioningException(
            MetadataDatabaseKind kind, TargetSchemaProvisioningFailure failure) {
        this(kind, failure, TargetSchemaConnectionDisposition.DISCARD_REQUIRED);
    }

    TargetSchemaProvisioningException(
            MetadataDatabaseKind kind,
            TargetSchemaProvisioningFailure failure,
            TargetSchemaConnectionDisposition disposition) {
        super("Target schema provisioning failed for " + kind);
        this.failure = failure;
        this.disposition = disposition;
    }

    public TargetSchemaProvisioningFailure failure() {
        return failure;
    }

    public TargetSchemaConnectionDisposition disposition() {
        return disposition;
    }
}
