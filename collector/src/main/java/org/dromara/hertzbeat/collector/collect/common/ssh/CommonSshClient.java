package org.dromara.hertzbeat.collector.collect.common.ssh;

import lombok.extern.slf4j.Slf4j;
import org.apache.sshd.client.ClientBuilder;
import org.apache.sshd.client.SshClient;
import org.apache.sshd.client.keyverifier.AcceptAllServerKeyVerifier;
import org.apache.sshd.common.NamedFactory;
import org.apache.sshd.common.PropertyResolverUtils;
import org.apache.sshd.common.kex.BuiltinDHFactories;
import org.apache.sshd.common.signature.BuiltinSignatures;
import org.apache.sshd.core.CoreModuleProperties;

import java.util.ArrayList;

/**
 * common ssh pool client
 * @author tom
 */
@Slf4j
public class CommonSshClient {

    private static final SshClient SSH_CLIENT;
    
    static {
        SSH_CLIENT = SshClient.setUpDefaultClient();
        // accept all server key verifier, will print warn log : Server at {} presented unverified {} key: {}
        AcceptAllServerKeyVerifier verifier = AcceptAllServerKeyVerifier.INSTANCE;
        SSH_CLIENT.setServerKeyVerifier(verifier);
        // set connection heartbeat interval time 2000ms, wait for heartbeat response timeout 300_000ms
        PropertyResolverUtils.updateProperty(
                SSH_CLIENT, CoreModuleProperties.HEARTBEAT_INTERVAL.getName(), 2000);
        PropertyResolverUtils.updateProperty(
                SSH_CLIENT, CoreModuleProperties.HEARTBEAT_REPLY_WAIT.getName(), 300_000);
        PropertyResolverUtils.updateProperty(
                SSH_CLIENT, CoreModuleProperties.SOCKET_KEEPALIVE.getName(), true);
        // set support all KeyExchange
        SSH_CLIENT.setKeyExchangeFactories(NamedFactory.setUpTransformedFactories(
                false,
                BuiltinDHFactories.VALUES,
                ClientBuilder.DH2KEX
        ));
        // todo when connect AlibabaCloud ubuntu server, custom signature factories will cause error, why?
        // SSH_CLIENT.setSignatureFactories(new ArrayList<>(BuiltinSignatures.VALUES));
        SSH_CLIENT.start();
    }

    public static SshClient getSshClient() {
        return SSH_CLIENT;
    }
}
