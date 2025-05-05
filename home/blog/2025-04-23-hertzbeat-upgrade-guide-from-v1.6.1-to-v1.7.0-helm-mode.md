# HertzBeat Upgrade Guide from v1.6.1 to v1.7.0 (Helm Mode)

## 1. Prerequisites

1. Ensure the following tools are installed:
   - Helm 3.x
   - kubectl
   - Git (optional)

2. Verify current deployment information:

   ```bash
   helm list -n <your-namespace>
   # If the old chart package is missing, export values.yaml with:
   helm get values hertzbeat -n <your-namespace> > hertzbeat-1.6.1-values.yaml
   ```

3. Data Backup:

> **For custom monitoring templates:**
>
> - Backup `/opt/hertzbeat/define` from the running pod:
>
>   ```bash
>   kubectl cp hertzbeat/hertzbeat-978477f84-fr894:/opt/hertzbeat/define ./define
>   ```
>
> **For external databases (MySQL/PostgreSQL):**
>
> - Use `mysqldump`/`pg_dump` or copy PVC directories:
>
>   ```bash
>   kubectl get pvc -n hertzbeat
>   ```

## 2. Upgrade Steps

### 1. Pull the latest Chart

```bash
helm repo update
helm pull hertzbeat/hertzbeat --version 1.7.0 --untar
cd hertzbeat
```

Or clone from GitHub:

```bash
git clone https://github.com/hertzbeat/helm-charts.git
cd helm-charts/charts/hertzbeat
```

### 2. Update values.yaml

Compare and merge configurations:

```bash
diff -u ../hertzbeat-1.6.1-values.yaml values.yaml
# Use vimdiff to compare and merge changes
```

Key configurations to check:

- `image.tag`
- `resources`
- `persistence`
- `service.type`
- Ingress settings
- External database configurations

### 3. Dry-run Upgrade

```bash
helm upgrade hertzbeat . -n <your-namespace> \
  --values values.yaml \
  --dry-run \
  --debug
```

### 4. Execute Upgrade

```bash
helm upgrade hertzbeat . -n <your-namespace> \
  --values values.yaml \
  --atomic \          # Auto-rollback on failure
  --timeout 10m       # Set timeout
```

### 5. Verify Upgrade

```bash
helm status hertzbeat -n <your-namespace>
kubectl get pods -n <your-namespace> -l app.kubernetes.io/instance=hertzbeat
kubectl logs -n <your-namespace> -l app.kubernetes.io/instance=hertzbeat --tail=100
```
