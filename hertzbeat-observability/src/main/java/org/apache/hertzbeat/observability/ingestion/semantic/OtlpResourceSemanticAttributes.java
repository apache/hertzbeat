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

package org.apache.hertzbeat.observability.ingestion.semantic;

import java.util.List;

/**
 * OTLP resource keys HertzBeat treats as stable ingestion and entity-correlation semantics.
 */
public final class OtlpResourceSemanticAttributes {

    public static final String SERVICE_NAME = "service.name";
    public static final String SERVICE_NAMESPACE = "service.namespace";
    public static final String DEPLOYMENT_ENVIRONMENT_NAME = "deployment.environment.name";
    public static final String SERVICE_INSTANCE_ID = "service.instance.id";
    public static final String HOST_NAME = "host.name";
    public static final String HOST_ID = "host.id";
    public static final String K8S_CLUSTER_NAME = "k8s.cluster.name";
    public static final String K8S_NAMESPACE_NAME = "k8s.namespace.name";
    public static final String K8S_NODE_NAME = "k8s.node.name";
    public static final String K8S_POD_NAME = "k8s.pod.name";
    public static final String K8S_CONTAINER_NAME = "k8s.container.name";
    public static final String HERTZBEAT_ENTITY_ID = "hertzbeat.entity_id";
    public static final String HERTZBEAT_ENTITY_TYPE = "hertzbeat.entity_type";
    public static final String HERTZBEAT_ENTITY_NAME = "hertzbeat.entity_name";
    public static final String HERTZBEAT_WORKSPACE_ID = "hertzbeat.workspace_id";

    public static final List<String> PRIMARY_OTEL_IDENTITY_KEYS = List.of(
            SERVICE_NAME,
            SERVICE_NAMESPACE,
            DEPLOYMENT_ENVIRONMENT_NAME
    );

    public static final List<String> HERTZBEAT_CONTEXT_KEYS = List.of(
            HERTZBEAT_ENTITY_ID,
            HERTZBEAT_ENTITY_TYPE,
            HERTZBEAT_ENTITY_NAME,
            HERTZBEAT_WORKSPACE_ID
    );

    public static final List<String> GREPTIME_METRIC_PROMOTED_RESOURCE_KEYS = List.of(
            SERVICE_NAME,
            SERVICE_NAMESPACE,
            DEPLOYMENT_ENVIRONMENT_NAME,
            SERVICE_INSTANCE_ID,
            HOST_NAME,
            HOST_ID,
            K8S_CLUSTER_NAME,
            K8S_NAMESPACE_NAME,
            K8S_NODE_NAME,
            K8S_POD_NAME,
            K8S_CONTAINER_NAME,
            HERTZBEAT_ENTITY_ID,
            HERTZBEAT_ENTITY_TYPE,
            HERTZBEAT_ENTITY_NAME,
            HERTZBEAT_WORKSPACE_ID
    );

    private OtlpResourceSemanticAttributes() {
    }
}
