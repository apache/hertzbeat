package org.dromara.hertzbeat.collector.collect.dns;

import com.google.common.collect.Lists;
import com.google.common.collect.Maps;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.commons.lang3.StringUtils;
import org.dromara.hertzbeat.collector.collect.AbstractCollect;
import org.dromara.hertzbeat.collector.dispatch.DispatchConstants;
import org.dromara.hertzbeat.common.constants.CommonConstants;
import org.dromara.hertzbeat.common.entity.job.Metrics;
import org.dromara.hertzbeat.common.entity.job.protocol.DnsProtocol;
import org.dromara.hertzbeat.common.entity.message.CollectRep;
import org.dromara.hertzbeat.common.util.CommonUtil;
import org.springframework.util.StopWatch;
import org.xbill.DNS.DClass;
import org.xbill.DNS.Message;
import org.xbill.DNS.Name;
import org.xbill.DNS.Opcode;
import org.xbill.DNS.RRset;
import org.xbill.DNS.Rcode;
import org.xbill.DNS.Record;
import org.xbill.DNS.Resolver;
import org.xbill.DNS.Section;
import org.xbill.DNS.SimpleResolver;
import org.xbill.DNS.Type;

import java.io.IOException;
import java.time.Duration;
import java.time.temporal.ChronoUnit;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * dns protocol collection implementation
 * @author Calvin
 */
@Slf4j
public class DnsCollectImpl extends AbstractCollect {
    /*
     each part of dig command output
     */
    private static final String HEADER = "header";
    private static final String QUESTION = "question";
    private static final String ANSWER = "answer";
    private static final String AUTHORITY = "authority";
    private static final String ADDITIONAL = "additional";
    /*
     * used for header key
     * example:
     * ;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 3221
     * ;; flags: qr rd ra ; qd: 1 an: 1 au: 0 ad: 0
     *
     *
     * opcode -> opcode
     * status -> status
     * flags -> flags
     * qd -> questionRowCount
     * an -> answerRowCount
     * au -> authorityRowCount
     * ad -> additionalRowCount
     */
    private static final String RESPONSE_TIME = "responseTime";
    private static final String OP_CODE = "opcode";
    private static final String STATUS = "status";
    private static final String FLAGS = "flags";
    private static final String QUESTION_ROW_COUNT = "questionRowCount";
    private static final String ANSWER_ROW_COUNT = "answerRowCount";
    private static final String AUTHORITY_ROW_COUNT = "authorityRowCount";
    private static final String ADDITIONAL_ROW_COUNT = "additionalRowCount";


    @Override
    public void collect(CollectRep.MetricsData.Builder builder, long monitorId, String app, Metrics metrics) {
        // check params
        if (checkDnsProtocolFailed(metrics.getDns())) {
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg("DNS collect must have a valid DNS protocol param! ");
            return;
        }

        DNSResolveResult dnsResolveResult;
        try {
            // run dig command
            dnsResolveResult = dig(metrics.getDns());
        } catch (IOException e) {
            log.info(CommonUtil.getMessageFromThrowable(e));
            builder.setCode(CollectRep.Code.UN_CONNECTABLE);
            builder.setMsg(e.getMessage());
            return;
        } catch (Exception e) {
            String errorMsg = CommonUtil.getMessageFromThrowable(e);
            log.warn("[dns collect] error: {}", e.getMessage(), e);
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg(errorMsg);
            return;
        }

        // build dns metrics data
        CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
        if (StringUtils.equals(HEADER, metrics.getName())) {
            // add header columns
            Map<String, String> headerInfo = dnsResolveResult.getHeaderInfo();
            metrics.getAliasFields().forEach(field -> valueRowBuilder.addColumns(headerInfo.getOrDefault(field, CommonConstants.NULL_VALUE)));
        }else {
            // add question/answer/authority/additional columns
            List<String> currentMetricsResolveResultList = dnsResolveResult.getList(metrics.getName());
            for (int index = 0; index < metrics.getAliasFields().size(); index++) {
                valueRowBuilder.addColumns(index >= currentMetricsResolveResultList.size()
                        ? CommonConstants.NULL_VALUE
                        : currentMetricsResolveResultList.get(index));
            }
        }

        builder.addValues(valueRowBuilder.build());
    }

    @Override
    public String supportProtocol() {
        return DispatchConstants.PROTOCOL_DNS;
    }

    private boolean checkDnsProtocolFailed(DnsProtocol dnsProtocol) {
        return Objects.isNull(dnsProtocol) || dnsProtocol.isInvalid();
    }

    /**
     * run dig command
     */
    private DNSResolveResult dig(DnsProtocol dns) throws IOException {
        StopWatch responseTimeStopWatch = new StopWatch("responseTime");
        responseTimeStopWatch.start();

        Name name = Name.fromString(dns.getAddress(), Name.root);
        Message query = Message.newQuery(Record.newRecord(name, Type.ANY, DClass.ANY));
        Resolver res = new SimpleResolver(dns.getDnsServerIP());
        res.setTimeout(Duration.of(Long.parseLong(dns.getTimeout()), ChronoUnit.MILLIS));
        res.setTCP(Boolean.parseBoolean(dns.getTcp()));
        res.setPort(Integer.parseInt(dns.getPort()));

        Message response = res.send(query);
        responseTimeStopWatch.stop();
        return resolve(response, responseTimeStopWatch.getLastTaskTimeMillis());
    }

    private DNSResolveResult resolve(Message message, Long responseTime) {
        return DNSResolveResult.builder()
                .headerInfo(getHeaderInfo(message, responseTime))
                .questionList(getSectionInfo(message, Section.QUESTION))
                .answerList(getSectionInfo(message, Section.ANSWER))
                .authorityList(getSectionInfo(message, Section.AUTHORITY))
                .additionalList(getSectionInfo(message, Section.ADDITIONAL))
                .build();
    }

    private Map<String, String> getHeaderInfo(Message message, Long responseTime) {
        Map<String, String> resultMap = Maps.newHashMap();
        resultMap.put(RESPONSE_TIME, String.valueOf(responseTime));
        resultMap.put(OP_CODE, Opcode.string(message.getHeader().getOpcode()));
        resultMap.put(STATUS, Rcode.string(message.getHeader().getRcode()));
        resultMap.put(FLAGS, message.getHeader().printFlags());
        resultMap.put(QUESTION_ROW_COUNT, String.valueOf(message.getHeader().getCount(Section.QUESTION)));
        resultMap.put(ANSWER_ROW_COUNT, String.valueOf(message.getHeader().getCount(Section.ANSWER)));
        resultMap.put(AUTHORITY_ROW_COUNT, String.valueOf(message.getHeader().getCount(Section.AUTHORITY)));
        resultMap.put(ADDITIONAL_ROW_COUNT, String.valueOf(message.getHeader().getCount(Section.ADDITIONAL)));

        return resultMap;
    }

    private List<String> getSectionInfo(Message message, int section) {
        List<RRset> currentRRsetList = message.getSectionRRsets(section);
        if (currentRRsetList == null || currentRRsetList.size() <= 0) {
            return Lists.newArrayList();
        }

        List<String> infoList = Lists.newArrayListWithCapacity(currentRRsetList.size());
        currentRRsetList.forEach(res -> infoList.add(res.toString()));

        return infoList;
    }


    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    private static class DNSResolveResult {
        private Map<String, String> headerInfo;
        /** example: www.google.com.		140	IN	A	192.133.77.133 **/
        private List<String> questionList;
        private List<String> answerList;
        private List<String> authorityList;
        private List<String> additionalList;

        public List<String> getList(String metricsName) {
            switch (metricsName) {
                case QUESTION: return questionList;
                case ANSWER: return answerList;
                case AUTHORITY: return authorityList;
                case ADDITIONAL: return additionalList;
                default: return Collections.emptyList();
            }
        }
    }
}
