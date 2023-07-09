package org.dromara.hertzbeat.collector.util;

import lombok.experimental.UtilityClass;
import lombok.extern.slf4j.Slf4j;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.Objects;

/**
 * 将私钥写入~/.ssh
 *
 * @author <a href="mailto:gcwm99@gmail.com">gcdd1993</a>
 * Created by gcdd1993 on 2023/7/9
 */
@Slf4j
@UtilityClass
public class PrivateKeyUtils {

    private static final String KEY_PATH = System.getProperty("user.home") + "/.ssh";

    /**
     * write private key to ~/.ssh, filename is ~/.ssh/id_rsa_${host}
     *
     * @param host   host
     * @param keyStr key string
     * @return key file path
     * @throws IOException if ~/.ssh is not exist and create dir error
     */
    public static String writePrivateKey(String host, String keyStr) throws IOException {
        var sshPath = Paths.get(KEY_PATH);
        if (!Files.exists(sshPath)) {
            Files.createDirectories(sshPath);
        }
        var keyPath = Paths.get(KEY_PATH, "id_rsa_" + host);
        if (!Files.exists(keyPath)) {
            Files.writeString(keyPath, keyStr);
        } else {
            var oldKey = Files.readString(keyPath);
            if (!Objects.equals(oldKey, keyStr)) {
                Files.writeString(keyPath, keyStr);
            }
        }
        return keyPath.toString();
    }

}
