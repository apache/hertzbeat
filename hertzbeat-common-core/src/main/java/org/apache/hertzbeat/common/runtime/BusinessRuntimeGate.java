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

package org.apache.hertzbeat.common.runtime;

import java.util.Objects;

/** Represents the business-runtime boundary decided before an application context starts. */
public final class BusinessRuntimeGate {

    private final RuntimeMode mode;

    private BusinessRuntimeGate(RuntimeMode mode) {
        this.mode = Objects.requireNonNull(mode, "mode");
    }

    public static BusinessRuntimeGate fixed(RuntimeMode mode) {
        return new BusinessRuntimeGate(mode);
    }

    public RuntimeMode mode() {
        return mode;
    }

    public boolean isOpen() {
        return mode == RuntimeMode.NORMAL;
    }
}
