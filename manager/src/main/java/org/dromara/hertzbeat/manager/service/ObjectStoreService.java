package org.dromara.hertzbeat.manager.service;

import org.dromara.hertzbeat.manager.pojo.dto.FileDTO;
import org.dromara.hertzbeat.manager.pojo.dto.ObjectStoreDTO;

import java.io.InputStream;
import java.util.List;

/**
 * 文件存储服务
 *
 * @author <a href="mailto:gcwm99@gmail.com">gcdd1993</a>
 * Created by gcdd1993 on 2023/9/13
 */
public interface ObjectStoreService {

    /**
     * 保存文件
     *
     * @param filePath 文件路径，例如：hertzbeat/111.json
     * @param is       文件流
     */
    boolean upload(String filePath, InputStream is);

    /**
     * 读取文件
     *
     * @param filePath 文件路径，例如：hertzbeat/111.json
     * @return 文件
     */
    FileDTO download(String filePath);

    /**
     * 列举文件
     *
     * @param dir 文件目录
     * @return 文件列表
     */
    List<FileDTO> list(String dir);

    ObjectStoreDTO.Type type();

}
