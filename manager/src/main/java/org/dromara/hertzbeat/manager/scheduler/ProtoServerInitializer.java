package org.dromara.hertzbeat.manager.scheduler;

import io.netty.channel.ChannelInitializer;
import io.netty.channel.ChannelPipeline;
import io.netty.channel.socket.SocketChannel;
import io.netty.handler.codec.compression.ZlibCodecFactory;
import io.netty.handler.codec.compression.ZlibWrapper;
import io.netty.handler.codec.protobuf.ProtobufDecoder;
import io.netty.handler.codec.protobuf.ProtobufEncoder;
import io.netty.handler.codec.protobuf.ProtobufVarint32FrameDecoder;
import io.netty.handler.codec.protobuf.ProtobufVarint32LengthFieldPrepender;
import io.netty.handler.timeout.IdleStateHandler;
import org.dromara.hertzbeat.common.entity.message.ClusterMsg;

/**
 * netty server initializer
 *
 */
public class ProtoServerInitializer extends ChannelInitializer<SocketChannel> {
    
    private final CollectorScheduling collectorScheduling;
    
    private final CollectJobScheduling collectJobScheduling;
    
    public ProtoServerInitializer(CollectorScheduling collectorScheduling, CollectJobScheduling collectJobScheduling) {
        super();
        this.collectorScheduling = collectorScheduling;
        this.collectJobScheduling = collectJobScheduling;
    }
    
    @Override
    protected void initChannel(SocketChannel socketChannel) throws Exception {
        ChannelPipeline pipeline = socketChannel.pipeline();
        // zip
        pipeline.addLast(ZlibCodecFactory.newZlibEncoder(ZlibWrapper.GZIP));
        pipeline.addLast(ZlibCodecFactory.newZlibDecoder(ZlibWrapper.GZIP));
        // protocol buf encode decode
        pipeline.addLast(new ProtobufVarint32FrameDecoder());
        pipeline.addLast(new ProtobufDecoder(ClusterMsg.Message.getDefaultInstance()));
        pipeline.addLast(new ProtobufVarint32LengthFieldPrepender());
        pipeline.addLast(new ProtobufEncoder());
        // idle state
        pipeline.addLast(new IdleStateHandler(0, 0, 30));
        // message handler
        pipeline.addLast(new ServerInboundMessageHandler(collectorScheduling, collectJobScheduling));
    }
}
