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

package org.apache.hertzbeat.collector.mysql.r2dbc;

import io.asyncer.r2dbc.mysql.MySqlConnectionConfiguration;
import io.asyncer.r2dbc.mysql.MySqlConnectionFactory;
import io.asyncer.r2dbc.mysql.constant.SslMode;
import io.asyncer.r2dbc.mysql.constant.TlsVersions;
import org.springframework.util.StringUtils;

/**
 * Builds R2DBC MySQL connection factories for the collector.
 */
public class MysqlR2dbcConnectionFactoryProvider {

    /**
     * Create a connection factory for a target MySQL instance.
     *
     * @param options target connection settings
     * @return connection factory
     */
    public MySqlConnectionFactory create(QueryOptions options) {
        return create(options, SslMode.PREFERRED);
    }

    public MySqlConnectionFactory create(QueryOptions options, SslMode sslMode) {
        if (!StringUtils.hasText(options.getHost())) {
            throw new IllegalArgumentException("R2DBC MySQL collector route requires a target host");
        }
        MySqlConnectionConfiguration.Builder builder = MySqlConnectionConfiguration.builder()
                .host(options.getHost())
                .port(options.getPort())
                .connectTimeout(options.getTimeout())
                .sslMode(sslMode)
                .tcpKeepAlive(true)
                .tcpNoDelay(true);
        if (sslMode.startSsl()) {
            // Pin to TLSv1.2 because JDK 25 + the current server matrix is unreliable when TLSv1.3 is negotiated.
            builder.tlsVersion(TlsVersions.TLS1_2);
        }
        if (StringUtils.hasText(options.getUsername())) {
            builder.user(options.getUsername());
        }
        if (options.getPassword() != null) {
            builder.password(options.getPassword());
        }
        if (StringUtils.hasText(options.resolvedDatabase())) {
            builder.database(options.resolvedDatabase());
        }
        return MySqlConnectionFactory.from(builder.build());
    }
}
