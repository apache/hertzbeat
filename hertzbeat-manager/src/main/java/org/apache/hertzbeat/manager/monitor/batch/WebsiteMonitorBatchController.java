/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.manager.monitor.batch;

import com.usthe.sureness.subject.SubjectSum;
import com.usthe.sureness.util.SurenessContextHolder;

import org.apache.hertzbeat.common.entity.dto.Message;
import org.apache.hertzbeat.common.observability.gateway.AuthTokenRequestContext;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Collection;

/** Native application API. Identity and workspace are never accepted from request JSON. */
@RestController
@RequestMapping("/api/monitors/batches/website")
public class WebsiteMonitorBatchController {
    private final WebsiteMonitorBatchService service;

    public WebsiteMonitorBatchController(WebsiteMonitorBatchService service) {
        this.service = service;
    }

    @PostMapping
    public Message<WebsiteMonitorBatch.Result> create(
            @RequestBody WebsiteMonitorBatch.Request request) {
        return Message.success(service.create(caller(), request));
    }

    @PostMapping("/status")
    public Message<WebsiteMonitorBatch.Result> status(
            @RequestBody WebsiteMonitorBatch.Request request) {
        return Message.success(service.status(caller(), request));
    }

    private WebsiteMonitorBatch.Caller caller() {
        SubjectSum subject = SurenessContextHolder.getBindSubject();
        if (subject == null
                || subject.getPrincipal() == null
                || !(subject.getRoles() instanceof Collection<?> roles)) {
            throw new SecurityException("An authenticated monitor-create subject is required");
        }
        return new WebsiteMonitorBatch.Caller(
                String.valueOf(subject.getPrincipal()),
                AuthTokenRequestContext.currentWorkspaceId(),
                roles.stream().map(String::valueOf).toList());
    }
}
