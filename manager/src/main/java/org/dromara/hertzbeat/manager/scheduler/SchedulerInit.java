@Configuration
@Order(value = Ordered.LOWEST_PRECEDENCE - 1)
@Slf4j
public class SchedulerInit implements CommandLineRunner {

    // ... (other fields and methods)

    @Override
    public void run(String... args) {
        initializeCollectors();
        initializeMainCollectorNode();
        initializeJobs();
    }

    private void initializeCollectors() {
        List<Collector> collectors = collectorDao.findAll().stream()
                .peek(item -> item.setStatus(CommonConstants.COLLECTOR_STATUS_OFFLINE))
                .collect(Collectors.toList());
        collectorDao.saveAll(collectors);
    }

    private void initializeMainCollectorNode() {
        CollectorInfo collectorInfo = CollectorInfo.builder()
                .name(CommonConstants.MAIN_COLLECTOR_NODE)
                .ip(MAIN_COLLECTOR_NODE_IP)
                .build();
        collectorScheduling.collectorGoOnline(CommonConstants.MAIN_COLLECTOR_NODE, collectorInfo);
    }

    private void initializeJobs() {
        List<Monitor> monitors = monitorDao.findMonitorsByStatusNotInAndAndJobIdNotNull(Arrays.asList((byte) 0, (byte) 4));
        Map<Long, String> monitorIdCollectorMap = collectorMonitorBindDao.findAll().stream()
                .collect(Collectors.toMap(CollectorMonitorBind::getMonitorId, CollectorMonitorBind::getCollector));

        for (Monitor monitor : monitors) {
            initializeJobForMonitor(monitor, monitorIdCollectorMap);
        }
    }

    private void initializeJobForMonitor(Monitor monitor, Map<Long, String> monitorIdCollectorMap) {
        try {
            Job appDefine = createJobFromMonitor(monitor);
            String collector = monitorIdCollectorMap.get(monitor.getId());
            long jobId = collectJobScheduling.addAsyncCollectJob(appDefine, collector);
            monitor.setJobId(jobId);
            monitorDao.save(monitor);
        } catch (Exception e) {
            log.error("init monitor job: {} error,continue next monitor", monitor, e);
        }
    }

    private Job createJobFromMonitor(Monitor monitor) {
        Job appDefine = appService.getAppDefine(monitor.getApp());
        appDefine.setId(monitor.getJobId());
        appDefine.setMonitorId(monitor.getId());
        appDefine.setInterval(monitor.getIntervals());
        appDefine.setCyclic(true);
        appDefine.setTimestamp(System.currentTimeMillis());

        List<Param> params = paramDao.findParamsByMonitorId(monitor.getId());
        List<Configmap> configmaps = createConfigMapFromParams(params, appDefine.getParams());
        appDefine.setConfigmap(configmaps);

        return appDefine;
    }

    private List<Configmap> createConfigMapFromParams(List<Param> params, List<ParamDefine> paramDefines) {
        List<Configmap> configmaps = params.stream()
                .map(param -> new Configmap(param.getField(), param.getValue(), param.getType()))
                .collect(Collectors.toList());

        List<ParamDefine> paramDefaultValue = paramDefines.stream()
                .filter(item -> StringUtils.hasText(item.getDefaultValue()))
                .collect(Collectors.toList());

        paramDefaultValue.forEach(defaultVar -> {
            if (configmaps.stream().noneMatch(item -> item.getKey().equals(defaultVar.getField()))) {
                Configmap configmap = new Configmap(defaultVar.getField(), defaultVar.getDefaultValue(), (byte) 1);
                configmaps.add(configmap);
            }
        });

        return configmaps;
    }

    // ... (other methods and classes)
}
