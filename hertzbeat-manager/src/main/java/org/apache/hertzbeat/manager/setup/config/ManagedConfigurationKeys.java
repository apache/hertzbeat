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

package org.apache.hertzbeat.manager.setup.config;

/** Property names shared by managed document, export, and status boundaries. */
public final class ManagedConfigurationKeys {
    public static final String DATASOURCE_URL = "spring.datasource.url";
    public static final String DATASOURCE_USERNAME = "spring.datasource.username";
    public static final String DATASOURCE_PASSWORD = "spring.datasource.password";
    public static final String DATABASE_KIND = "spring.jpa.database";
    public static final String GREPTIME_ENABLED = "warehouse.store.greptime.enabled";
    public static final String GREPTIME_GRPC = "warehouse.store.greptime.grpc-endpoints";
    public static final String GREPTIME_HTTP = "warehouse.store.greptime.http-endpoint";
    public static final String GREPTIME_DATABASE = "warehouse.store.greptime.database";
    public static final String GREPTIME_USERNAME = "warehouse.store.greptime.username";
    public static final String GREPTIME_PASSWORD = "warehouse.store.greptime.password";
    public static final String PUBLIC_BASE_URL = "hertzbeat.setup.public-base-url";
    public static final String SERVER_OTLP_HTTP = "hertzbeat.setup.server-otlp-http-endpoint";
    public static final String SERVER_OTLP_GRPC = "hertzbeat.setup.server-otlp-grpc-endpoint";
    public static final String RETENTION_METRICS = "hertzbeat.setup.retention.metrics-days";
    public static final String RETENTION_LOGS = "hertzbeat.setup.retention.logs-days";
    public static final String RETENTION_TRACES = "hertzbeat.setup.retention.traces-days";
    public static final String MAIL_HOST = "spring.mail.host";
    public static final String MAIL_SECURITY = "hertzbeat.setup.mail.security";

    private ManagedConfigurationKeys() {
    }
}
