package org.dromara.hertzbeat.remoting.event;

import lombok.extern.slf4j.Slf4j;

import java.util.concurrent.LinkedBlockingQueue;
import java.util.concurrent.TimeUnit;

/**
 * netty event listener executor
 */
@Slf4j
public class NettyEventExecutor {

    private final LinkedBlockingQueue<NettyEvent> eventQueue = new LinkedBlockingQueue<>();

    private final NettyEventListener nettyEventListener;

    private Thread thread;

    private boolean stopped = false;

    public NettyEventExecutor(final NettyEventListener nettyEventListener) {
        this.nettyEventListener = nettyEventListener;
    }

    public void addEvent(final NettyEvent nettyEvent) {
        int maxSize = 1000;
        if (this.eventQueue.size() > maxSize) {
            log.warn("event queue size is bigger than {}", maxSize);
        } else {
            this.eventQueue.add(nettyEvent);
        }
    }

    public void start() {
        this.thread = new Thread(() -> {
            while (!this.stopped) {
                try {
                    NettyEvent nettyEvent = this.eventQueue.poll(3000, TimeUnit.MILLISECONDS);
                    if (nettyEvent != null) {
                        nettyEventListener.onChannelIdle(nettyEvent.getChannel());
                    }
                } catch (Exception e) {
                    log.error("handle netty event exception, {}", e.getMessage());
                }
            }
        });
        this.thread.start();
    }

    public void shutdown() {
        this.stopped = true;
        this.thread.interrupt();
    }
}
