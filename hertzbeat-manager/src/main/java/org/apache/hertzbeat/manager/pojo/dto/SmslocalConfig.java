package org.apache.hertzbeat.manager.pojo.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;


/**
 * Smslocal SMS configuration
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SmslocalConfig {
    /**
     * Smslocal api key
     */
    private String apiKey;
}
