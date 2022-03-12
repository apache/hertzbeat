package com.usthe.collector.collect.common.ssh;

import lombok.extern.slf4j.Slf4j;
import org.apache.sshd.client.SshClient;

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
        sshClient.start();
    }

    public static SshClient getSshClient() {
        return sshClient;
    }
}
