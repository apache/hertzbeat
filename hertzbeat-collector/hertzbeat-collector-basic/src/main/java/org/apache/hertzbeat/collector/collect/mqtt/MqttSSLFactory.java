package org.apache.hertzbeat.collector.collect.mqtt;

import org.apache.hertzbeat.common.entity.job.protocol.MqttProtocol;
import org.bouncycastle.asn1.pkcs.PrivateKeyInfo;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.bouncycastle.openssl.PEMKeyPair;
import org.bouncycastle.openssl.PEMParser;
import org.bouncycastle.openssl.jcajce.JcaPEMKeyConverter;

import javax.net.ssl.*;
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

public class MqttSSLFactory {


    // 修改点1: 新增参数 insecureSkipVerify
    public static SSLSocketFactory getMSLSocketFactory(MqttProtocol mqttProtocol, boolean insecureSkipVerify) {
        try {
            Security.addProvider(new BouncyCastleProvider());

            KeyStore ks = KeyStore.getInstance(KeyStore.getDefaultType());
            ks.load(null, null);

            // 加载客户端证书链
            Certificate[] chain = null;
            if (mqttProtocol.getClientCert() != null && !mqttProtocol.getClientCert().isEmpty()) {
                String formatClientCert = CertificateFormatter.formatCertificateChain(mqttProtocol.getClientCert());
                try (InputStream certIn = new ByteArrayInputStream(formatClientCert.getBytes())) {
                    CertificateFactory cf = CertificateFactory.getInstance("X.509");
                    Collection<? extends Certificate> certs = cf.generateCertificates(certIn);
                    chain = certs.toArray(new Certificate[0]);
                }
            }

            // 加载私钥
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
                        throw new IllegalArgumentException("不支持的私钥格式");
                    }

                    ks.setKeyEntry("private-key", privateKey, "".toCharArray(), chain);
                }
            }

            // 关键修改: 根据insecureSkipVerify决定TrustManager
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

            // 初始化KeyManager
            KeyManagerFactory kmf = KeyManagerFactory.getInstance(KeyManagerFactory.getDefaultAlgorithm());
            kmf.init(ks, "".toCharArray());

            // 创建SSLContext
            SSLContext context = SSLContext.getInstance(mqttProtocol.getTlsVersion());
            context.init(kmf.getKeyManagers(), trustManagers, null);

            return context.getSocketFactory();
        } catch (Exception e) {
            throw new RuntimeException("SSL初始化失败: " + e.getMessage(), e);
        }
    }

    // 修改点2: 新增参数 insecureSkipVerify
    public static SSLSocketFactory getSSLSocketFactory(MqttProtocol mqttProtocol, boolean insecureSkipVerify) {
        try {
            Security.addProvider(new BouncyCastleProvider());

            // 关键修改: 根据insecureSkipVerify决定TrustManager
            TrustManager[] trustManagers;
            if (insecureSkipVerify) {
                trustManagers = createInsecureTrustManager();
            } else {
                // 修正点: 使用正确的CA证书参数
                String formatCaCert = CertificateFormatter.formatCertificateChain(mqttProtocol.getCaCert());
                KeyStore trustStore = createMergedTrustStore(formatCaCert);
                TrustManagerFactory tmf = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm());
                tmf.init(trustStore);
                trustManagers = tmf.getTrustManagers();
            }

            // 创建SSLContext
            SSLContext sslContext = SSLContext.getInstance(mqttProtocol.getTlsVersion());
            sslContext.init(null, trustManagers, null);

            return sslContext.getSocketFactory();
        } catch (Exception e) {
            throw new RuntimeException("SSL初始化失败: " + e.getMessage(), e);
        }
    }

    // 新增方法: 创建信任所有证书的TrustManager
    private static TrustManager[] createInsecureTrustManager() {
        return new TrustManager[] {
                new X509TrustManager() {
                    public void checkClientTrusted(X509Certificate[] chain, String authType) {}
                    public void checkServerTrusted(X509Certificate[] chain, String authType) {}
                    public X509Certificate[] getAcceptedIssuers() { return new X509Certificate[0]; }
                }
        };
    }

    // 创建信任库方法保持原样
    private static KeyStore createMergedTrustStore(String caCertPem) throws Exception {
        KeyStore mergedKs = KeyStore.getInstance(KeyStore.getDefaultType());
        mergedKs.load(null, null);

        // 添加系统CA证书
        TrustManagerFactory systemTmf = TrustManagerFactory.getInstance(TrustManagerFactory.getDefaultAlgorithm());
        systemTmf.init((KeyStore) null);
        X509TrustManager systemTm = (X509TrustManager) systemTmf.getTrustManagers()[0];

        int systemIndex = 1;
        for (X509Certificate cert : systemTm.getAcceptedIssuers()) {
            mergedKs.setCertificateEntry("system-ca-" + systemIndex++, cert);
        }

        // 添加用户CA证书
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
