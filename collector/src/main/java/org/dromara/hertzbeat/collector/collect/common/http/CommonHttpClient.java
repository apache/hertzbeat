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

package org.dromara.hertzbeat.collector.collect.common.http;

import lombok.extern.slf4j.Slf4j;
import org.apache.http.client.config.RequestConfig;
import org.apache.http.config.Registry;
import org.apache.http.config.RegistryBuilder;
import org.apache.http.conn.socket.ConnectionSocketFactory;
import org.apache.http.conn.socket.PlainConnectionSocketFactory;
import org.apache.http.conn.ssl.NoopHostnameVerifier;
import org.apache.http.conn.ssl.SSLConnectionSocketFactory;
import org.apache.http.impl.client.CloseableHttpClient;
import org.apache.http.impl.client.HttpClients;
import org.apache.http.impl.conn.PoolingHttpClientConnectionManager;
import org.apache.http.ssl.SSLContexts;

import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;
import java.security.cert.CertificateException;
import java.security.cert.CertificateExpiredException;
import java.security.cert.X509Certificate;
import java.util.Date;
import java.util.concurrent.TimeUnit;

/**
 * common http client
 * @author tomsun28
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
     * validated time for idle connection
     * 空闲连接免检的有效时间，被重用的空闲连接若超过此时间，需检查此连接的可用性
     */
    private static final int INACTIVITY_VALIDATED_TIME = 10000;

    /**
     * ssl supported version
     */
    private static final String[] SUPPORTED_SSL = {"TLSv1","TLSv1.1","TLSv1.2","SSLv3"};

    static {
        try {
            SSLContext sslContext = SSLContexts.createDefault();
            X509TrustManager x509TrustManager = new X509TrustManager() {
                @Override
                public void checkClientTrusted(X509Certificate[] x509Certificates, String s) throws CertificateException { }
                @Override
                public void checkServerTrusted(X509Certificate[] x509Certificates, String s) throws CertificateException {
                    // check server certificate timeout 
                    // 判断服务器证书有效时间
                    Date now = new Date();
                    if (x509Certificates != null && x509Certificates.length > 0) {
                        for (X509Certificate certificate : x509Certificates) {
                            Date deadline = certificate.getNotAfter();
                            if (deadline != null && now.after(deadline)) {
                                throw new CertificateExpiredException();
                            }
                        }
                    }
                }
                @Override
                public X509Certificate[] getAcceptedIssuers() { return null; }
            };
            sslContext.init(null, new TrustManager[]{x509TrustManager}, null);
            SSLConnectionSocketFactory sslFactory = new SSLConnectionSocketFactory(sslContext, SUPPORTED_SSL, null, new NoopHostnameVerifier());
            Registry<ConnectionSocketFactory> registry = RegistryBuilder.<ConnectionSocketFactory>create()
                    .register("http", PlainConnectionSocketFactory.INSTANCE)
                    .register("https", sslFactory)
                    .build();
            RequestConfig requestConfig = RequestConfig.custom()
                    .setConnectionRequestTimeout(REQUIRE_CONNECT_TIMEOUT)
                    .setConnectTimeout(CONNECT_TIMEOUT)
                    .setSocketTimeout(SOCKET_TIMEOUT)
                    // auto redirect when 301 302 response status 
                    .setRedirectsEnabled(true)
                    .build();
            // connection pool
            connectionManager = new PoolingHttpClientConnectionManager(registry);
            connectionManager.setMaxTotal(MAX_TOTAL_CONNECTIONS);
            connectionManager.setDefaultMaxPerRoute(MAX_PER_ROUTE_CONNECTIONS);
            connectionManager.setValidateAfterInactivity(INACTIVITY_VALIDATED_TIME);
            httpClient = HttpClients.custom()
                    .setConnectionManager(connectionManager)
                    .setDefaultRequestConfig(requestConfig)
                    // 定期清理不可用过期连接
                    .evictExpiredConnections()
                    // 定期清理可用但空闲的连接
                    .evictIdleConnections(100, TimeUnit.SECONDS)
                    .build();
            Thread connectCleaner = new Thread(() -> {
                while (Thread.currentThread().isInterrupted()) {
                    try {
                        Thread.sleep(30000);
                        connectionManager.closeExpiredConnections();
                        connectionManager.closeIdleConnections(100, TimeUnit.SECONDS);
                    } catch (InterruptedException e) {
                    }
                }
            });
            connectCleaner.setName("http-connection-pool-cleaner");
            connectCleaner.setDaemon(true);
            connectCleaner.start();
        } catch (Exception e) {
        }
    }

    public static CloseableHttpClient getHttpClient() {
        return httpClient;
    }
}
