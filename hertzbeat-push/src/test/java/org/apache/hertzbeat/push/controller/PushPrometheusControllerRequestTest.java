/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

package org.apache.hertzbeat.push.controller;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

import jakarta.servlet.http.HttpServletRequestWrapper;
import org.apache.hertzbeat.push.config.PushSuccessRequestWrapper;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;

class PushPrometheusControllerRequestTest {

    @Test
    void successfulPushRemainsSuccessfulWhenLaterFiltersWrapTheRequest() {
        String job = "proof_job";
        String instance = "proof_instance";
        MockHttpServletRequest request = new MockHttpServletRequest(
                "POST", "/api/push/prometheus/job/" + job + "/instance/" + instance);
        PushSuccessRequestWrapper pushRequest = new PushSuccessRequestWrapper(request, job, instance);
        HttpServletRequestWrapper laterFilterRequest = new HttpServletRequestWrapper(pushRequest);

        var response = new PushPrometheusController().pushMetrics(laterFilterRequest);

        assertEquals(HttpStatus.OK, response.getStatusCode());
        assertTrue(response.getBody().getMsg().contains(job));
        assertTrue(response.getBody().getMsg().contains(instance));
    }
}
