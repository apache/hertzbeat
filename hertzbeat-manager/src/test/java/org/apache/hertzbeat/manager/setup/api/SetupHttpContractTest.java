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

package org.apache.hertzbeat.manager.setup.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RestController;

/** Guards the no-store HTTP boundary independently of controller implementation. */
class SetupHttpContractTest {

    @Test
    void setupAndDeploymentResponsesAreNoStore() throws Exception {
        MockMvc mvc = MockMvcBuilders.standaloneSetup(new ContractController()).build();
        mvc.perform(get(SetupApiContract.STATUS_PATH))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"));
        mvc.perform(get(DeploymentApiContract.DEPLOYMENT_PATH))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"));
        mvc.perform(post(SetupApiContract.COMPLETE_PATH))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", "no-store"));
    }

    @RestController
    static class ContractController {

        @GetMapping(SetupApiContract.STATUS_PATH)
        ResponseEntity<Void> status() {
            return SetupHttpContract.noStore().build();
        }

        @GetMapping(DeploymentApiContract.DEPLOYMENT_PATH)
        ResponseEntity<Void> deployment() {
            return SetupHttpContract.noStore().build();
        }

        @PostMapping(SetupApiContract.COMPLETE_PATH)
        ResponseEntity<Void> complete() {
            return SetupHttpContract.noStore().build();
        }
    }
}
