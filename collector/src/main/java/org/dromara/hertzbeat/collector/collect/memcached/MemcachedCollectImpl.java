package org.dromara.hertzbeat.collector.collect.memcached;

import lombok.extern.slf4j.Slf4j;
import org.dromara.hertzbeat.collector.collect.AbstractCollect;
import org.dromara.hertzbeat.collector.dispatch.DispatchConstants;
import org.dromara.hertzbeat.common.constants.CollectorConstants;
import org.dromara.hertzbeat.common.constants.CommonConstants;
import org.dromara.hertzbeat.common.entity.job.Metrics;
import org.dromara.hertzbeat.common.entity.job.protocol.MemcachedProtocol;
import org.dromara.hertzbeat.common.entity.message.CollectRep;
import org.dromara.hertzbeat.common.util.CommonUtil;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.net.InetSocketAddress;
import java.net.Socket;
import java.net.SocketAddress;
import java.net.SocketTimeoutException;
import java.net.UnknownHostException;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

/**
 * @author dongfeng
 */
@Slf4j
public class MemcachedCollectImpl extends AbstractCollect {
    public MemcachedCollectImpl() {
    }

    private static final String STATS = "stats";
    private static final String STATS_SETTINGS = "stats settings";
    private static final String STATS_ITEMS = "stats items";
    private static final String STATS_SIZES = "stats sizes";
    private static final String STATS_END_RSP = "END";

    @Override
    public void collect(CollectRep.MetricsData.Builder builder, long monitorId, String app, Metrics metrics) {
        long startTime = System.currentTimeMillis();
        if (metrics == null || metrics.getMemcached() == null) {
            builder.setCode(CollectRep.Code.FAIL);
            builder.setMsg("Memcached collect must has Memcached params");
            return;
        }
        MemcachedProtocol memcachedProtocol = metrics.getMemcached();
        String memcachedHost = memcachedProtocol.getHost();
        String memcachedPort = memcachedProtocol.getPort();
        Socket socket = null;
        try {
            socket = new Socket();
            SocketAddress socketAddress = new InetSocketAddress(memcachedHost, Integer.parseInt(memcachedPort));
            socket.connect(socketAddress);
            if (socket.isConnected()) {
                long responseTime = System.currentTimeMillis() - startTime;
                PrintWriter out = new PrintWriter(socket.getOutputStream(), true);
                BufferedReader in = new BufferedReader(new InputStreamReader(socket.getInputStream()));
                // 发送统计命令
                Map<String, String> resultMap = new HashMap<>(128);
                parseCMDResponse(resultMap, in, out, STATS);
                parseCMDResponse(resultMap, in, out, STATS_SETTINGS);
                parseSizesOutput(resultMap, in, out);

                resultMap.put(CollectorConstants.RESPONSE_TIME, Long.toString(responseTime));

                //  关闭输出流和Socket连接
                in.close();
                out.close();
                socket.close();
                List<String> aliasFields = metrics.getAliasFields();
                CollectRep.ValueRow.Builder valueRowBuilder = CollectRep.ValueRow.newBuilder();
                for (String field : aliasFields) {
                    String fieldValue = resultMap.get(field);
                    valueRowBuilder.addColumns(Objects.requireNonNullElse(fieldValue, CommonConstants.NULL_VALUE));
                }
                builder.addValues(valueRowBuilder.build());
            } else {
                builder.setCode(CollectRep.Code.UN_CONNECTABLE);
                builder.setMsg("Peer connect failed:");
            }
        } catch (UnknownHostException unknownHostException) {
            String errorMsg = CommonUtil.getMessageFromThrowable(unknownHostException);
            log.info(errorMsg);
            builder.setCode(CollectRep.Code.UN_CONNECTABLE);
            builder.setMsg("UnknownHost:" + errorMsg);
        } catch (SocketTimeoutException socketTimeoutException) {
            String errorMsg = CommonUtil.getMessageFromThrowable(socketTimeoutException);
            log.info(errorMsg);
            builder.setCode(CollectRep.Code.UN_CONNECTABLE);
            builder.setMsg("Socket connect timeout: " + errorMsg);
        } catch (IOException ioException) {
            String errorMsg = CommonUtil.getMessageFromThrowable(ioException);
            log.info(errorMsg);
            builder.setCode(CollectRep.Code.UN_CONNECTABLE);
            builder.setMsg("Connect fail:" + errorMsg);
        } finally {
            if (socket != null) {
                try {
                    socket.close();
                } catch (Exception e) {
                    log.error(e.getMessage());
                }
            }
        }
    }

    private static void parseCMDResponse(Map<String, String> statsMap,
                                         BufferedReader in,
                                         PrintWriter out,
                                         String cmd) throws IOException {
        out.println(cmd);
        String line;
        while ((line = in.readLine()) != null && !line.equals(STATS_END_RSP)) {
            // 解析每一行，将键值对存入HashMap
            String[] parts = line.split(" ");
            if (parts.length == 3) {
                statsMap.put(parts[1], parts[2]);
            }
        }
    }

    private static void parseSizesOutput(Map<String, String> statsMap,
                                         BufferedReader in,
                                         PrintWriter out) throws IOException {
        out.println(STATS_SIZES);
        String line;
        while ((line = in.readLine()) != null && !line.equals(STATS_END_RSP)) {
            String[] parts = line.split("\\s+");
            // 提取 slab size 和 slab count，并放入HashMap
            if (parts.length >= 3 && "STAT".equals(parts[0])) {
                statsMap.put("item_size", parts[1]);
                statsMap.put("item_count", parts[2]);
            }
        }
    }


    @Override
    public String supportProtocol() {
        return DispatchConstants.PROTOCOL_MEMCACHED;
    }
}
