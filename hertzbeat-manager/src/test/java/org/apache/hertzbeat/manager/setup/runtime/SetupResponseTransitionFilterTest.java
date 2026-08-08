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

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

class SetupResponseTransitionFilterTest {

    @Test
    void configurationTransitionRunsOnlyAfterResponseCommitAndApplicationReadiness() throws Exception {
        SetupRuntimeTransition transition = mock(SetupRuntimeTransition.class);
        List<Runnable> tasks = new ArrayList<>();
        SetupRuntimeTransitionScheduler scheduler = new SetupRuntimeTransitionScheduler(transition, tasks::add);
        SetupResponseTransition marker = new SetupResponseTransition();
        SetupResponseTransitionFilter filter = new SetupResponseTransitionFilter(scheduler, marker);
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/setup/configuration");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilter(request, response, (servletRequest, servletResponse) -> {
            marker.arm(servletRequest);
            servletResponse.getWriter().write("accepted");
        });

        assertThat(response.isCommitted()).isTrue();
        assertThat(tasks).isEmpty();
        verify(transition, never()).configurationApplied();

        scheduler.onApplicationReady(mock(ApplicationReadyEvent.class));
        assertThat(tasks).hasSize(1);
        tasks.removeFirst().run();
        verify(transition).configurationApplied();
    }
}
