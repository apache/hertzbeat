# HertzBeat 从 1.6.1 版本升级到 1.7.0 版本指引-(Helm Mode)

## 1. 前置准备

1. 确保已安装以下工具:

   - Helm 3.x
   - kubectl
   - Git (可选)

2. 确认当前部署信息:

   ```bash
   helm list -n <your-namespace>
   # 如果你老版本的chart包不见了，可以使用以下命令导出values.yaml文件
   helm get values hertzbeat -n <your-namespace> > hertzbeat-1.6.1-values.yaml
   ```

3. 数据备份

> 1. 若使用了自定义监控模板
>
>    - 需要备份 `kubectl cp hertzbeat/hertzbeat-978477f84-fr894:/opt/hertzbeat/define ./define` 当前运行 pod里面的 `/opt/hertzbeat/define` 目录到当前主机下,如果做了持久化 请拷贝持久化目录
>    - `kubectl cp hertzbeat/hertzbeat-978477f84-fr894:/opt/hertzbeat/define ./define`
>
> 2. 若使用外置关系型数据库 Mysql, PostgreSQL数据
>
>    - 一般使用helm部署部署都做了持久化，可以选择拷贝持久化目录，也可以通过mysqldump、pgdump等工具完成备份
>
>    ```bash
>     kubectl get pvc -n hertzbeat
>    NAME                 STATUS   VOLUME                                     CAPACITY   ACCESS MODES   STORAGECLASS   AGE
>    hertzbeat-database   Bound    pvc-c63cf479-0033-423b-8466-eb00aa181657   4Gi        RWO            standard       68d
>    hertzbeat-ext-lib    Bound    pvc-31fee163-1211-424f-8966-e3e805c23ff5   1Gi        RWX            standard       68d
>    hertzbeat-tsdb       Bound    pvc-4f2ef614-0302-4a4c-8dd4-e68b34e9061c   4Gi        RWO            standard       68d
>    ```

## 2. 升级步骤

### 1. 拉取最新Chart到本地

```bash
helm repo update
helm pull hertzbeat/hertzbeat --version 1.7.0 --untar
cd hertzbeat
```

或者从GitHub仓库获取(按需修改Chart):

```bash
git clone https://github.com/hertzbeat/helm-charts.git
cd helm-charts/charts/hertzbeat
```

### 2. 修改values.yaml

比较并合并您的自定义配置到新版本values.yaml:

```bash
# 使用diff工具比较新旧values文件
diff -u ../hertzbeat-1.6.1-values.yaml values.yaml
vimdiff 对着修改，改完继续diff，无输出则正常
```

常见需要关注的配置项:

- 镜像版本: `image.tag`
- 资源限制: `resources`
- 持久化配置: `persistence`
- 服务类型: `service.type`
- Ingress配置
- 数据库配置(如果使用外部数据库)

### 3. 测试升级(干运行)

```bash
helm upgrade hertzbeat . -n <your-namespace> \
  --values values.yaml \
  --dry-run \
  --debug
```

### 4. 执行升级

```bash
helm upgrade hertzbeat . -n <your-namespace> \
  --values values.yaml \
  --atomic \          # 升级失败自动回滚
  --timeout 10m       # 设置超时时间
```

### 5. 验证升级

```bash
# 检查发布状态
helm status hertzbeat -n <your-namespace>

# 检查Pod状态
kubectl get pods -n <your-namespace> -l app.kubernetes.io/instance=hertzbeat

# 检查日志
kubectl logs -n <your-namespace> -l app.kubernetes.io/instance=hertzbeat --tail=100
```
