package com.usthe.common.config;

import com.usthe.common.util.AesUtil;
import org.springframework.context.annotation.Configuration;

/**
 * @author tom
 * @date 2022/6/30 09:23
 */
@Configuration
public class CommonConfig {

    public CommonConfig(CommonProperties commonProperties) {
        if (commonProperties != null && commonProperties.getSecretKey() != null) {
            AesUtil.setDefaultSecretKey(commonProperties.getSecretKey());
        }
    }
}
