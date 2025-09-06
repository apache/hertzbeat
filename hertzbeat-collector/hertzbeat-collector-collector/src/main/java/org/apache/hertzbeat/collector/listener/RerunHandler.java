package org.apache.hertzbeat.collector.listener;

import lombok.AllArgsConstructor;
import org.apache.hertzbeat.collector.constants.ContextKey;
import org.apache.hertzbeat.collector.context.Context;
import org.apache.hertzbeat.collector.handler.ContextBoundHandler;
import org.apache.hertzbeat.collector.timer.TimerDispatch;
import org.apache.hertzbeat.collector.timer.WheelTimerTask;
import org.apache.hertzbeat.common.entity.job.Job;
import org.apache.hertzbeat.common.timer.Timeout;

import java.util.concurrent.TimeUnit;

/**
 * 周期任务专用
 */
@AllArgsConstructor
public class RerunHandler implements ContextBoundHandler<Object> {
    private TimerDispatch timerDispatch;

    @Override
    public void execute(Context context, Object data) {
        Job job = context.get(ContextKey.JOB);
        Timeout timeout = context.get(ContextKey.TIMEOUT);

        if (!timeout.isCancelled()) {
            long spendTime = System.currentTimeMillis() - job.getDispatchTime();
            long interval = job.getInterval() - spendTime / 1000L;
            interval = interval <= 0 ? 0 : interval;
            timerDispatch.cyclicJob((WheelTimerTask) timeout.task(), interval, TimeUnit.SECONDS);
        }
    }

    @Override
    public void whenException(Context context, Object data, Throwable throwable) {

    }
}
