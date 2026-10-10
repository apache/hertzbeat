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

import org.apache.hertzbeat.manager.setup.config.MetadataDatabaseSettings;
import org.apache.hertzbeat.manager.setup.config.SecretValue;

/**
 * Persists the secret-free preparation boundary before target schema provisioning begins.
 *
 * <p>The callback is synchronous and must not retain its context, target, or borrowed password. A
 * normal return means the operation is durably prepared for the exact target identity. Callers
 * must pass this seam explicitly; {@link #NO_OP} exists only for isolated tests that do not
 * exercise durable workflow state.
 */
@FunctionalInterface
interface RetainedCutoverPreparation {

    RetainedCutoverPreparation NO_OP = (context, target, password) -> { };

    void prepare(
            RetainedCutoverPreparationContext context,
            MetadataDatabaseSettings target,
            SecretValue borrowedPassword);
}
