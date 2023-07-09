package org.dromara.hertzbeat.collector.util;

import lombok.experimental.UtilityClass;
import lombok.extern.slf4j.Slf4j;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Paths;
import java.util.Objects;
import java.util.stream.Collectors;

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

    public static void writePrivateKey(String keyStr) throws IOException {
        var sshPath = Paths.get(KEY_PATH);
        Files.createDirectories(sshPath);
        try (var paths = Files.list(sshPath)) {
            var files = paths.collect(Collectors.toUnmodifiableList());
            for (var file : files) {
                var k = Files.readString(file);
                if (Objects.equals(k, keyStr)) {
                    log.info("{} key is already exists.", keyStr);
                    return;
                }
            }
            Files.writeString(Paths.get(KEY_PATH, "id_rsa_" + System.currentTimeMillis()), keyStr);
        } catch (Exception ex) {
            log.error("write private key {} to ~/.ssh error", keyStr, ex);
        }
    }

}
