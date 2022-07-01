package com.usthe.common.config;

import com.usthe.common.util.AesUtil;
import org.springframework.context.annotation.Configuration;

/**
 *
 *
 */
@Configuration
public class CommonConfig {

    public CommonConfig(CommonProperties commonProperties) {
        if (commonProperties != null && commonProperties.getSecretKey() != null) {
            AesUtil.setDefaultSecretKey(commonProperties.getSecretKey());
        }
    }
}
