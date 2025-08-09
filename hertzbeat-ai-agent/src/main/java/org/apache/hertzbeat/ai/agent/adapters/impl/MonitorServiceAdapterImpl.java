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


package org.apache.hertzbeat.ai.agent.adapters.impl;

import com.usthe.sureness.subject.SubjectSum;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.ai.agent.adapters.MonitorServiceAdapter;
import org.apache.hertzbeat.ai.agent.config.McpContextHolder;
import org.springframework.data.domain.Page;
import org.apache.hertzbeat.common.entity.manager.Monitor;
import org.apache.hertzbeat.common.support.SpringContextHolder;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;
import java.util.List;

/**
 * Implementation of the MonitorServiceAdapter interface that provides access to monitor information
 * through reflection by invoking the underlying monitor service implementation.
 */
@Slf4j
@Component
public class MonitorServiceAdapterImpl implements MonitorServiceAdapter {

    @Override
    public Page<Monitor> getMonitors(
            List<Long> ids,
            String app,
            String search,
            Byte status,
            String sort,
            String order,
            Integer pageIndex,
            Integer pageSize,
            String labels) {
        try {
            // Provide default values for all nullable parameters
            if (sort == null || sort.trim().isEmpty()) {
                sort = "gmtCreate";
            }
            if (order == null || order.trim().isEmpty()) {
                order = "desc";
            }
            if (pageIndex == null) {
                pageIndex = 0;
            }
            if (pageSize == null) {
                pageSize = 8;
            }
            
            Object monitorService = null;
            SubjectSum subjectSum = McpContextHolder.getSubject();
            log.debug("Current security subject: {}", subjectSum);

            try {
                monitorService = SpringContextHolder.getBean("monitorServiceImpl");
            } catch (Exception e) {
                log.debug("Could not find bean by name 'monitorServiceImpl', trying by class name");
            }

            assert monitorService != null;
            log.debug("MonitorService bean found: {}", monitorService.getClass().getSimpleName());
            Method method = monitorService.getClass().getMethod(
                    "getMonitors",
                    List.class, String.class, String.class, Byte.class,
                    String.class, String.class, int.class, int.class, String.class);


            @SuppressWarnings("unchecked")
            Page<Monitor> result = (Page<Monitor>) method.invoke(
                    monitorService,
                    ids, app, search, status, sort, order, pageIndex, pageSize, labels);
            log.debug("MonitorServiceAdapter.getMonitors result: {}", result.getContent());
            return result;

        } catch (NoSuchMethodException e) {
            throw new RuntimeException("Method not found: getMonitors", e);
        } catch (Exception e) {
            log.debug("Failed to invoke getMonitors via adapter", e);
            throw new RuntimeException("Failed to invoke getMonitors via adapter", e);
        }
    }

}
