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

package org.apache.hertzbeat.ai.gateway.tool.alert;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolAccess;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolExposure;
import org.apache.hertzbeat.ai.gateway.tool.core.AgentToolPolicy;
import org.apache.hertzbeat.ai.gateway.tool.label.AgentManagementOutputSupport;
import org.apache.hertzbeat.alert.service.AlertDefineService;
import org.apache.hertzbeat.alert.service.DataSourceService;
import org.apache.hertzbeat.common.constants.CommonConstants;
import org.apache.hertzbeat.common.entity.alerter.AlertDefine;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.stereotype.Service;

/** Preview existing rules through the native validated and bounded preview pipeline. */
@Service
public class AgentAlertRuleReadToolService {
    private final AlertDefineService rules;
    private final DataSourceService datasources;

    public AgentAlertRuleReadToolService(AlertDefineService rules, DataSourceService datasources) {
        this.rules = rules;
        this.datasources = datasources;
    }

    @Tool(name = "alert_rule.preview", description = "Preview an existing saved rule through the native bounded preview service. Does not accept arbitrary SQL or query text.")
    @AgentToolPolicy(access = AgentToolAccess.ADMIN, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> preview(Long ruleId) {
        if (ruleId == null || ruleId <= 0) {
            throw new IllegalArgumentException("Positive ruleId is required");
        }
        AlertDefine rule = rules.getAlertDefine(ruleId);
        if (rule == null) {
            throw new IllegalArgumentException("Alert rule not found");
        }
        if (!Set.of("periodic_metric", "periodic_log", "periodic_trace", "realtime_log").contains(rule.getType() == null ? "" : rule.getType())) {
            throw new IllegalArgumentException("This rule type has no native preview");
        }
        if (rule.getExpr() == null || rule.getExpr().isBlank() || rule.getExpr().length() > 8192) {
            throw new IllegalArgumentException("Saved expression is empty or exceeds preview input budget");
        }
        List<Map<String, Object>> rows = rules.getDefinePreview(rule.getDatasource(), rule.getType(), rule.getExpr());
        Map<String, Object> result = new LinkedHashMap<>(AgentManagementOutputSupport.view(rows));
        boolean limitReached = rows != null && rows.size() >= CommonConstants.ALERT_PREVIEW_RESULT_LIMIT;
        result.put("nativeResultLimit", CommonConstants.ALERT_PREVIEW_RESULT_LIMIT);
        result.put("nativeLimitReached", limitReached);
        if (limitReached) {
            result.put("partial", true);
        }
        return result;
    }

    @Tool(name = "alert_rule.datasource_status", description = "Read available periodic-alert datasource executor capabilities.")
    @AgentToolPolicy(access = AgentToolAccess.USER, exposure = AgentToolExposure.MODEL_ON_DEMAND)
    public Map<String, Object> datasourceStatus() {
        return AgentManagementOutputSupport.view(datasources.getAvailableExecutors());
    }
}
