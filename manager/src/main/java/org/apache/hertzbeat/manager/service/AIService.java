package org.apache.hertzbeat.manager.service;

import org.apache.hertzbeat.manager.pojo.dto.AIResponse;

import java.util.Map;

/**
 * AI Service
 */
public interface AIService {

    /**
     * get AI type
     * @return
     */
    int getType();

    /**
     * ai response
     * @param param
     * @return
     */
    AIResponse aiResponse(String param);

}
