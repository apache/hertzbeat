package org.dromara.hertzbeat.push.service;

import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;

/**
 * push gateway metrics
 *
 * @author vinci
 */

@Service
public interface PushGatewayService {

    boolean pushMetricsData(InputStream inputStream) throws IOException;

}
