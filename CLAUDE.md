# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Backend (Java/Spring Boot)
- **Build entire project**: `mvn clean install -DskipTests`
- **Run tests**: `mvn test`
- **Run specific module tests**: `mvn test -pl hertzbeat-manager`
- **Package application**: `mvn package -DskipTests`
- **Code quality checks**: `mvn checkstyle:check` (automatically runs in validate phase)
- **Test coverage**: `mvn jacoco:report` (coverage reports generated in target/site/jacoco)

### Frontend (Angular)
- **Install dependencies**: `cd web-app && yarn install`
- **Start development server**: `cd web-app && ng serve --proxy-config proxy.conf.json`
- **Build for production**: `cd web-app && npm run package`
- **Run tests**: `cd web-app && ng test`
- **Test coverage**: `cd web-app && ng test --code-coverage --watch=false`
- **Linting**: `cd web-app && npm run lint` (includes both TypeScript and style linting)

### Running Locally
1. **Backend**: 
   - Requires Java 17, Maven 3+, Lombok
   - Add VM option: `--add-opens=java.base/java.nio=org.apache.arrow.memory.core,ALL-UNNAMED`
   - Run main class: `org.apache.hertzbeat.manager.Manager`
2. **Frontend**: 
   - Requires Node.js >= 18, Yarn
   - Start backend first, then run: `ng serve --open`
   - Default login: admin/hertzbeat

## Architecture Overview

HertzBeat is a real-time monitoring system with agentless architecture, built using:

### Core Modules
- **hertzbeat-manager**: Main Spring Boot application (port 1157) - handles web UI, API, monitoring configuration
- **hertzbeat-collector**: Multi-module collector system with pluggable monitoring capabilities
  - `hertzbeat-collector-basic`: Basic monitoring implementations
  - `hertzbeat-collector-collector`: Core collection engine
  - `hertzbeat-collector-common`: Shared collector utilities
  - `hertzbeat-collector-mongodb/kafka/rocketmq/nebulagraph`: Database-specific collectors
- **hertzbeat-alerter**: Alert processing and notification system
- **hertzbeat-warehouse**: Data storage and querying layer
- **hertzbeat-common**: Shared utilities and constants
- **hertzbeat-remoting**: Communication layer between components
- **hertzbeat-push**: Notification delivery system
- **hertzbeat-plugin**: Plugin architecture for extensibility

### Frontend
- **web-app**: Angular 17 application with ng-alain framework
- Serves from `classpath:/dist/` (built frontend files)

### Key Technologies
- **Backend**: Java 17, Spring Boot 3.4.2, EclipseLink JPA, H2 database (default)
- **Frontend**: Angular 17, ng-alain, TypeScript
- **Build**: Maven, Yarn
- **Monitoring**: Prometheus-compatible, custom YML-based monitoring templates
- **Security**: Sureness framework for authentication/authorization

### Database Support
- Default: H2 (embedded)
- Supported: MySQL, PostgreSQL, Oracle, SQL Server, MongoDB, ClickHouse, IoTDB, TDengine, GreptimeDB

### Configuration
- Main config: `hertzbeat-manager/src/main/resources/application.yml`
- Database migrations: Flyway (locations: `classpath:db/migration/{vendor}`)
- Monitoring templates: YML files in `hertzbeat-manager/src/main/resources/define/`

## Development Guidelines

### Code Style
- Java: Checkstyle enforced (max line length: 200, specific suppression rules)
- Frontend: ESLint + Stylelint configured
- Commit format: `[module name or type name]feature or bugfix or doc: custom message`

### Testing
- Backend: JUnit 5, Spring Boot Test
- Frontend: Jasmine, Karma
- E2E tests available in `hertzbeat-e2e` module
- Coverage reporting via JaCoCo

### Key Patterns
- Monitoring types defined as configurable YML templates
- Pluggable collector architecture
- Alert expression evaluation with SQL-based rules
- Agentless monitoring using various protocols (HTTP, JMX, SSH, SNMP, JDBC, etc.)

### Database Schema
- Uses EclipseLink JPA with MySQL-compatible platform
- Flyway for database migrations
- Supports multiple database vendors through vendor-specific migration scripts