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

package org.apache.hertzbeat.collector.collect.mqtt;

import org.apache.hertzbeat.common.entity.job.protocol.MqttProtocol;
import org.bouncycastle.asn1.pkcs.PrivateKeyInfo;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.bouncycastle.openssl.PEMKeyPair;
import org.bouncycastle.openssl.PEMParser;
import org.bouncycastle.openssl.jcajce.JcaPEMKeyConverter;

import javax.net.ssl.SSLSocketFactory;
import javax.net.ssl.SSLContext;
import javax.net.ssl.TrustManager;
import javax.net.ssl.X509TrustManager;
import javax.net.ssl.KeyManagerFactory;
import javax.net.ssl.TrustManagerFactory;
import java.io.ByteArrayInputStream;
import java.io.InputStream;
import java.io.StringReader;
import java.security.KeyStore;
import java.security.PrivateKey;
import java.security.Security;
import java.security.cert.Certificate;
import java.security.cert.CertificateFactory;
import java.security.cert.X509Certificate;
import java.util.Collection;

/**
 * Support MQTT SSL Factory
 */
public class MqttSslFactory {

    /**
     * Get MSL Socket Factory
     */
    public static SSLSocketFactory getMslSocketFactory(MqttProtocol mqttProtocol, boolean insecureSkipVerify) {
        try {
            Security.addProvider(new BouncyCastleProvider());

            KeyStore ks = KeyStore.getInstance(KeyStore.getDefaultType());
            ks.load(null, null);

            Certificate[] chain = null;
            if (mqttProtocol.getClientCert() != null && !mqttProtocol.getClientCert().isEmpty()) {
                String formatClientCert = CertificateFormatter.formatCertificateChain(mqttProtocol.getClientCert());
                try (InputStream certIn = new ByteArrayInputStream(formatClientCert.getBytes())) {
                    CertificateFactory cf = CertificateFactory.getInstance("X.509");
                    Collection<? extends Certificate> certs = cf.generateCertificates(certIn);
                    chain = certs.toArray(new Certificate[0]);
                }
            }

            PrivateKey privateKey;
            if (mqttProtocol.getClientKey() != null && !mqttProtocol.getClientKey().isEmpty()) {
                String formatClientKey = CertificateFormatter.formatPrivateKey(mqttProtocol.getClientKey());
                try (PEMParser pemParser = new PEMParser(new StringReader(formatClientKey))) {
                    JcaPEMKeyConverter converter = new JcaPEMKeyConverter().setProvider("BC");
                    Object object = pemParser.readObject();

                    if (object instanceof PEMKeyPair) {
                        privateKey = converter.getPrivateKey(((PEMKeyPair) object).getPrivateKeyInfo());
                    } else if (object instanceof PrivateKeyInfo) {
                        privateKey = converter.getPrivateKey((PrivateKeyInfo) object);
                    } else {
                        throw new IllegalArgumentException("Unsupported private key type");
                    }

                    ks.setKeyEntry("private-key", privateKey, "".toCharArray(), chain);
                }
            }

            TrustManager[] trustManagers;
            if (insecureSkipVerify) {
                trustManagers = createInsecureTrustManager();
            } else {
                String formatCaCert = CertificateFormatter.formatCertificateChain(mqttProtocol.getCaCert());
                KeyStore trustStore = createMergedTrustStore(formatCaCert);
                TrustManagerFactory tmf = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm());
                tmf.init(trustStore);
                trustManagers = tmf.getTrustManagers();
            }

            KeyManagerFactory kmf = KeyManagerFactory.getInstance(KeyManagerFactory.getDefaultAlgorithm());
            kmf.init(ks, "".toCharArray());


            SSLContext context = SSLContext.getInstance(mqttProtocol.getTlsVersion());
            context.init(kmf.getKeyManagers(), trustManagers, null);

            return context.getSocketFactory();
        } catch (Exception e) {
            throw new RuntimeException("Fails to SSL initialize: " + e.getMessage(), e);
        }
    }

    /**
     * Get SSL Socket Factory
     */
    public static SSLSocketFactory getSslSocketFactory(MqttProtocol mqttProtocol, boolean insecureSkipVerify) {
        try {
            Security.addProvider(new BouncyCastleProvider());


            TrustManager[] trustManagers;
            if (insecureSkipVerify) {
                trustManagers = createInsecureTrustManager();
            } else {

                String formatCaCert = CertificateFormatter.formatCertificateChain(mqttProtocol.getCaCert());
                KeyStore trustStore = createMergedTrustStore(formatCaCert);
                TrustManagerFactory tmf = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm());
                tmf.init(trustStore);
                trustManagers = tmf.getTrustManagers();
            }

            SSLContext sslContext = SSLContext.getInstance(mqttProtocol.getTlsVersion());
            sslContext.init(null, trustManagers, null);

            return sslContext.getSocketFactory();
        } catch (Exception e) {
            throw new RuntimeException("Fails to SSL initialize: " + e.getMessage(), e);
        }
    }

    private static TrustManager[] createInsecureTrustManager() {
        return new TrustManager[]{
                new X509TrustManager() {
                    public void checkClientTrusted(X509Certificate[] chain, String authType) {
                    }

                    public void checkServerTrusted(X509Certificate[] chain, String authType) {
                    }

                    public X509Certificate[] getAcceptedIssuers() {
                        return new X509Certificate[0];
                    }
                }
        };
    }

    private static KeyStore createMergedTrustStore(String caCertPem) throws Exception {
        KeyStore mergedKs = KeyStore.getInstance(KeyStore.getDefaultType());
        mergedKs.load(null, null);


        TrustManagerFactory systemTmf = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm());
        systemTmf.init((KeyStore) null);
        X509TrustManager systemTm = (X509TrustManager) systemTmf.getTrustManagers()[0];

        int systemIndex = 1;
        for (X509Certificate cert : systemTm.getAcceptedIssuers()) {
            mergedKs.setCertificateEntry("system-ca-" + systemIndex++, cert);
        }


        if (caCertPem != null && !caCertPem.isEmpty()) {
            try (InputStream caIn = new ByteArrayInputStream(caCertPem.getBytes())) {
                CertificateFactory cf = CertificateFactory.getInstance("X.509");
                Collection<? extends Certificate> customCerts = cf.generateCertificates(caIn);

                int customIndex = 1;
                for (Certificate cert : customCerts) {
                    mergedKs.setCertificateEntry("custom-ca-" + customIndex++, cert);
                }
            }
        }

        return mergedKs;
    }
}
