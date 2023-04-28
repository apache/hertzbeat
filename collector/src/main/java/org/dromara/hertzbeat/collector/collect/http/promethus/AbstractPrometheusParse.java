package org.dromara.hertzbeat.collector.collect.http.promethus;

import org.dromara.hertzbeat.common.entity.job.protocol.HttpProtocol;
import org.dromara.hertzbeat.common.entity.message.CollectRep;

import java.util.List;

/**
 * @author myth
 *
 * todo: string类型 和 scalar类型 响应格式解析
 */
public abstract class AbstractPrometheusParse {

    /**
     * 下游节点
     */
    private AbstractPrometheusParse prometheusParse;

    AbstractPrometheusParse() {
    }

    public AbstractPrometheusParse setInstance(AbstractPrometheusParse prometheusParse) {
        this.prometheusParse = prometheusParse;
        return this;
    }

    /**
     * prom响应类型校验：string、matrix、vector、scalar
     * todo：string、scalar类型响应未实现
     * @param responseStr
     * @return
     */
    abstract Boolean checkType(String responseStr);

    /**
     * 解析prom接口响应数据
     * @param resp
     * @param aliasFields
     * @param http
     * @param builder
     */
    abstract void parse(String resp, List<String> aliasFields, HttpProtocol http,
                        CollectRep.MetricsData.Builder builder);

    /**
     * 处理prom接口响应数据
     * @param resp
     * @param aliasFields
     * @param http
     * @param builder
     */
    public void handle(String resp, List<String> aliasFields, HttpProtocol http,
                       CollectRep.MetricsData.Builder builder) {
        if (checkType(resp)) {
            parse(resp, aliasFields, http,
                    builder);
        } else {
            prometheusParse.handle(resp, aliasFields, http,
                    builder);
        }
    }


}
