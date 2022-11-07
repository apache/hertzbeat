package com.usthe.collector.collect;

import com.usthe.common.entity.job.protocol.ServiceProtocol;
import com.usthe.common.model.ServicePodModel;
import com.usthe.common.entity.job.Metrics;
import com.usthe.common.entity.job.protocol.HttpProtocol;
import com.usthe.common.entity.message.CollectRep;
import org.springframework.beans.factory.InitializingBean;

import java.util.List;
import java.util.Map;


/**
 * 不同数据格式解析抽象类
 *
 *
 */

public interface AbstractParseResponse extends InitializingBean {
    /**
     * 通用解析抽象方法
     *
     * @param resp
     * @param aliasFields
     * @param http
     * @param builder
     * @param responseTime
     */
    public default void parseResponse(String resp, List<String> aliasFields, HttpProtocol http,
                                      CollectRep.MetricsData.Builder builder, Long responseTime) {

    }

    /**
     * k8s解析方式
     *
     * @param metrics
     * @param resp
     * @param podMap
     * @param aliasFields
     * @param service
     * @param builder
     * @param responseTime
     */
    public default void parseK8sApi(Metrics metrics, Object resp, Map<String, ServicePodModel> podMap, List<String> aliasFields, ServiceProtocol service,
                                    CollectRep.MetricsData.Builder builder, Long responseTime) {

    }

    /**
     * 微服务响应体解析方法
     * @param resp
     * @param fields
     * @param aliasFields
     * @param jsonScript
     * @param http
     * @param tempcloums
     * @param kv
     */
    public default void parseResponse(String resp,List<String> fields, List<String> aliasFields ,List<String> jsonScript, HttpProtocol http,
                                      Map<String,List<String>> tempcloums,String kv){

    }

    /**
     * 微服务响应体解析方法
     * @param resp
     * @param field
     * @param aliasField
     * @param jsonScript
     * @param http
     * @param tempcloums
     * @param kv
     */
    public default void parseResponse(String resp,String field, String aliasField ,String jsonScript, HttpProtocol http,
                                      Map<String,List<String>> tempcloums,String kv){

    }
}
