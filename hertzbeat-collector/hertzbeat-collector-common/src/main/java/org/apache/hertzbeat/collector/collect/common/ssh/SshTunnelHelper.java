package org.apache.hertzbeat.collector.collect.ssh;


import com.github.benmanes.caffeine.cache.Cache;
import com.github.benmanes.caffeine.cache.Caffeine;
import lombok.extern.slf4j.Slf4j;
import org.apache.hertzbeat.common.entity.job.SshTunnel;
import org.apache.sshd.client.session.ClientSession;
import org.apache.sshd.client.session.forward.ExplicitPortForwardingTracker;
import org.apache.sshd.common.util.net.SshdSocketAddress;

import java.io.IOException;
import java.net.ServerSocket;
import java.security.GeneralSecurityException;
import java.time.Duration;
import java.util.HashSet;
import java.util.Map;
import java.util.Random;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

/**
 * Ssh Tunnel Helper
 */
@Slf4j
public class SshTunnelHelper {

    private static final Map<String, Set<Integer>> LOCAL_PORT_SHARE_MAP = new ConcurrentHashMap<>();

    private static final Cache<String, ExplicitPortForwardingTracker> TRACKER_CACHE =
            Caffeine.newBuilder()
                    .initialCapacity(1)
                    .maximumSize(1000)
                    .expireAfterAccess(Duration.ofSeconds(180))
                    .removalListener((key, value, cause) -> {
                        try {
                            // 1. try close tunnel
                            if (value != null) {
                                ((ExplicitPortForwardingTracker) value).close();
                            }
                            // 2. remove local port share map
                            if (key != null) {
                                String keyStr = (String) key;
                                int i = keyStr.lastIndexOf("#");
                                String shareKey = keyStr.substring(0, i);
                                Integer localPort = Integer.parseInt(keyStr.substring(i + 1));
                                Set<Integer> localPorts = LOCAL_PORT_SHARE_MAP.get(shareKey);
                                if (localPorts != null) {
                                    localPorts.remove(localPort);
                                    if (localPorts.isEmpty()) {
                                        LOCAL_PORT_SHARE_MAP.remove(shareKey);
                                    }
                                    log.info("removed local port share map key: {}", shareKey);
                                }
                            }
                            log.info("discarded ssh forwarding tracker key: {}", key);
                        } catch (IOException ignore) {
                        }
                    })
                    .build();


    public static int localPortForward(SshTunnel sshTunnel, String remoteHost, String remotePort) throws GeneralSecurityException, IOException {
        // 1. get ssh session
        boolean reuseConnection = Boolean.parseBoolean(sshTunnel.getReuseConnection());
        ClientSession clientSession = SshHelper.getConnectSession(sshTunnel.getHost(), sshTunnel.getPort(),
                sshTunnel.getUsername(), sshTunnel.getPassword(), sshTunnel.getPrivateKey(),
                Integer.parseInt(sshTunnel.getTimeout()), reuseConnection);

        // 2. get local port
        int localPort = 0;
        String shareKey = sshTunnel.getHost() + ":" + sshTunnel.getPort() + "#" + remoteHost + ":" + remotePort;
        if (sshTunnel.getLocalPort() == null || Integer.parseInt(sshTunnel.getLocalPort()) <= 0) {
            if (reuseConnection) {
                Set<Integer> sharePortSet = LOCAL_PORT_SHARE_MAP.computeIfAbsent(shareKey, key -> new HashSet<>());
                if (sharePortSet.isEmpty()) {
                    localPort = getRandomPort();
                    sharePortSet.add(localPort);
                } else {
                    int randomIndex = new Random().nextInt(sharePortSet.size());
                    int currentIndex = 0;
                    for (Integer port : sharePortSet) {
                        if (currentIndex == randomIndex) {
                            localPort = port;
                        }
                        currentIndex++;
                    }
                }
            } else {
                localPort = getRandomPort();
            }
        } else {
            localPort = Integer.parseInt(sshTunnel.getLocalPort());
            if (reuseConnection) {
                Set<Integer> sharePortSet = LOCAL_PORT_SHARE_MAP.computeIfAbsent(shareKey, key -> new HashSet<>());
                sharePortSet.add(localPort);
            }
        }

        // 3. get tunnel
        String key = shareKey + "#" + localPort;
        ExplicitPortForwardingTracker tracker = TRACKER_CACHE.getIfPresent(key);
        if (tracker == null || !tracker.isOpen()) {
            SshdSocketAddress remoteAddress = new SshdSocketAddress(remoteHost, Integer.parseInt(remotePort));
            SshdSocketAddress localAddress = new SshdSocketAddress("localhost", localPort);
            tracker = clientSession.createLocalPortForwardingTracker(localAddress, remoteAddress);
            TRACKER_CACHE.put(key, tracker);
            log.info("created ssh forwarding tracker ssh:{}, remote:{}, localPort:{}", sshTunnel.getHost() + ":" + sshTunnel.getPort(),
                    remoteHost + ":" + remotePort, localPort);
        }

        return localPort;
    }


    private static int getRandomPort() throws IOException {
        try (ServerSocket serverSocket = new ServerSocket(0);) {
            return serverSocket.getLocalPort();
        }
    }

}
