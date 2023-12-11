package org.dromara.hertzbeat.collector.collect.dns;


import org.dromara.hertzbeat.common.entity.job.Metrics;
import org.dromara.hertzbeat.common.entity.job.protocol.DnsProtocol;
import org.dromara.hertzbeat.common.entity.message.CollectRep;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;


/**
 * Test case for {@link DnsCollectImpl}
 * @author Calvin
 */
public class DnsCollectImplTest {
    private DnsProtocol dnsProtocol;
    private DnsCollectImpl dnsCollect;

    @BeforeEach
    public void setup() {
        dnsCollect = new DnsCollectImpl();
        dnsProtocol = DnsProtocol.builder()
                .dnsServerIP("8.8.8.8")
                .address("www.google.com")
                .build();
    }

    @Test
    public void testCollect() {
        CollectRep.MetricsData.Builder builder = CollectRep.MetricsData.newBuilder();
        long monitorId = 666;
        String app = "testDNS";
        Metrics metrics = new Metrics();
        metrics.setDns(dnsProtocol);

        dnsCollect.collect(builder, monitorId, app, metrics);
    }
}
