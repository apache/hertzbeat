package com.usthe.collector.collect.snmp;

import com.usthe.collector.collect.AbstractCollect;
import com.usthe.collector.util.CollectorConstants;
import com.usthe.common.entity.job.Metrics;
import com.usthe.common.entity.job.protocol.SnmpProtocol;
import com.usthe.common.entity.message.CollectRep;
import com.usthe.common.util.CommonConstants;
import lombok.extern.slf4j.Slf4j;
import org.snmp4j.CommunityTarget;
import org.snmp4j.PDU;
import org.snmp4j.Snmp;
import org.snmp4j.TransportMapping;
import org.snmp4j.event.ResponseEvent;
import org.snmp4j.mp.SnmpConstants;
import org.snmp4j.smi.Address;
import org.snmp4j.smi.GenericAddress;
import org.snmp4j.smi.OID;
import org.snmp4j.smi.OctetString;
import org.snmp4j.smi.UdpAddress;
import org.snmp4j.smi.VariableBinding;
import org.snmp4j.transport.DefaultUdpTransportMapping;
import org.springframework.util.Assert;

import java.io.IOException;

/**
 * @author wangtao
 * @date 2022/6/3
 */
@Slf4j
public class SnmpCollectImpl extends AbstractCollect {

    private SnmpCollectImpl() {

    }

    public static SnmpCollectImpl getInstance() {
        return SnmpCollectImpl.Singleton.INSTANCE;
    }

    public final static String SYS_DESC = "1.3.6.1.2.1.1.1";
    /**
     * 获取机器名
     */
    public final static String SYS_NAME = "1.3.6.1.2.1.1.5";
    /**
     * 监控时间
     */
    public final static String SYS_UPTIME = "1.3.6.1.2.1.1.3";

    @Override
    public void collect(CollectRep.MetricsData.Builder builder,
                        long appId, String app, Metrics metrics) {
        long startTime = System.currentTimeMillis();
        try {
            preCheck(metrics);
        } catch (Exception e) {
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg(e.getMessage());
            return;
        }
        SnmpProtocol snmp = metrics.getSnmp();
        String variableString = "";
        TransportMapping<UdpAddress> transport = null;
        int timeout = 6000;
        try {
            timeout = Integer.parseInt(snmp.getTimeout());
        } catch (Exception e) {
            log.warn(e.getMessage());
        }
        try{
            CommunityTarget myTarget = new CommunityTarget();
            Address address = GenericAddress.parse("udp:"+snmp.getHost()+"/"+
                    snmp.getPort());
            myTarget.setAddress(address);
            myTarget.setCommunity(new OctetString(snmp.getCommunity()));
            //设置超时重试次数
            myTarget.setRetries(2);
            myTarget.setTimeout(timeout);
            myTarget.setVersion(Integer.parseInt(snmp.getSnmpVersion()));
            transport = new DefaultUdpTransportMapping();
            transport.listen();
            Snmp protocol = new Snmp(transport);
            PDU request = new PDU();
            request.add(new VariableBinding(new OID(SYS_NAME)));
            request.setType(PDU.GETNEXT);
            ResponseEvent responseEvent = protocol.send(request, myTarget);
            PDU response=responseEvent.getResponse();
            if(response != null){
                VariableBinding vb = response.get(0);
                variableString = String.valueOf(vb.getVariable());
                log.info(variableString);
            }
            long responseTime = System.currentTimeMillis() - startTime;
            if (transport.isListening()) {
                CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
                for (String alias : metrics.getAliasFields()) {
                    if (CollectorConstants.RESPONSE_TIME.equalsIgnoreCase(alias)) {
                        valueRowBuilder.addColumns(Long.toString(responseTime));
                    } else {
                        valueRowBuilder.addColumns(CommonConstants.NULL_VALUE);
                    }
                }
                builder.addValues(valueRowBuilder.build());
            } else {
                builder.setCode(CollectRep.Code.UN_CONNECTABLE);
                builder.setMsg("对端连接失败，Timeout " + timeout + "ms");
                return;
            }
        }catch(IOException e){
            log.warn("[snmp collect] error: {}", e.getMessage(), e);
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg(e.getMessage());
        }finally {
            if (transport != null){
                try {
                    transport.close();
                } catch (IOException e) {
                    log.warn("close transport error: {}", e.getMessage(), e);
                }
            }
        }

    }


    private void preCheck(Metrics metrics) {
        if (metrics == null || metrics.getSnmp() == null) {
            throw new IllegalArgumentException("Snmp collect must has snmp params");
        }
        SnmpProtocol snmpProtocol = metrics.getSnmp();
        Assert.hasText(snmpProtocol.getHost(), "snmp Protocol host is required.");
        Assert.hasText(snmpProtocol.getPort(), "snmp Protocol port is required.");
        Assert.hasText(snmpProtocol.getSnmpVersion(), "snmp version  is required.");
    }


    private static class Singleton {
        private static final SnmpCollectImpl INSTANCE = new SnmpCollectImpl();
    }
}
