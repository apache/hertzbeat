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

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.io.IOException;
import org.springframework.web.filter.OncePerRequestFilter;

/** Commits a successful configuration response before scheduling the destructive context transition. */
public final class SetupResponseTransitionFilter extends OncePerRequestFilter {
    private final SetupRuntimeTransitionScheduler scheduler;
    private final SetupResponseTransition responseTransition;

    public SetupResponseTransitionFilter(
            SetupRuntimeTransitionScheduler scheduler, SetupResponseTransition responseTransition) {
        this.scheduler = scheduler;
        this.responseTransition = responseTransition;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        chain.doFilter(request, response);
        SetupResponseTransition.Transition transition = responseTransition.consume(request);
        if (transition != null) {
            response.flushBuffer();
            if (transition == SetupResponseTransition.Transition.INSTALLATION_COMPLETED) {
                scheduler.installationCompleted();
            } else {
                scheduler.configurationApplied();
            }
        }
    }
}
