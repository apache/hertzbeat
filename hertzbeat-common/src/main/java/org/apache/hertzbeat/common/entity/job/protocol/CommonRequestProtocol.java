package org.apache.hertzbeat.common.entity.job.protocol;

/**
 * Define common field method for each protocol in {@link org.apache.hertzbeat.common.entity.job.Metrics}
 */
public interface CommonRequestProtocol {
    void setHost(String host);

    void setPort(String port);
}