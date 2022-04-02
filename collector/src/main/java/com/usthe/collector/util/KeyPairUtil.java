package com.usthe.collector.util;

import lombok.extern.slf4j.Slf4j;

import java.security.KeyFactory;
import java.security.KeyPair;
import java.security.PublicKey;
import java.security.spec.X509EncodedKeySpec;
import java.util.Base64;

/**
 * 密钥工具类
 *
 *
 */
@Slf4j
public class KeyPairUtil {

    private static KeyFactory keyFactory;

    static {
        try {
            keyFactory = KeyFactory.getInstance("RSA");
        } catch (Exception e) {
            log.error(e.getMessage(), e);
        }
    }

    /**
     * 获取密钥对
     */
    public static KeyPair getKeyPairFromPublicKey(String publicKeyStr) {
        try {
            if (publicKeyStr == null || "".equals(publicKeyStr)) {
                return null;
            }
            // todo fix 公钥解析
            byte[] publicKeyBytes = Base64.getDecoder().decode(publicKeyStr);
            X509EncodedKeySpec keySpec = new X509EncodedKeySpec(publicKeyBytes);
            PublicKey publicKey = keyFactory.generatePublic(keySpec);
            return new KeyPair(publicKey, null);
        } catch (Exception e) {
            log.info("[keyPair] parse failed, {}." + e.getMessage());
            return null;
        }
    }

}
