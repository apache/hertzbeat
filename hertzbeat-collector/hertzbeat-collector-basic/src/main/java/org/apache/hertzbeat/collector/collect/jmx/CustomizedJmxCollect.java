package org.apache.hertzbeat.collector.collect.jmx;

/**
 * @author doveLin <lindefu@kuaishou.com>
 * Created on 2024-12-28
 */


public interface CustomizedJmxCollect {

    // Abstract method to collect data, accepting a CustomizedJmxFactory.CustomizedJmxRequest as a parameter
    void collect(CustomizedJmxFactory.customizedJmxRequest request);
}

