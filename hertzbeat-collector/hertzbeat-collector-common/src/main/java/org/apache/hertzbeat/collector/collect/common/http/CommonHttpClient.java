/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.collector.collect.common.http;

import java.security.cert.CertificateException;
import java.security.cert.CertificateExpiredException;
import java.security.cert.X509Certificate;
import java.util.Date;
import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;

import lombok.extern.slf4j.Slf4j;
import org.apache.hc.client5.http.config.ConnectionConfig;
import org.apache.hc.client5.http.config.RequestConfig;
import org.apache.hc.client5.http.impl.classic.CloseableHttpClient;
import org.apache.hc.client5.http.impl.classic.HttpClients;
import org.apache.hc.client5.http.impl.io.PoolingHttpClientConnectionManager;
import org.apache.hc.client5.http.impl.io.PoolingHttpClientConnectionManagerBuilder;
import org.apache.hc.client5.http.ssl.DefaultClientTlsStrategy;
import org.apache.hc.client5.http.ssl.NoopHostnameVerifier;
import org.apache.hc.core5.reactor.ssl.SSLBufferMode;
import org.apache.hc.core5.ssl.SSLContexts;
import org.apache.hc.core5.util.TimeValue;
import org.apache.hc.core5.util.Timeout;

/**
 * common http client for HttpComponents Client 5.x
 */
@Slf4j
public class CommonHttpClient {

    private static CloseableHttpClient httpClient;

    private static PoolingHttpClientConnectionManager connectionManager;

    /**
     * all max total connection
     */
    private static final int MAX_TOTAL_CONNECTIONS = 50000;

    /**
     * peer route max total connection
     */
    private static final int MAX_PER_ROUTE_CONNECTIONS = 80;

    /**
     * timeout for get connect from pool(ms)
     */
    private static final int REQUIRE_CONNECT_TIMEOUT = 4000;

    /**
     * tcp connect timeout(ms)
     */
    private static final int CONNECT_TIMEOUT = 4000;

    /**
     * socket read timeout(ms)
     */
    private static final int SOCKET_TIMEOUT = 60000;

    /**
     * validated time for idle connection. if when reuse this connection after this time, we will check it available.
     */
    private static final int INACTIVITY_VALIDATED_TIME = 10000;

    /**
     * ssl supported version
     * Note: SSLv3 is often disabled in modern JDKs
     */
    private static final String[] SUPPORTED_SSL = {"TLSv1", "TLSv1.1", "TLSv1.2", "SSLv3"};

    static {
        try {
            // 1. SSL Context Configuration
            SSLContext sslContext = SSLContexts.createDefault();
            X509TrustManager x509TrustManager = new X509TrustManager() {
                @Override
                public void checkClientTrusted(X509Certificate[] x509Certificates, String s) { }

                @Override
                public void checkServerTrusted(X509Certificate[] x509Certificates, String s) throws CertificateException {
                    // check server ssl certificate expired
                    Date now = new Date();
                    if (x509Certificates != null) {
                        for (X509Certificate certificate : x509Certificates) {
                            Date deadline = certificate.getNotAfter();
                            if (deadline != null && now.after(deadline)) {
                                throw new CertificateExpiredException("Server certificate expired at " + deadline);
                            }
                        }
                    }
                }

                @Override
                public X509Certificate[] getAcceptedIssuers() { return null; }
            };
            sslContext.init(null, new TrustManager[]{x509TrustManager}, null);

            // 2. TlsStrategy Configuration (Replaces deprecated SSLConnectionSocketFactory/Registry)
            DefaultClientTlsStrategy tlsStrategy = new DefaultClientTlsStrategy(
                    sslContext,
                    SUPPORTED_SSL,
                    null, // Supported cipher suites (null = default)
                    SSLBufferMode.STATIC,
                    NoopHostnameVerifier.INSTANCE
            );

            // 3. Connection Manager Configuration (Using Builder)
            ConnectionConfig connectionConfig = ConnectionConfig.custom()
                    .setConnectTimeout(Timeout.ofMilliseconds(CONNECT_TIMEOUT))
                    .setSocketTimeout(Timeout.ofMilliseconds(SOCKET_TIMEOUT))
                    .setValidateAfterInactivity(TimeValue.ofMilliseconds(INACTIVITY_VALIDATED_TIME))
                    .build();

            connectionManager = PoolingHttpClientConnectionManagerBuilder.create()
                    .setTlsSocketStrategy(tlsStrategy)
                    .setMaxConnTotal(MAX_TOTAL_CONNECTIONS)
                    .setMaxConnPerRoute(MAX_PER_ROUTE_CONNECTIONS)
                    .setDefaultConnectionConfig(connectionConfig)
                    .build();

            // 4. Request Config (Connection Request Timeout & Redirects)
            RequestConfig requestConfig = RequestConfig.custom()
                    .setConnectionRequestTimeout(Timeout.ofMilliseconds(REQUIRE_CONNECT_TIMEOUT))
                    .setRedirectsEnabled(true)
                    .build();

            // 5. Build HttpClient
            httpClient = HttpClients.custom()
                    .setConnectionManager(connectionManager)
                    .setDefaultRequestConfig(requestConfig)
                    .evictExpiredConnections()
                    .evictIdleConnections(TimeValue.ofSeconds(100))
                    .build();

            // Shutdown hook
            Runtime.getRuntime().addShutdownHook(new Thread(CommonHttpClient::close));

        } catch (Exception e) {
            log.error("Initialize CommonHttpClient error", e);
        }
    }

    public static CloseableHttpClient getHttpClient() {
        return httpClient;
    }

    public static void close() {
        try {
            if (httpClient != null) {
                httpClient.close();
            }
        } catch (Exception e) {
            log.error("close http client error", e);
        }
    }
}