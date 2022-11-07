package com.usthe.collector.collect.http.micro;

import com.usthe.common.entity.job.protocol.HttpProtocol;

import java.util.List;
import java.util.Map;

/**
 * 微服务解析链路
 * @author myth
 * @date 2022/9/15 9:28
 */
public abstract class  AbstractMicroParse {

    /**
     * 下游节点
     */
    private AbstractMicroParse microParse;

    AbstractMicroParse() {
    }

    /**
     * 设置实例
     * @param microParse
     * @return
     */
    public AbstractMicroParse setInstance(AbstractMicroParse microParse) {
        this.microParse = microParse;
        return this;
    }

    /**
     * 检查符合那个链路对象
     * @param http
     * @return
     */
    abstract Boolean checkType(HttpProtocol http);

    /**
     * 微服务响应-通用解析方法
     * @param resp
     * @param fields
     * @param aliasFields
     * @param jsonScript
     * @param http
     * @param tempcloums
     * @param kv
     */
    abstract void parse(String resp, List<String> fields,List<String> aliasFields,List<String> jsonScript, HttpProtocol http,
                        Map<String,List<String>> tempcloums,String kv);

    /**
     * 微服务响应-获取请求次数解析方法
     * @param resp
     * @param field
     * @param aliasField
     * @param jsonScript
     * @param http
     * @param tempcloums
     * @param kv
     */
    abstract void parse(String resp,String field, String aliasField ,String jsonScript, HttpProtocol http,
               Map<String,List<String>> tempcloums,String kv);

    /**
     * 微服务响应-默认解析方法
     * @param resp
     * @param fields
     * @param aliasFields
     * @param jsonScript
     * @param http
     * @param tempcloums
     * @param kv
     */
    public void handle(String resp, List<String> fields,List<String> aliasFields,List<String> jsonScript, HttpProtocol http,
                       Map<String,List<String>> tempcloums,String kv) {
        if (checkType(http)) {
            parse(resp,fields, aliasFields,jsonScript, http,
                    tempcloums,kv);
        } else {
            microParse.handle(resp, fields,aliasFields, jsonScript,http,
                    tempcloums,kv);
        }
    }

    /**
     * 获取链路对象处理方法
     * @param resp
     * @param field
     * @param aliasField
     * @param jsonScript
     * @param http
     * @param tempcloums
     * @param kv
     */
    public void handle(String resp, String field,String aliasField,String jsonScript, HttpProtocol http,
                       Map<String,List<String>> tempcloums,String kv) {
        if (checkType(http)) {
            parse(resp,field, aliasField,jsonScript, http,
                    tempcloums,kv);
        } else {
            microParse.handle(resp,field, aliasField, jsonScript,http,
                    tempcloums,kv);
        }
    }


}
