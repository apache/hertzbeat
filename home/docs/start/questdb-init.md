---

id: questdb-init

title: Installation and Initialization of Time-Series Database Service QuestDB (Optional)

sidebar_label: Metric Data Storage - QuestDB

---



The historical data storage of Apache HertzBeat™ relies on a time-series database. You can choose to install and initialize **one** of the supported databases, or skip the installation (⚠️ However, it is strongly recommended to configure one in the production environment).

> We recommend using and providing long-term support for VictoriaMetrics as the storage solution.

QuestDB is an open-source time-series database that stands out in the field of time-series data processing due to its high performance and low latency. We use it to store and analyze the collected historical monitoring metric data.

**⚠️ Note: Configuring a time-series database is optional, but it is strongly recommended for production environments to ensure more comprehensive historical chart functions, high performance, and stability.**

**⚠️ If no time-series database is configured, only the historical data of the last hour will be retained.**

> If you already have an existing QuestDB environment, you can skip directly to the YML configuration step.

### Install QuestDB

1. Download the installation package

​	Download the latest version for your operating system from the official GitHub repository:

```shell
# For Linux/macOS (taking v7.3.9 as an example; replace with the latest version number)
wget https://github.com/questdb/questdb/releases/download/7.3.9/questdb-7.3.9-no-jre-bin.tar.gz

# Extract the package
tar -zxvf questdb-7.3.9-no-jre-bin.tar.gz
mv questdb-7.3.9 /opt/questdb  # Move to a common directory
```

​	For Windows users:

​	Download the zip package and extract it to C:\questdb or a custom directory.

2. Start QuestDB

```shell
# For Linux/macOS: Navigate to the installation directory and start the service
cd /opt/questdb/bin
./questdb start

# For Windows (Command Prompt):
cd C:\questdb\bin
questdb.exe start
```

3. Set up access password

​	QuestDB enables authentication through a configuration file, which needs to be modified manually.

​	Edit the configuration file:

```shell
# For Linux/macOS
vi /opt/questdb/conf/server.conf

# For Windows
notepad C:\questdb\conf\server.conf
```

​	Enable authentication and configure the password:

```shell
# Enable authentication (disabled by default)
http.security.enabled=true
pg.security.enabled=true  # PostgreSQL protocol authentication

# Set admin account and password (customize as needed)
http.security.admin.username=admin
http.security.admin.password=YourStrongPassword123!

# Optional: Restrict Web Console access to specific IPs (e.g., local access only)
http.bind.to=127.0.0.1:9000
```

​	Restart QuestDB for the changes to take effect:

```shell
# For Linux/macOS
./questdb stop
./questdb start

# For Windows
questdb.exe stop
questdb.exe start
```

4. Configure QuestDB connection in HertzBeat's application.yml file

​	Modify HertzBeat's configuration file

​	Locate and edit the configuration file at hertzbeat/config/application.yml

​	⚠️ Note: For Docker container deployment, you need to mount the application.yml file to the host machine. For the installation package deployment, simply extract the package and modify the file at hertzbeat/config/application.yml.

​	**Set the** **warehouse.store.jpa.enabled** **parameter to** **false****, configure the** **warehouse.store.questdb** **data source parameters (HOST, username, password, etc.), and set** **enabled** **to** **true** **to enable QuestDB.**

```yaml
warehouse:
  store:
    # Disable the default JPA
    jpa:
      enabled: false
    # Enable QuestDB
    questdb:
      enabled: true
      url: localhost:9000
      username: admin
      password: quest
```

Parameter Description:

| Parameter Name | Description                    |
| -------------- | ------------------------------ |
| enabled        | Whether to enable QuestDB      |
| url            | QuestDB server URL (host:port) |
| username       | QuestDB database account       |
| password       | QuestDB database password      |

> **Note:** Due to QuestDB's architectural design, if you need to set an expiration time for data, you can configure it in QuestDB's configuration file server.conf:

```shell
cairo.default.ttl=30d
```

5. Restart HertzBeat