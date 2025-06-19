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

import org.apache.hertzbeat.common.constants.ConfigConstants;
import java.net.URL;

/**
 * Grafana Common Constants
 */
public interface GrafanaConstants {

    String ADMIN = "admin";

    String KIOSK = "?kiosk=tv";

    String REFRESH = "&refresh=15s";

    String INSTANCE = "&var-instance=";

    String CREATE_DASHBOARD_API = "/api/dashboards/db";

    String DELETE_DASHBOARD_API = "/api/dashboards/uid/%s";

    String DATASOURCE_BASE_NAME = "hertzbeat";

    String DATASOURCE_TYPE = "prometheus";

    String DATASOURCE_ACCESS = "proxy";

    String CREATE_DATASOURCE_API = "/api/datasources";

    String QUERY_DATASOURCE_API = "/api/datasources/name/";

    String GET_SERVICE_ACCOUNTS_API = "%s/api/serviceaccounts/search";

    String ACCOUNT_NAME = ConfigConstants.SystemConstant.PROJECT_NAME;

    String ACCOUNT_ROLE = "Admin";

    String CREATE_SERVICE_ACCOUNT_API = "%s/api/serviceaccounts";

    String CREATE_SERVICE_TOKEN_API = "%s/api/serviceaccounts/%d/tokens";

    String GRAFANA_CONFIG = "grafanaConfig";

    /**
     * Generate data source name based on type and URL
     * @param type Data source type (vm or greptime)
     * @param url Data source URL
     * @return Generated unique data source name
     */
    static String generateDatasourceName(String type, String url) {
        try {
            URL parsedUrl = new URL(url);
            String host = parsedUrl.getHost();
            int port = parsedUrl.getPort();

            // Extract host without subdomain for cleaner names
            String hostPart = host != null ? host.replaceAll("^www\\.", "") : "localhost";

            // Include port if it's not default
            String portPart = (port > 0 && port != 80 && port != 443) ? "-" + port : "";

            return String.format("%s-%s-%s%s", DATASOURCE_BASE_NAME, type, hostPart, portPart);
        } catch (Exception e) {
            // Fallback to simple naming if URL parsing fails
            return String.format("%s-%s-%s", DATASOURCE_BASE_NAME, type, url.hashCode());
        }
    }

    /**
     * Generate USE_DATASOURCE parameter with dynamic datasource name
     * @param datasourceName The datasource name
     * @return USE_DATASOURCE parameter string
     */
    static String generateUseDatasource(String datasourceName) {
        return "&var-ds=" + datasourceName;
    }
}