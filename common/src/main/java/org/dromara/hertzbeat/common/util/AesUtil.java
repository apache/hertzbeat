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

package org.dromara.hertzbeat.common.util;

import lombok.extern.slf4j.Slf4j;

import javax.crypto.Cipher;
import javax.crypto.IllegalBlockSizeException;
import javax.crypto.spec.IvParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.NoSuchAlgorithmException;
import java.util.Base64;

/**
 * AES Util
 * @author tomsun28
 */
@Slf4j
public class AesUtil {

    /**
     *  默认加密秘钥 AES加密秘钥为约定16位，大于小于16位会报错
     */
    private static final String ENCODE_RULES = "tomSun28HaHaHaHa";

    /**
     *  默认算法
     */
    private static final String ALGORITHM_STR = "AES/CBC/PKCS5Padding";

    /**
     * 加密秘钥 AES加密秘钥为约定16位，大于小于16位会报错
     */
    private static String secretKey = ENCODE_RULES;

    private AesUtil() {}

    public static void setDefaultSecretKey(String secretKeyNow) {
        secretKey = secretKeyNow;
    }

    public static String aesEncode(String content) {
        return aesEncode(content, secretKey);
    }

    public static String aesDecode(String content) {
        return aesDecode(content, secretKey);
    }

    public static boolean isCiphertext(String text) {
        return isCiphertext(text, secretKey);
    }

    /**
     * 加密明文 aes cbc模式
     *
     * @param content 明文
     * @param encryptKey 密钥
     * @return 密文
     */
    public static String aesEncode(String content, String encryptKey) {
        try {
            SecretKeySpec keySpec = new SecretKeySpec(encryptKey.getBytes(StandardCharsets.UTF_8), "AES");
            //根据指定算法AES自成密码器
            Cipher cipher = Cipher.getInstance(ALGORITHM_STR);
            //初始化密码器，第一个参数为加密(Encrypt_mode)或者解密解密(Decrypt_mode)操作，第二个参数为使用的KEY
            cipher.init(Cipher.ENCRYPT_MODE, keySpec, new IvParameterSpec(encryptKey.getBytes(StandardCharsets.UTF_8)));
            //获取加密内容的字节数组(这里要设置为utf-8)不然内容中如果有中文和英文混合中文就会解密为乱码
            byte[] byteEncode = content.getBytes(StandardCharsets.UTF_8);
            //根据密码器的初始化方式--加密：将数据加密
            byte[] byteAes = cipher.doFinal(byteEncode);
            //将加密后的byte[]数据转换为Base64字符串
            return new String(Base64.getEncoder().encode(byteAes), StandardCharsets.UTF_8);
        } catch (Exception e) {
            log.error("密文加密失败: {}", e.getMessage(), e);
            return content;
        }
    }

    /**
     * 解密密文
     *
     * @param content 密文
     * @param decryptKey 密钥
     * @return 明文
     */
    public static String aesDecode(String content, String decryptKey) {
        try {
            SecretKeySpec keySpec = new SecretKeySpec(decryptKey.getBytes(StandardCharsets.UTF_8), "AES");

            //根据指定算法AES自成密码器
            Cipher cipher = Cipher.getInstance(ALGORITHM_STR);
            //初始化密码器，第一个参数为加密(Encrypt_mode)或者解密(Decrypt_mode)操作，第二个参数为使用的KEY
            cipher.init(Cipher.DECRYPT_MODE, keySpec, new IvParameterSpec(decryptKey.getBytes(StandardCharsets.UTF_8)));
            //8.将加密并编码base64后的字符串内容base64解码成字节数组
            byte[] bytesContent = Base64.getDecoder().decode(content);
            byte[] byteDecode = cipher.doFinal(bytesContent);
            return new String(byteDecode, StandardCharsets.UTF_8);
        } catch (NoSuchAlgorithmException e) {
            log.error("没有指定的加密算法::{}", e.getMessage(), e);
        } catch (IllegalBlockSizeException e) {
            log.error("非法的块大小::{}", e.getMessage(), e);
        } catch (NullPointerException e) {
            log.error("秘钥解析空指针异常::{}", e.getMessage(), e);
        } catch (Exception e) {
            log.error("秘钥AES解析出现未知错误::{}", e.getMessage(), e);
        }
        return content;
    }

    /**
     * 判断是否已经被加密
     * @param text text
     * @return true-是 false-否
     */
    public static boolean isCiphertext(String text, String decryptKey) {
        // 先用是否被base64来判断是否已经被加密
        if (Base64Util.isBase64(text)) {
            // 若是base64 直接解密判断
            try {
                SecretKeySpec keySpec = new SecretKeySpec(decryptKey.getBytes(StandardCharsets.UTF_8), "AES");
                Cipher cipher = Cipher.getInstance(ALGORITHM_STR);
                cipher.init(Cipher.DECRYPT_MODE, keySpec, new IvParameterSpec(decryptKey.getBytes(StandardCharsets.UTF_8)));
                byte[] bytesContent = Base64.getDecoder().decode(text);
                byte[] byteDecode = cipher.doFinal(bytesContent);
                return byteDecode != null;
            } catch (Exception e) {
                return false;
            }
        }
        return false;
    }
}
