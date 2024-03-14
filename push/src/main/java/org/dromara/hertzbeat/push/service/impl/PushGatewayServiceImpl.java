package org.dromara.hertzbeat.push.service.impl;

import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.common.util.prometheus.Metric;
import org.dromara.hertzbeat.common.util.prometheus.PrometheusUtil;
import org.dromara.hertzbeat.push.service.PushGatewayService;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.io.InputStream;
import java.util.List;

/**
 * push gateway service impl
 *
 *
 */

@Slf4j
@Service
public class PushGatewayServiceImpl implements PushGatewayService {

    @Override
    public boolean pushMetricsData(InputStream inputStream) throws IOException {
        List<Metric> metrics = PrometheusUtil.parseMetrics(inputStream);
        return metrics != null;
    }
}
