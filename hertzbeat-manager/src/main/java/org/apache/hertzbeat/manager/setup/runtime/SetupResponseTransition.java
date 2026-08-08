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

package org.apache.hertzbeat.manager.setup.runtime;

import jakarta.servlet.ServletRequest;

/** Marks one successful setup response for a transition after serialization and commit. */
public final class SetupResponseTransition {
    private static final String ATTRIBUTE = SetupResponseTransition.class.getName() + ".transition";

    public void arm(ServletRequest request) {
        request.setAttribute(ATTRIBUTE, Transition.CONFIGURATION_APPLIED);
    }

    public void armCompletion(ServletRequest request) {
        request.setAttribute(ATTRIBUTE, Transition.INSTALLATION_COMPLETED);
    }

    Transition consume(ServletRequest request) {
        Object transition = request.getAttribute(ATTRIBUTE);
        if (!(transition instanceof Transition selected)) {
            return null;
        }
        request.removeAttribute(ATTRIBUTE);
        return selected;
    }

    enum Transition { CONFIGURATION_APPLIED, INSTALLATION_COMPLETED }
}
