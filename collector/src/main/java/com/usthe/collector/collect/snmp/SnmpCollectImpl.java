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
import com.usthe.collector.collect.common.cache.CacheIdentifier;
import com.usthe.collector.collect.common.cache.CommonCache;
import com.usthe.collector.collect.common.ssh.CommonSshClient;
import com.usthe.collector.util.CollectUtil;
import com.usthe.collector.util.CollectorConstants;
import com.usthe.collector.util.KeyPairUtil;
import com.usthe.common.entity.job.Metrics;
import com.usthe.common.entity.job.protocol.SnmpProtocol;
import com.usthe.common.entity.job.protocol.SshProtocol;
import com.usthe.common.entity.message.CollectRep;
import com.usthe.common.util.CommonConstants;
import lombok.extern.slf4j.Slf4j;
import org.apache.sshd.client.SshClient;
import org.apache.sshd.client.channel.ClientChannel;
import org.apache.sshd.client.channel.ClientChannelEvent;
import org.apache.sshd.client.session.ClientSession;
import org.snmp4j.*;
import org.snmp4j.fluent.SnmpBuilder;
import org.snmp4j.fluent.SnmpCompletableFuture;
import org.snmp4j.fluent.TargetBuilder;
import org.snmp4j.mp.SnmpConstants;
import org.snmp4j.security.SecurityLevel;
import org.snmp4j.security.SecurityModel;
import org.snmp4j.smi.Address;
import org.snmp4j.smi.GenericAddress;
import org.snmp4j.smi.OctetString;
import org.snmp4j.smi.VariableBinding;
import org.springframework.util.StringUtils;
import java.net.ConnectException;
import java.security.KeyPair;
import java.util.*;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;

/**
 * Snmp protocol collection implementation
 * snmp 协议采集实现
 * @author wangtao
 * @date 2022/6/3
 */
@Slf4j
public class SnmpCollectImpl extends AbstractCollect {

    private static final String DEFAULT_PROTOCOL = "udp";

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
    public void collect(CollectRep.MetricsData.Builder builder, long appId, String app, Metrics metrics) {
        long startTime = System.currentTimeMillis();
        // 校验参数
        try {
            validateParams(metrics);
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
            myTarget.setVersion(snmp.getVersion());
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

    private Target createTarget(SnmpProtocol snmpProtocol, int timeout) {
        Target target = null;
        String address = "udp:" + snmpProtocol.getHost() + "/" + snmpProtocol.getPort();
        Address targetAddress = GenericAddress.parse(address);
        if (snmpProtocol.getVersion() == SnmpConstants.version3) {
            target = new UserTarget();
            //snmpV3需要设置安全级别和安全名称，其中安全名称是创建snmp指定user设置的new OctetString("SNMPV3")
            target.setSecurityLevel(SecurityLevel.AUTH_PRIV);
            target.setSecurityName(new OctetString(snmpProtocol.getUsername()));
        } else {
            target = new CommunityTarget();
            //snmpV1和snmpV2需要指定团体名名称
            target.setSecurityName(new OctetString(snmpProtocol.getCommunity()));
            if (snmpProtocol.getVersion() == SnmpConstants.version2c) {
                target.setSecurityModel(SecurityModel.SECURITY_MODEL_SNMPv2c);
            }
        }
        target.setVersion(snmpProtocol.getVersion());
        target.setAddress(targetAddress);
        target.setRetries(1);
        target.setTimeout(timeout);
        return target;
    }

    private ClientSession getConnectSession(SshProtocol sshProtocol, int timeout) throws IOException {
        CacheIdentifier identifier = CacheIdentifier.builder()
                .ip(sshProtocol.getHost()).port(sshProtocol.getPort())
                .username(sshProtocol.getUsername()).password(sshProtocol.getPassword())
                .build();
        Optional<Object> cacheOption = CommonCache.getInstance().getCache(identifier, true);
        ClientSession clientSession = null;
        if (cacheOption.isPresent()) {
            clientSession = (ClientSession) cacheOption.get();
            try {
                if (clientSession.isClosed() || clientSession.isClosing()) {
                    clientSession = null;
                    CommonCache.getInstance().removeCache(identifier);
                }
            } catch (Exception e) {
                log.warn(e.getMessage());
                clientSession = null;
                CommonCache.getInstance().removeCache(identifier);
            }
        }
        if (clientSession != null) {
            return clientSession;
        }
        SshClient sshClient = CommonSshClient.getSshClient();
        clientSession = sshClient.connect(sshProtocol.getUsername(), sshProtocol.getHost(), Integer.parseInt(sshProtocol.getPort()))
                .verify(timeout, TimeUnit.MILLISECONDS).getSession();
        if (StringUtils.hasText(sshProtocol.getPassword())) {
            clientSession.addPasswordIdentity(sshProtocol.getPassword());
        } else if (StringUtils.hasText(sshProtocol.getPublicKey())) {
            KeyPair keyPair = KeyPairUtil.getKeyPairFromPublicKey(sshProtocol.getPublicKey());
            if (keyPair != null) {
                clientSession.addPublicKeyIdentity(keyPair);
            }
        } else {
            throw new IllegalArgumentException("需填写账户登陆密码或公钥");
        }
        // 进行认证
        if (!clientSession.auth().verify(timeout, TimeUnit.MILLISECONDS).isSuccess()) {
            throw new IllegalArgumentException("认证失败");
        }
        CommonCache.getInstance().addCache(identifier, clientSession);
        return clientSession;
    }

    private void validateParams(Metrics metrics) throws Exception {
        if (metrics == null || metrics.getSnmp() == null) {
            throw new IllegalArgumentException("Snmp collect must has snmp params");
        }
        SnmpProtocol snmpProtocol = metrics.getSnmp();
        Assert.hasText(snmpProtocol.getHost(), "snmp Protocol host is required.");
        Assert.hasText(snmpProtocol.getPort(), "snmp Protocol port is required.");
        Assert.notNull(snmpProtocol.getVersion(), "snmp version  is required.");
    }

    private static class Singleton {
        private static final SnmpCollectImpl INSTANCE = new SnmpCollectImpl();
    }
}
