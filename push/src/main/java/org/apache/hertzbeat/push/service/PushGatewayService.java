package org.apache.hertzbeat.push.service;

import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;

/**
 * push gateway metrics
 */

@Service
public interface PushGatewayService {

    boolean pushMetricsData(InputStream inputStream) throws IOException;

}
