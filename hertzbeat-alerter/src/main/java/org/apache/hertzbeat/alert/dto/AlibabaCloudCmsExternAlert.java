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

package org.apache.hertzbeat.alert.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import java.util.Map;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Alibaba Cloud Monitor 2.0 webhook alert entity.
 *
 * @see <a href="https://help.aliyun.com/zh/cms/cloudmonitor-2-0/notification-object">
 *     Alibaba Cloud Monitor webhook payload fields</a>
 */
@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class AlibabaCloudCmsExternAlert {

    private String specversion;

    private String id;

    private String type;

    private String subtype;

    private String source;

    private String sourcetype;

    private String time;

    private Long timestamp;

    private String subject;

    private String datacontenttype;

    private String severity;

    private String status;

    private String userId;

    private String ruleId;

    private String workspace;

    private String traceId;

    private String alertMessage;

    private String alertEntityId;

    private Resource resource;

    private Map<String, Object> labels;

    private Map<String, Object> annotations;

    private AlertData data;

    private Map<String, Object> alertEntityFields;

    private String ruleUrl;

    private String entityUrl;

    private String alertRuleUrl;

    private String alertHistoryUrl;

    /**
     * Alert resource.
     */
    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class Resource {

        private Entity entity;

        private Map<String, Object> tags;
    }

    /**
     * Alert resource entity.
     */
    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class Entity {

        private String domain;

        @JsonAlias("entity_type")
        private String entityType;

        @JsonAlias("entity_id")
        private String entityId;

        private Map<String, Object> prop;
    }

    /**
     * Threshold alert data.
     */
    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class AlertData {

        private Object value;

        private Object threshold;

        private String comparisonOperator;
    }
}
