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

package org.apache.hertzbeat.grafana.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.headerDoesNotExist;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.method;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

import java.util.List;
import org.apache.hertzbeat.grafana.config.GrafanaProperties;
import org.apache.hertzbeat.grafana.dao.GrafanaConfigDao;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.client.ClientHttpRequestInterceptor;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestTemplate;

class ServiceAccountServiceTest {

    @ParameterizedTest
    @ValueSource(strings = {"list", "create", "token"})
    void accountRequestsKeepAuthenticationLocalToTheRequest(String operation) {
        RestTemplate shared = new RestTemplate();
        ClientHttpRequestInterceptor existing = (request, body, execution) -> {
            request.getHeaders().set("X-Shared-Client", "retained");
            return execution.execute(request, body);
        };
        shared.setInterceptors(List.of(existing));
        MockRestServiceServer server = MockRestServiceServer.bindTo(shared).build();
        HttpHeaders authentication = new HttpHeaders();
        authentication.setBasicAuth("fixture-user", "fixture-password");
        String basic = authentication.getFirst(HttpHeaders.AUTHORIZATION);
        server.expect(requestTo("https://grafana.example/api/serviceaccounts/search"))
                .andExpect(method(HttpMethod.GET)).andExpect(header(HttpHeaders.AUTHORIZATION, basic))
                .andRespond(withSuccess("{\"serviceAccounts\":[]}", MediaType.APPLICATION_JSON));
        if (!"list".equals(operation)) {
            server.expect(requestTo("https://grafana.example/api/serviceaccounts"))
                    .andExpect(method(HttpMethod.POST)).andExpect(header(HttpHeaders.AUTHORIZATION, basic))
                    .andRespond(withSuccess("{\"id\":7}", MediaType.APPLICATION_JSON));
        }
        if ("token".equals(operation)) {
            server.expect(requestTo("https://grafana.example/api/serviceaccounts/7/tokens"))
                    .andExpect(method(HttpMethod.POST)).andExpect(header(HttpHeaders.AUTHORIZATION, basic))
                    .andRespond(withSuccess("{\"key\":\"fixture-token\"}", MediaType.APPLICATION_JSON));
        }
        server.expect(requestTo("https://notification.example/receiver"))
                .andExpect(headerDoesNotExist(HttpHeaders.AUTHORIZATION))
                .andExpect(header("X-Shared-Client", "retained"))
                .andRespond(withSuccess("accepted", MediaType.TEXT_PLAIN));
        ServiceAccountService service = new ServiceAccountService(new GrafanaProperties(
                true, "https://grafana.example", "https://grafana.example", "fixture-user", "fixture-password"),
                mock(GrafanaConfigDao.class), shared);
        service.init();

        switch (operation) {
            case "list" -> service.getAccounts();
            case "create" -> assertThat(service.createServiceAccount()).isEqualTo(7L);
            case "token" -> assertThat(service.applyForToken()).isEqualTo("fixture-token");
            default -> throw new IllegalArgumentException(operation);
        }
        shared.getForObject("https://notification.example/receiver", String.class);

        assertThat(shared.getInterceptors()).containsExactly(existing);
        server.verify();
    }
}
