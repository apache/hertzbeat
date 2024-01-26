// Import.java

package org.dromara.hertzbeat.model;

import lombok.Data;

import java.util.List;

@Data
public class ImportBo {
    private String dashboard;
    private long folderId;
    private String folderUid;
    private List<Input> inputs;
    private boolean overwrite;
    private String path;
    private String pluginId;
    @Data
    public static class Input {
        private String name;
        private String pluginId;
        private String type;
        private String value;
    }
}


