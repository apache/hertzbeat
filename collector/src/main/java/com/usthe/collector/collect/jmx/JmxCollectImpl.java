package com.usthe.collector.collect.jmx;

import com.usthe.collector.collect.AbstractCollect;
import com.usthe.collector.collect.http.HttpCollectImpl;
import com.usthe.common.entity.job.Metrics;
import com.usthe.common.entity.job.protocol.JmxProtocol;
import com.usthe.common.entity.message.CollectRep;
import lombok.extern.slf4j.Slf4j;

import javax.management.MBeanServerConnection;
import javax.management.ObjectInstance;
import javax.management.ObjectName;
import javax.management.openmbean.CompositeDataSupport;
import javax.management.remote.*;
import java.lang.management.*;
import java.util.Iterator;
import java.util.List;
import java.util.Set;

/**
 * jmx 采集实现类
 *
 * @ClassName JmxCollectImpl
 * @Description
 * @Author huacheng
 * @Date 2022/6/21 15:09
 * @Version 1.0
 **/
@Slf4j
public class JmxCollectImpl extends AbstractCollect {

    private JmxCollectImpl() {
    }

    public static JmxCollectImpl getInstance() {
        return Singleton.INSTANCE;
    }

    @Override
    public void collect(CollectRep.MetricsData.Builder builder, long appId, String app, Metrics metrics) {
        //从Metrics携带的jmx中拿到地址  端口

        //创建一个jndi远程连接

        //获取指标  and  异常处理
//        JMXServiceURL url
        //指标结果收集
    }

    private static class Singleton {
        private static final JmxCollectImpl INSTANCE = new JmxCollectImpl();
    }


//    public static void main(String[] args) {
//        // TODO Auto-generated method stub
//        try {
//
//            // 这里的url是在上图中输入的url
//            JMXServiceURL url = new JMXServiceURL("service:jmx:rmi:///jndi/rmi://121.40.113.44:9999/jmxrmi");
//            // Map<String, String[]> map = new HashMap();
//            // String[] credentials=new String[] {"monitorRole","QED"};
//            // map.put("jmx.remote.credentials",credentials);
//
//            JMXConnector conn = JMXConnectorFactory.connect(url);
//            System.out.println("JMXConnector=" + conn.toString());
//            String id = conn.getConnectionId();
//            System.out.println("Connection Id=" + id);
//
//            MBeanServerConnection mbsc = conn.getMBeanServerConnection();
//            String domains[] = mbsc.getDomains();
//            System.out.println("# of domains=" + domains.length);
//            for (int i = 0; i < domains.length; i++) {
//                System.out.println("Domain[" + i + "]=" + domains[i]);
//            }
//
//            Set<ObjectInstance> MBeanset = mbsc.queryMBeans(null, null);
//            System.out.println("MBeanset.size() : " + MBeanset.size());
//            Iterator<ObjectInstance> MBeansetIterator = MBeanset.iterator();
//            while (MBeansetIterator.hasNext()) {
//                ObjectInstance objectInstance = (ObjectInstance) MBeansetIterator.next();
//                ObjectName objectName = objectInstance.getObjectName();
//                String canonicalName = objectName.getCanonicalName();
//                System.out.println("objectName >>>>>>>>>>: " + objectName);
//                System.out.println("canonicalName : " + canonicalName);
//                // 在上图中，有Catalina:type=Server的port的值8005，运行程序后，在控制台能看到获取成功
//                if (objectName.toString().equals("Catalina:type=Server")) {
//                    // Get details of cluster MBeans
//                    String s = mbsc.getAttribute(objectName, "port").toString();
//                    System.out.println("=========================================");
//                    System.out.println(s);
//                    System.out.println("=========================================");
//                }
//                // String canonicalKeyPropList=objectName.getCanonicalKeyPropertyListString();
//            }
//            conn.close();
//        } catch (Exception ex) {
//            System.out.println("Illegal Argument Exception: " + ex);
//        }
//
//    }

    public static void main(String[] args) {
        try {
            String KeyName = "";
            String objectName1 = "";
            String attributeName = "";
            String attributeKey = "";
            String value = "";

            objectName1 = "java.lang:type=Memory";
            attributeName = "NonHeapMemoryUsage";
            attributeKey = "init";

            objectName1 = "java.lang:name=PS Eden Space";
            attributeName = "MemoryPool";
            attributeKey = "";

            value = GetValueByKey(objectName1, attributeName, attributeKey);
            System.out.println("value>>>>>>>>>>>>>>>>>" + value);
//            // 这里的url是在上图中输入的url
//            JMXServiceURL url = new JMXServiceURL("service:jmx:rmi:///jndi/rmi://121.40.113.44:9999/jmxrmi");
//            // Map<String, String[]> map = new HashMap();
//            // String[] credentials=new String[] {"monitorRole","QED"};
//            // map.put("jmx.remote.credentials",credentials);
//
//            JMXConnector conn = JMXConnectorFactory.connect(url);
//            System.out.println("JMXConnector=" + conn.toString());
//            String id = conn.getConnectionId();
//            System.out.println("Connection Id=" + id);
//
//			MBeanServerConnection mbsc = conn.getMBeanServerConnection();
//			String domains[] = mbsc.getDomains();
//			System.out.println("# of domains=" + domains.length);
//			for (int i = 0; i < domains.length; i++) {
//				System.out.println("Domain[" + i + "]=" + domains[i]);
//			}
//
//			Set<ObjectInstance> MBeanset = mbsc.queryMBeans(null, null);
//			System.out.println("MBeanset.size() : " + MBeanset.size());
//			Iterator<ObjectInstance> MBeansetIterator = MBeanset.iterator();
//			while (MBeansetIterator.hasNext()) {
//				ObjectInstance objectInstance = (ObjectInstance) MBeansetIterator.next();
//				ObjectName objectName = objectInstance.getObjectName();
//				String canonicalName = objectName.getCanonicalName();
//
//				System.out.println("canonicalName : " + canonicalName);
//				if(canonicalName.contains("PS Old Gen")) {
//					System.out.println("mbsc>>>>>>>>>>>>>>>>>>"+mbsc);
//				}
//				// 在上图中，有Catalina:type=Server的port的值8005，运行程序后，在控制台能看到获取成功
//				if (objectName.toString().equals("Catalina:type=Server")) {
//					// Get details of cluster MBeans
//					String s = mbsc.getAttribute(objectName, "port").toString();
//					System.out.println("=========================================");
//					System.out.println(s);
//					System.out.println("=========================================");
//				}
//				// String canonicalKeyPropList=objectName.getCanonicalKeyPropertyListString();
//			}
//			conn.close();
        } catch (Exception ex) {
            System.out.println("Illegal Argument Exception: " + ex);
        }
    }

    private static String GetValueByKey(String objectName, String attributeName, String attributeKey) throws Exception {
        JMXConnector conn = null;
        try {
            String _value = "";
            objectName = "java.lang:type=ClassLoading";
            attributeName = "LoadedClassCount";
            attributeKey = "";
            JMXServiceURL url = new JMXServiceURL("service:jmx:rmi:///jndi/rmi://121.40.113.44:9999/jmxrmi");
            // Map<String, String[]> map = new HashMap();
            // String[] credentials=new String[] {"monitorRole","QED"};
            // map.put("jmx.remote.credentials",credentials);

            conn = JMXConnectorFactory.connect(url);
            System.out.println("JMXConnector=" + conn.toString());


            MBeanServerConnection mbsc = conn.getMBeanServerConnection();
            String domains[] = mbsc.getDomains();
            String id = conn.getConnectionId();
            System.out.println("Connection Id=" + id);
            // Set<ObjectInstance> MBeanset = mbsc.queryMBeans("java.lang:type=Memory",null);
            // Set<ObjectInstance> MBeanset = mbsc.queryMBeans(null, null);
            ObjectName _objectName = new ObjectName(objectName);

            if (attributeKey.equals("")) {
                CompositeDataSupport support = (CompositeDataSupport) mbsc.getAttribute(_objectName, attributeName);
                System.out.println("init:" + support.get("committed"));
            } else {
                javax.management.openmbean.CompositeData data = (javax.management.openmbean.CompositeData) mbsc
                        .getAttribute(_objectName, attributeName);
                _value = data.get(attributeKey).toString();
            }

            return _value;


            //方式二
            //返回 Java 虚拟机中的 GarbageCollectorMXBean 对象列表。 Java 虚拟机可能有一个或多个 GarbageCollectorMXBean 对象。它可以在执行期间添加或删除 GarbageCollectorMXBean。返回： GarbageCollectorMXBean 对象的列表。
//            List<GarbageCollectorMXBean> garbageCollectosrMXBeans = ManagementFactory.getGarbageCollectorMXBeans();
//            System.out.println("garbageCollectosrMXBeans----start");
//            garbageCollectosrMXBeans.forEach(bean -> {
//                System.out.println(bean.getName());
//                System.out.println(bean.getCollectionCount());
//                System.out.println(bean.getCollectionTime());
//            });
//            System.out.println("garbageCollectosrMXBeans----end");
//            //返回 Java 虚拟机的类加载系统的托管 bean。返回： Java 虚拟机的 ClassLoadingMXBean 对象。
//            ClassLoadingMXBean classLoadingMXBean = ManagementFactory.getClassLoadingMXBean();
//            System.out.println("类加载器信息------start");
//            System.out.println(classLoadingMXBean.getClass());
//            System.out.println(classLoadingMXBean.getLoadedClassCount());
//            System.out.println(classLoadingMXBean.getTotalLoadedClassCount());
//            System.out.println(classLoadingMXBean.getUnloadedClassCount());
//            System.out.println("类加载器信息------end");
            //返回 Java 虚拟机中的 MemoryPoolMXBean 对象列表。 Java 虚拟机可以有一个或多个内存池。它可以在执行期间添加或删除内存池。
            // 返回： MemoryPoolMXBean 对象的列表。
//            List<MemoryPoolMXBean> memoryPoolMXBeans1 = ManagementFactory.getMemoryPoolMXBeans();
//            System.out.println("memoryPoolMXBeans1-----start");
//            memoryPoolMXBeans1.forEach(bean -> {
//                bean.getName()
//            });
            //返回 Java 虚拟机编译系统的托管 bean。如果 Java 虚拟机没有编译系统，则此方法返回 null。返回： Java 虚拟机的 CompilationMXBean 对象；如果 Java 虚拟机没有编译系统，则返回 null。
//
//            CompilationMXBean compilationMXBean = ManagementFactory.getCompilationMXBean();
//            System.out.println("compilationMXBean---");
//            System.out.println(compilationMXBean.getName());
//            System.out.println(compilationMXBean.getTotalCompilationTime());
//            System.out.println("compilationMXBean----end");
//
//            CompositeDataSupport support = (CompositeDataSupport) mbsc.getAttribute(_objectName, attributeName);
//                ThreadMXBean threadMXBean = ManagementFactory.getThreadMXBean();
//                System.out.println("threadMXBean---start");
//                System.out.println(threadMXBean.getThreadCount());
//                for (long allThreadId : threadMXBean.getAllThreadIds()) {
//                    ThreadInfo threadInfo = threadMXBean.getThreadInfo(allThreadId);
//                    System.out.println(threadInfo.getThreadId());
//                    System.out.println(threadInfo.getThreadName());
//                }
//                System.out.println();
////
//                System.out.println("threadMXBean---end");


            //返回 Java 虚拟机的内存系统的托管 bean。返回： Java 虚拟机的 MemoryMXBean 对象。
//            MemoryMXBean memBean = ManagementFactory.getMemoryMXBean();
//            List<MemoryPoolMXBean> memoryPoolMXBeans = ManagementFactory.getMemoryPoolMXBeans();
//            memoryPoolMXBeans.forEach(memoryPoolMXBean -> {
//                System.out.println(memoryPoolMXBean.getName() + ":" + memoryPoolMXBean.getUsage());
//                System.out.println(memoryPoolMXBean.getPeakUsage());
//                System.out.println(memoryPoolMXBean.getCollectionUsage());
//                System.out.println("------------");
////                System.out.println(memoryPoolMXBean.getCollectionUsageThreshold());
////                System.out.println(memoryPoolMXBean.getCollectionUsageThresholdCount());
//                System.out.println(memoryPoolMXBean.getType());
////                System.out.println(memoryPoolMXBean.getUsageThreshold());
////                System.out.println(memoryPoolMXBean.getUsageThresholdCount());
//                System.out.println("------------");
//            });
//            MemoryUsage mem = memBean.getHeapMemoryUsage();

        } catch (Exception ex) {
            System.out.println("Illegal Argument Exception: " + ex);
            throw ex;
        } finally {
            if (conn != null) {
                conn.close();
            }
        }
    }
}
