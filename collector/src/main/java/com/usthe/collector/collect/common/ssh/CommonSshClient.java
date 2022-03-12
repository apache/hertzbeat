package com.usthe.collector.collect.common.ssh;

import lombok.extern.slf4j.Slf4j;
import org.apache.sshd.client.SshClient;

/**
 * ssh公共client
 *
 *
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
