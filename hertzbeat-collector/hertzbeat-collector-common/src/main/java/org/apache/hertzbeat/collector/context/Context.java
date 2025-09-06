package org.apache.hertzbeat.collector.context;

import org.apache.hertzbeat.collector.constants.ContextStatus;

/**
 * 只维护与上下文的元数据
 */
public interface Context extends ContextView, ContextOperation {
    ContextStatus getStatus();

    void setStatus(ContextStatus status);
}
