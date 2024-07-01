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

package org.apache.hertzbeat.grafana.common;

/**
 * Grafana Common Constants
 */
public interface CommonConstants {
    
    String KIOSK = "?kiosk=tv";

    String REFRESH = "&refresh=15s";

    String AUTHORIZATION = "Authorization";
    
    String DASHBOARD = "dashboard";
    
    String OVERWRITE = "overwrite";
    
    String BEARER = "Bearer ";
    
    String CREATE_DASHBOARD_API = "/api/dashboards/db";
    
    String DELETE_DASHBOARD_API = "/api/dashboards/uid/%s";
    
    String DATASOURCE_NAME = "hertzbeat-victoria-metrics";
    
    String DATASOURCE_TYPE = "prometheus";
    
    String DATASOURCE_ACCESS = "proxy";
    
    String CREATE_DATASOURCE_API = "http://%s:%s@%s/api/datasources";
    
    String DELETE_DATASOURCE_API = "http://%s:%s@%s/api/datasources/name/%s";  
    
    String ACCOUNT_NAME = "hertzbeat";
    
    String ACCOUNT_ROLE = "Admin";
    
    String ACCOUNT_TOKEN_NAME = "hertzbeat-token";
    
    String CREATE_SERVICE_ACCOUNT_API = "http://%s:%s@%s/api/serviceaccounts";
    
    String GET_SERVICE_ACCOUNTS_API = "http://%s:%s@%s/api/serviceaccounts/search";
    
    String DELETE_SERVICE_ACCOUNT_API = "http://%s:%s@%s/api/serviceaccounts/%d";
    
    String CREATE_SERVICE_TOKEN_API = "http://%s:%s@%s/api/serviceaccounts/%d/tokens";
    
    String GET_SERVICE_TOKENS_API = "http://%s:%s@%s/api/serviceaccounts/%d/tokens";
    
    String CONTENT_TYPE = "Content-type";
    
    String NAME = "name";
    
    String ROLE = "role";
    
    String IS_DISABLED = "isDisabled";
    
    String APPLICATION_JSON = "application/json";
    
    String HERTZBEAT_TOKEN = "hertzbeat-token";

    String TYPE = "type";

    String ACCESS = "access";

    String URL = "url";

    String BASIC_AUTH = "basicAuth";
}
