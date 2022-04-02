package com.usthe.collector.util;

import lombok.extern.slf4j.Slf4j;
import sun.misc.BASE64Decoder;

import java.security.KeyFactory;
import java.security.KeyPair;
import java.security.PublicKey;
import java.security.spec.X509EncodedKeySpec;

/**
 * 密钥工具类
 * @author tom
 * @date 2022/4/2 17:04
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
            byte[] publicKeyBytes = (new BASE64Decoder()).decodeBuffer(publicKeyStr);
            X509EncodedKeySpec keySpec = new X509EncodedKeySpec(publicKeyBytes);
            PublicKey publicKey = keyFactory.generatePublic(keySpec);
            return new KeyPair(publicKey, null);
        } catch (Exception e) {
            log.info("[keyPair] parse failed, {}." + e.getMessage());
            return null;
        }
    }

}
