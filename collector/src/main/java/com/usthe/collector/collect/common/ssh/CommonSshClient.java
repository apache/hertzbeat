package com.usthe.collector.collect.common.ssh;

import lombok.extern.slf4j.Slf4j;
import org.apache.sshd.client.SshClient;
import org.apache.sshd.client.keyverifier.AcceptAllServerKeyVerifier;
import org.apache.sshd.common.PropertyResolverUtils;
import org.apache.sshd.core.CoreModuleProperties;

/**
 * ssh公共client
 * @author tom
 * @date 2022/3/11 15:58
 */
@Slf4j
public class CommonSshClient {

    private static SshClient sshClient;


    static {
        sshClient = SshClient.setUpDefaultClient();
        // 接受所有服务端公钥校验，会打印warn日志 Server at {} presented unverified {} key: {}
        AcceptAllServerKeyVerifier verifier = AcceptAllServerKeyVerifier.INSTANCE;
        sshClient.setServerKeyVerifier(verifier);
        // 设置链接保活心跳10000毫秒一次, 客户端等待保活心跳超时响应时间3000毫秒
        PropertyResolverUtils.updateProperty(
                sshClient, CoreModuleProperties.HEARTBEAT_INTERVAL.getName(), 10000);
        PropertyResolverUtils.updateProperty(
                sshClient, CoreModuleProperties.HEARTBEAT_REPLY_WAIT.getName(), 3000);
        sshClient.start();
    }

    public static SshClient getSshClient() {
        return sshClient;
    }
}
