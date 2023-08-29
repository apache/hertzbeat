package org.dromara.hertzbeat.remoting.netty;

import org.dromara.hertzbeat.common.entity.message.ClusterMsg;

import java.util.concurrent.CountDownLatch;
import java.util.concurrent.TimeUnit;

/**
 * netty response future
 */
public class ResponseFuture {

    private final CountDownLatch countDownLatch = new CountDownLatch(1);

    private ClusterMsg.Message response;

    public ClusterMsg.Message waitResponse(final long timeoutMillis) throws InterruptedException {
        this.countDownLatch.await(timeoutMillis, TimeUnit.MILLISECONDS);
        return this.response;
    }

    public void putResponse(final ClusterMsg.Message response) {
        this.response = response;
        this.countDownLatch.countDown();
    }

}
