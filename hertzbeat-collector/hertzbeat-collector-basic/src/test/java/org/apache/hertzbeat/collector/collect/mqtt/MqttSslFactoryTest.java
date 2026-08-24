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

import static org.junit.jupiter.api.Assertions.assertNotNull;

import java.io.StringWriter;
import java.math.BigInteger;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.cert.X509Certificate;
import java.util.Date;
import org.apache.hertzbeat.common.entity.job.protocol.MqttProtocol;
import org.bouncycastle.asn1.x500.X500Name;
import org.bouncycastle.cert.jcajce.JcaX509CertificateConverter;
import org.bouncycastle.cert.jcajce.JcaX509v3CertificateBuilder;
import org.bouncycastle.openssl.jcajce.JcaPEMWriter;
import org.bouncycastle.openssl.jcajce.JcaPKCS8Generator;
import org.bouncycastle.operator.jcajce.JcaContentSignerBuilder;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

class MqttSslFactoryTest {

    private static String certPem;
    private static String pkcs1KeyPem;
    private static String pkcs8KeyPem;

    @BeforeAll
    static void generateCertAndKeys() throws Exception {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
        generator.initialize(2048);
        KeyPair keyPair = generator.generateKeyPair();
        X500Name subject = new X500Name("CN=hb-3540-mqtt");
        JcaX509v3CertificateBuilder certBuilder = new JcaX509v3CertificateBuilder(
                subject, BigInteger.ONE,
                new Date(System.currentTimeMillis() - 60_000),
                new Date(System.currentTimeMillis() + 3_600_000),
                subject, keyPair.getPublic());
        X509Certificate cert = new JcaX509CertificateConverter()
                .getCertificate(certBuilder.build(new JcaContentSignerBuilder("SHA256withRSA").build(keyPair.getPrivate())));

        certPem = writePem(cert);
        pkcs1KeyPem = writePem(keyPair.getPrivate());
        pkcs8KeyPem = writePem(new JcaPKCS8Generator(keyPair.getPrivate(), null));
    }

    @Test
    void parsesPkcs1ClientKey() {
        assertNotNull(MqttSslFactory.getMslSocketFactory(mqttProtocol(pkcs1KeyPem), true));
    }

    @Test
    void parsesPkcs8ClientKey() {
        assertNotNull(MqttSslFactory.getMslSocketFactory(mqttProtocol(pkcs8KeyPem), true));
    }

    private static MqttProtocol mqttProtocol(String clientKey) {
        return MqttProtocol.builder()
                .tlsVersion("TLSv1.2")
                .clientCert(certPem)
                .clientKey(clientKey)
                .build();
    }

    private static String writePem(Object object) throws Exception {
        StringWriter out = new StringWriter();
        try (JcaPEMWriter writer = new JcaPEMWriter(out)) {
            writer.writeObject(object);
        }
        return out.toString();
    }
}
