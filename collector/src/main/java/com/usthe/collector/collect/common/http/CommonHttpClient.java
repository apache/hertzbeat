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

package com.usthe.collector.collect.common.http;

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
 * 统一的http客户端连接池
 * @author tomsun28
 * @date 2021/12/30 21:23
 */
@Slf4j
public class CommonHttpClient {

    private static CloseableHttpClient httpClient;

    private static PoolingHttpClientConnectionManager connectionManager;

    /**
     * 此连接池所能提供的最大连接数
     */
    private final static int MAX_TOTAL_CONNECTIONS = 50000;

    /**
     * 每个路由所能分配的最大连接数
     */
    private final static int MAX_PER_ROUTE_CONNECTIONS = 80;

    /**
     * 从连接池中获取连接的默认超时时间 4秒
     */
    private final static int REQUIRE_CONNECT_TIMEOUT = 4000;

    /**
     * 双端建立连接超时时间 4秒
     */
    private final static int CONNECT_TIMEOUT = 4000;

    /**
     * socketReadTimeout 响应tcp报文的最大间隔超时时间
     */
    private final static int SOCKET_TIMEOUT = 60000;

    /**
     * 空闲连接免检的有效时间，被重用的空闲连接若超过此时间，需检查此连接的可用性
     */
    private final static int INACTIVITY_VALIDATED_TIME = 10000;

    /**
     * ssl版本
     */
    private final static String[] SUPPORTED_SSL = {"TLSv1","TLSv1.1","TLSv1.2","SSLv3"};

    static {
        try {
            // 初始化ssl上下文
            SSLContext sslContext = SSLContexts.createDefault();
            X509TrustManager x509TrustManager = new X509TrustManager() {
                @Override
                public void checkClientTrusted(X509Certificate[] x509Certificates, String s) throws CertificateException { }
                @Override
                public void checkServerTrusted(X509Certificate[] x509Certificates, String s) throws CertificateException {
                    // 判断服务器证书有效期时间
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
            // 设置支持的ssl版本
            SSLConnectionSocketFactory sslFactory = new SSLConnectionSocketFactory(sslContext, SUPPORTED_SSL, null, new NoopHostnameVerifier());
            // 注册 http https
            Registry<ConnectionSocketFactory> registry = RegistryBuilder.<ConnectionSocketFactory>create()
                    .register("http", PlainConnectionSocketFactory.INSTANCE)
                    .register("https", sslFactory)
                    .build();
            // 网络请求默认配置
            RequestConfig requestConfig = RequestConfig.custom()
                    // 从连接池获取连接超时时间
                    .setConnectionRequestTimeout(REQUIRE_CONNECT_TIMEOUT)
                    // 和对端新连接建立时间，三次握手时间
                    .setConnectTimeout(CONNECT_TIMEOUT)
                    // 数据传输最大响应间隔时间
                    .setSocketTimeout(SOCKET_TIMEOUT)
                    // 遇到301 302自动重定向跳转
                    .setRedirectsEnabled(true)
                    .build();
            // 连接池
            connectionManager = new PoolingHttpClientConnectionManager(registry);
            connectionManager.setMaxTotal(MAX_TOTAL_CONNECTIONS);
            connectionManager.setDefaultMaxPerRoute(MAX_PER_ROUTE_CONNECTIONS);
            connectionManager.setValidateAfterInactivity(INACTIVITY_VALIDATED_TIME);
            // 构造单例 httpClient
            httpClient = HttpClients.custom()
                    .setConnectionManager(connectionManager)
                    .setDefaultRequestConfig(requestConfig)
                    // 定期清理不可用过期连接
                    .evictExpiredConnections()
                    // 定期清理可用但空闲的连接
                    .evictIdleConnections(100, TimeUnit.SECONDS)
                    .build();
            // 构造连接清理器
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
            connectCleaner.setName("HttpConnectCleaner");
            connectCleaner.setDaemon(true);
            connectCleaner.start();
        } catch (Exception e) {
        }
    }

    public static CloseableHttpClient getHttpClient() {
        return httpClient;
    }

    public static PoolingHttpClientConnectionManager getConnectionManager() {
        return connectionManager;
    }
}
