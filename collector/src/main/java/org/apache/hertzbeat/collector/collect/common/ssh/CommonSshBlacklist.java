/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package org.apache.hertzbeat.collector.collect.common.ssh;

import java.util.Collections;
import java.util.HashSet;
import java.util.Set;

/**
 * Command blacklist
 */
public class CommonSshBlacklist {

    private static final Set<String> BLACKLIST;

    static {
        Set<String> tempSet = new HashSet<>();
        initializeDefaultBlacklist(tempSet);
        BLACKLIST = Collections.unmodifiableSet(tempSet);
    }

    private CommonSshBlacklist() {
        // Prevent instantiation
    }

    private static void initializeDefaultBlacklist(Set<String> blacklist) {
        // Adding default dangerous commands to blacklist
        blacklist.add("rm ");
        blacklist.add("mv ");
        blacklist.add("cp ");
        blacklist.add("ln ");
        blacklist.add("dd ");
        blacklist.add("tar ");
        blacklist.add("zip ");
        blacklist.add("bzip2 ");
        blacklist.add("bunzip2 ");
        blacklist.add("xz ");
        blacklist.add("unxz ");
        blacklist.add("kill ");
        blacklist.add("killall ");
        blacklist.add("reboot");
        blacklist.add("shutdown");
        blacklist.add("poweroff");
        blacklist.add("init 0");
        blacklist.add("init 6");
        blacklist.add("telinit 0");
        blacklist.add("telinit 6");
        blacklist.add("systemctl halt");
        blacklist.add("systemctl suspend");
        blacklist.add("systemctl hibernate");
        blacklist.add("service reboot");
        blacklist.add("service shutdown");
        blacklist.add("crontab -e");
        blacklist.add("visudo");
        blacklist.add("useradd");
        blacklist.add("userdel");
        blacklist.add("usermod");
        blacklist.add("groupadd");
        blacklist.add("groupdel");
        blacklist.add("groupmod");
        blacklist.add("passwd");
        blacklist.add("su ");
        blacklist.add("sudo ");
        blacklist.add("mount ");
        blacklist.add("parted");
        blacklist.add("mkpart");
        blacklist.add("partprobe");
        blacklist.add("iptables");
        blacklist.add("firewalld");
        blacklist.add("nft");
        blacklist.add("nc ");
        blacklist.add("netcat");
        blacklist.add("ssh ");
        blacklist.add("scp ");
        blacklist.add("rsync");
        blacklist.add("ftp ");
        blacklist.add("sftp ");
        blacklist.add("telnet ");
        blacklist.add("chmod ");
        blacklist.add("chattr ");
        blacklist.add("dd ");
        blacklist.add("mknod");
        blacklist.add("losetup");
        blacklist.add("cryptsetup");
    }

    public static boolean isCommandBlacklisted(String command) {
        if (command == null || command.trim().isEmpty()) {
            throw new IllegalArgumentException("Command cannot be null or empty");
        }
        String trimmedCommand = command.trim();
        return BLACKLIST.stream().anyMatch(trimmedCommand::contains);
    }

    public static Set<String> getBlacklist() {
        return BLACKLIST;
    }

}
