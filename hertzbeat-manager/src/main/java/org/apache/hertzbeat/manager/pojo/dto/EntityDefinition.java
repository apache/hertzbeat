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

package org.apache.hertzbeat.manager.pojo.dto;

import java.util.List;
import java.util.Map;
import lombok.Data;

/**
 * HertzBeat entity definition document.
 * <p>
 * This type is the formal external contract for HertzBeat v1
 * entity import/export. Workspace/detail aggregation fields remain outside of
 * this definition shape on purpose.
 */
@Data
public class EntityDefinition {

    private String apiVersion;

    private String kind;

    private Metadata metadata;

    private Spec spec;

    private Map<String, Object> integrations;

    private Map<String, Object> extensions;

    private Hertzbeat hertzbeat;

    /**
     * Definition metadata block.
     */
    @Data
    public static class Metadata {
        private String name;
        private String namespace;
        private String owner;
        private List<OwnerRef> additionalOwners;
        private String inheritFrom;
        private String displayName;
        private String description;
        private Map<String, String> labels;
        private List<String> tags;
        private List<Link> links;
        private List<Contact> contacts;
    }

    /**
     * Definition spec block.
     */
    @Data
    public static class Spec {
        private String type;
        private String source;
        private String owner;
        private String ownedBy;
        private String namespace;
        private String environment;
        private String criticality;
        private String runbook;
        private String lifecycle;
        private String tier;
        private String system;
        private String partOf;
        private List<String> componentOf;
        private List<String> components;
        private List<String> implementedBy;
        private ApiInterface apiInterface;
        private List<String> languages;
        private Telemetry telemetry;
        private List<String> dependsOn;
        private List<Relation> relations;
    }

    /**
     * HertzBeat v1 API interface block.
     */
    @Data
    public static class ApiInterface {
        private Object definition;
        private String fileRef;
    }

    /**
     * HertzBeat-specific extension block.
     */
    @Data
    public static class Hertzbeat {
        private List<CodeLocation> codeLocations;
        private List<SavedQuery> events;
        private List<SavedQuery> logs;
        private PerformanceData performanceData;
        private Pipelines pipelines;
    }

    /**
     * HertzBeat code location descriptor.
     */
    @Data
    public static class CodeLocation {
        private String repositoryURL;
        private List<String> paths;
    }

    /**
     * Saved query descriptor.
     */
    @Data
    public static class SavedQuery {
        private String name;
        private String query;
    }

    /**
     * HertzBeat performance data block.
     */
    @Data
    public static class PerformanceData {
        private List<String> tags;
    }

    /**
     * HertzBeat pipeline metadata block.
     */
    @Data
    public static class Pipelines {
        private List<String> fingerprints;
    }

    /**
     * Owner reference descriptor.
     */
    @Data
    public static class OwnerRef {
        private String name;
        private String type;
    }

    /**
     * Catalog link descriptor.
     */
    @Data
    public static class Link {
        private String name;
        private String type;
        private String provider;
        private String url;
    }

    /**
     * Catalog contact descriptor.
     */
    @Data
    public static class Contact {
        private String name;
        private String type;
        private String contact;
        private String value;
    }

    /**
     * Telemetry binding block.
     */
    @Data
    public static class Telemetry {
        private List<Identity> identities;
        private List<MonitorBind> monitors;
    }

    /**
     * Telemetry identity descriptor.
     */
    @Data
    public static class Identity {
        private String key;
        private String value;
        private String type;
        private Integer priority;
        private Boolean primary;
    }

    /**
     * Monitor binding descriptor.
     */
    @Data
    public static class MonitorBind {
        private Long monitorId;
        private String bindType;
        private String bindSource;
        private String status;
        private Integer score;
        private Map<String, List<String>> matchContext;
    }

    /**
     * Relation descriptor.
     */
    @Data
    public static class Relation {
        private Long targetEntityId;
        private String targetRef;
        private String relationType;
        private String relationSource;
        private String status;
        private Integer score;
        private String description;
        private Map<String, String> attributes;
    }
}
