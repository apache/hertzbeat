package org.apache.hertzbeat.manager.service;


import org.springframework.http.codec.ServerSentEvent;
import reactor.core.publisher.Flux;


/**
 * AI Service
 */
public interface AIService {

    /**
     * get AI type
     * @return
     */
    String getType();

    /**
     * ai response
     *
     * @param param
     * @return
     */
    Flux<ServerSentEvent<String>> requestAI(String param);

}
