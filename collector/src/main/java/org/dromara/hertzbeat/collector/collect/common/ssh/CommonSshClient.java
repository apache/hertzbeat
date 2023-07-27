package org.dromara.hertzbeat.collector.collect.common.ssh;

import lombok.extern.slf4j.Slf4j;
import org.apache.sshd.client.SshClient;
import org.apache.sshd.client.keyverifier.AcceptAllServerKeyVerifier;
import org.apache.sshd.common.PropertyResolverUtils;
import org.apache.sshd.core.CoreModuleProperties;

/**
 * ssh公共client
 * @author tom
 *
 */
@Slf4j
public class CommonSshClient {

    private static final SshClient SSH_CLIENT;


    static {
        SSH_CLIENT = SshClient.setUpDefaultClient();
        // 接受所有服务端公钥校验，会打印warn日志 Server at {} presented unverified {} key: {}
        AcceptAllServerKeyVerifier verifier = AcceptAllServerKeyVerifier.INSTANCE;
        SSH_CLIENT.setServerKeyVerifier(verifier);
        // 设置链接保活心跳2000毫秒一次, 客户端等待保活心跳响应超时时间300_000毫秒
        PropertyResolverUtils.updateProperty(
                SSH_CLIENT, CoreModuleProperties.HEARTBEAT_INTERVAL.getName(), 2000);
        PropertyResolverUtils.updateProperty(
                SSH_CLIENT, CoreModuleProperties.HEARTBEAT_REPLY_WAIT.getName(), 300_000);
        PropertyResolverUtils.updateProperty(
                SSH_CLIENT, CoreModuleProperties.SOCKET_KEEPALIVE.getName(), true);
        SSH_CLIENT.start();
    }

    public static SshClient getSshClient() {
        return SSH_CLIENT;
    }
}
