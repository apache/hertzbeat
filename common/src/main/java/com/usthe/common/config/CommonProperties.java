package com.usthe.common.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * common properties
 *
 *
 *
 */
@Component
@ConfigurationProperties(prefix = "common")
public class CommonProperties {

    /**
     * secret key for password aes entry, must 16 bits
     */
    private String secretKey;

    public String getSecretKey() {
        return secretKey;
    }

    public void setSecretKey(String secretKey) {
        this.secretKey = secretKey;
    }
}
