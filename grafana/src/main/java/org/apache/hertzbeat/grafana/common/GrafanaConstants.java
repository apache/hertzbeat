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
public interface GrafanaConstants {
    
    String HTTP = "http://";

    String HTTPS = "https://";
    
    String KIOSK = "?kiosk=tv";

    String REFRESH = "&refresh=15s";

    String INSTANCE = "&var-instance=";
    
    String CREATE_DASHBOARD_API = "/api/dashboards/db";
    
    String DELETE_DASHBOARD_API = "/api/dashboards/uid/%s";
    
    String DATASOURCE_NAME = "hertzbeat-victoria-metrics";
    
    String USE_DATASOURCE = "&var-ds=" + DATASOURCE_NAME;
    
    String DATASOURCE_TYPE = "prometheus";
    
    String DATASOURCE_ACCESS = "proxy";
    
    String CREATE_DATASOURCE_API = "/api/datasources";
    
    String QUERY_DATASOURCE_API = "/api/datasources/name/" + DATASOURCE_NAME;
    
    String GET_SERVICE_ACCOUNTS_API = "%s:%s@%s/api/serviceaccounts/search";

    String ACCOUNT_NAME = "hertzbeat";
    
    String ACCOUNT_ROLE = "Admin";
    
    String CREATE_SERVICE_ACCOUNT_API = "%s:%s@%s/api/serviceaccounts";
    
    String CREATE_SERVICE_TOKEN_API = "%s:%s@%s/api/serviceaccounts/%d/tokens";

    String APPLICATION_JSON = "application/json";

    String URL = "url";

    String GRAFANA_CONFIG = "grafanaConfig";
}
