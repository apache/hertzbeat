package com.usthe.collector.util;

import org.apache.commons.codec.binary.Base64;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.PublicKey;
import java.security.SecureRandom;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Test case for {@link KeyPairUtil}
 */
class KeyPairUtilTest {

    @BeforeEach
    void setUp() {
    }

    @Test
    void getKeyPairFromPublicKey() {
        // test null key
        KeyPair nullKey = KeyPairUtil.getKeyPairFromPublicKey(null);
        assertNull(nullKey);
        // test empty key
        KeyPair emptyKey = KeyPairUtil.getKeyPairFromPublicKey("");
        assertNull(emptyKey);
        // test illegal key: DSA
        String dsaPublicKey = new String(Base64.encodeBase64(genPublicKey("DSA").getEncoded()));
        KeyPair illegalKey = KeyPairUtil.getKeyPairFromPublicKey(dsaPublicKey);
        assertNull(illegalKey);
        // test illegal key: DiffieHellman
        String diffieHellmanPublicKey = new String(Base64.encodeBase64(genPublicKey("DiffieHellman").getEncoded()));
        illegalKey = KeyPairUtil.getKeyPairFromPublicKey(diffieHellmanPublicKey);
        assertNull(illegalKey);
        // test not encrypted
        byte[] rsaBytes = genPublicKey("RSA").getEncoded();
        String rawRsaPublicKey = new String(rsaBytes);
        KeyPair raw = KeyPairUtil.getKeyPairFromPublicKey(rawRsaPublicKey);
        assertNull(raw);
        // test normal case
        // base64 encrypted
        String rsaPublicKey = new String(Base64.encodeBase64(rsaBytes));
        KeyPair normal = KeyPairUtil.getKeyPairFromPublicKey(rsaPublicKey);
        assertNotNull(normal);
        assertNotNull(normal.getPublic());
    }


    private PublicKey genPublicKey(String key) {
        KeyPairGenerator keyPairGen = null;
        try {
            keyPairGen = KeyPairGenerator.getInstance(key);
        } catch (Exception e) {
            // nothing to do
            // this case shouldn't happen
            throw new RuntimeException(e);
        }
        // init
        keyPairGen.initialize(1024, new SecureRandom());
        // generate key
        KeyPair keyPair = keyPairGen.generateKeyPair();
        // get public key
        return keyPair.getPublic();
    }

}