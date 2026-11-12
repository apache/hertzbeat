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

package org.apache.hertzbeat.ai.gateway.channel.webui;

import com.usthe.sureness.subject.SubjectSum;
import com.usthe.sureness.util.SurenessContextHolder;
import java.util.List;
import org.apache.hertzbeat.ai.gateway.application.ProviderConnectionTest;
import org.apache.hertzbeat.ai.gateway.application.ProviderConnectionTestService;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.http.MediaType;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;

class ProviderConnectionEndpointContractTest {
    private static final String PATH = "/api/agent/model-providers/connection-tests";
    private static final String ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    private static final String BODY = "{\"requestId\":\"" + ID + "\",\"config\":{}}";
    private final ProviderConnectionTestService tests = mock(ProviderConnectionTestService.class);

    @AfterEach
    void clear() {
        SurenessContextHolder.clear();
        AuthTokenRequestContext.clear();
    }

    @Test
    void requiresAdminBeforeAnyOutboundActionForBothEndpoints() throws Exception {
        var mvc = MockMvcBuilders.standaloneSetup(new ModelProviderConnectionTestController(tests)).build();
        mvc.perform(post(PATH).contentType(MediaType.APPLICATION_JSON).content(BODY)).andExpect(status().isForbidden());
        mvc.perform(delete(PATH + "/" + ID)).andExpect(status().isForbidden());
        bind("user");
        mvc.perform(post(PATH).contentType(MediaType.APPLICATION_JSON).content(BODY)).andExpect(status().isForbidden());
        verifyNoInteractions(tests);
    }

    @Test
    void bindsCancellationAndTestsToAuthenticatedAdminAndWorkspace() throws Exception {
        bind("admin");
        AuthTokenRequestContext.bindWorkspaceId("workspace-fixture");
        var mvc = MockMvcBuilders.standaloneSetup(new ModelProviderConnectionTestController(tests)).build();
        when(tests.test(eq("workspace-fixture:user:fixture-admin"), any())).thenReturn(
                new ProviderConnectionTest.Result("responses", "fixture", 2, ProviderConnectionTest.Category.OK, 200));
        mvc.perform(post(PATH).contentType(MediaType.APPLICATION_JSON).content(BODY))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.category").value("OK"));
        when(tests.cancel("workspace-fixture:user:fixture-admin", ID)).thenReturn(true);
        mvc.perform(delete(PATH + "/" + ID)).andExpect(status().isOk()).andExpect(jsonPath("$.data").value(true));
    }

    private void bind(String role) {
        var subject = mock(SubjectSum.class);
        when(subject.getPrincipal()).thenReturn("fixture-admin");
        when(subject.getRoles()).thenReturn(List.of(role));
        when(subject.hasRole("admin")).thenReturn("admin".equals(role));
        when(subject.hasRole("user")).thenReturn("user".equals(role));
        SurenessContextHolder.bindSubject(subject);
    }
}
