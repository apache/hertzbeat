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

package org.apache.hertzbeat.collector.collect.nebulagraph;

import static org.junit.jupiter.api.Assertions.assertNotNull;

import com.vesoft.nebula.client.graph.data.CASignedSSLParam;
import com.vesoft.nebula.util.SslUtil;
import java.io.FileWriter;
import java.math.BigInteger;
import java.nio.file.Path;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.cert.X509Certificate;
import java.util.Date;
import org.bouncycastle.asn1.x500.X500Name;
import org.bouncycastle.cert.jcajce.JcaX509CertificateConverter;
import org.bouncycastle.cert.jcajce.JcaX509v3CertificateBuilder;
import org.bouncycastle.openssl.jcajce.JcaPEMWriter;
import org.bouncycastle.operator.jcajce.JcaContentSignerBuilder;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

class VesoftSslBouncyCastleSmokeTest {

    @Test
    void vesoftSslUtilWorksWithBouncyCastleJdk18on(@TempDir Path dir) throws Exception {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
        generator.initialize(2048);
        KeyPair keyPair = generator.generateKeyPair();
        X500Name subject = new X500Name("CN=hb-3540-smoke");
        JcaX509v3CertificateBuilder certBuilder = new JcaX509v3CertificateBuilder(
                subject, BigInteger.ONE,
                new Date(System.currentTimeMillis() - 60_000),
                new Date(System.currentTimeMillis() + 3_600_000),
                subject, keyPair.getPublic());
        X509Certificate cert = new JcaX509CertificateConverter()
                .getCertificate(certBuilder.build(new JcaContentSignerBuilder("SHA256withRSA").build(keyPair.getPrivate())));

        Path crt = dir.resolve("smoke.crt");
        Path key = dir.resolve("smoke.key");
        try (JcaPEMWriter writer = new JcaPEMWriter(new FileWriter(crt.toFile()))) {
            writer.writeObject(cert);
        }
        try (JcaPEMWriter writer = new JcaPEMWriter(new FileWriter(key.toFile()))) {
            writer.writeObject(keyPair.getPrivate());
        }

        CASignedSSLParam param = new CASignedSSLParam(crt.toString(), crt.toString(), key.toString());
        assertNotNull(SslUtil.getSSLSocketFactoryWithCA(param));
    }
}
