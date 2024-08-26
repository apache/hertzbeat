package org.apache.hertzbeat.plugin;

import org.apache.hertzbeat.common.entity.alerter.Alert;
import org.apache.hertzbeat.common.entity.job.Configmap;
import org.apache.hertzbeat.common.util.JsonUtil;

import java.util.List;

public class PluginImpl  implements  Plugin{
    @Override
    public void alert(Alert alert) {
        System.out.println("alert");
    }

    @Override
    public void alert(Alert alert, List<Configmap> params) {
        System.out.println("alert" + JsonUtil.toJson(params));

    }
}
