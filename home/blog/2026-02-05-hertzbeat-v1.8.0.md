---
title: Announcement of Apache HertzBeat™ 1.8.0 Release
author: Apache HertzBeat Community
author_title: Apache HertzBeat Community
author_url: https://github.com/apache/hertzbeat
tags: [opensource, release, v1.8.0]
keywords: [open source monitoring system, alerting system, HertzBeat, release, v1.8.0, Apache]
---

Dear Community Members,

We are excited to announce the official release of Apache HertzBeat™ 1.8.0! This major release brings significant enhancements including AI-powered features, expanded monitoring capabilities, improved performance, and stronger community contributions.

## Downloads and Documentation

- **Apache HertzBeat™ 1.8.0 Download Link**: [https://hertzbeat.apache.org/docs/download](https://hertzbeat.apache.org/docs/download)
- **Apache HertzBeat™ Documentation**: [https://hertzbeat.apache.org/docs/](https://hertzbeat.apache.org/docs/)
- **Release Notes**: [https://github.com/apache/hertzbeat/releases/tag/1.8.0](https://github.com/apache/hertzbeat/releases/tag/1.8.0)

## 🚀 Major Updates

### New Features and Enhancements

#### AI-Powered Monitoring & Chat Interface

- **GSOC Chat UI**: Implemented comprehensive chat interface with conversation management and OpenAI chat client support (#3679)
- **Cross-Service Tools**: Added necessary AI-powered tools across all monitoring services (#3722)
- **MCP Server**: Implemented Model Context Protocol server to securely run scripts and commands (#3547)

#### Expanded Monitoring Support

- **QuestDB Integration**: Added QuestDB as a Time Series Database Storage option (#3731)
- **Dell iDRAC Monitoring**: Added configuration file for Dell iDRAC server monitoring (#3763)
- **Apollo Configuration Center**: Added support for Apollo configuration center monitoring (#3768)
- **Jenkins Monitoring**: Added comprehensive Jenkins monitoring capabilities (#3774)
- **DNS Record Types**: Enhanced DNS monitoring with additional record types (#3799)

#### Enhanced User Experience

- **Dashboard Optimization**: Completely redesigned dashboard page with new theme adaptation (#3730)
- **Indicator Favorites**: Added monitoring center indicator favorites feature for quick access (#3735)
- **Label Selector Component**: Implemented optimized label-selector component for better label management (#3762)
- **RISC-V Support**: Added RISC-V architecture support with Dockerfile modifications (#3713)

#### Log Monitoring Capabilities

- **OSPP Log Monitoring**: Implemented comprehensive log monitoring capabilities with advanced parsing and alerting (#3673)

### Performance Improvements

#### Prometheus Integration

- **Streaming Parsing**: Enhanced Prometheus streaming parsing with CRLF support (#3745)
- **Parsing Optimization**: Multiple rounds of Prometheus streaming parsing optimization (#3752, #3761)
- **Gretimedb Optimization**: Optimized Gretimedb time-series statistics (#3776)

#### System Performance

- **SSE Exception Handling**: Improved Server-Sent Events exception handling (#3775)
- **Threshold Rules**: Enhanced threshold rules operations and expression log output (#3780)
- **Query Parameter Handling**: Fixed Long.parseLong() errors when search parameters are floats (#3483)

### Bug Fixes and Stability

#### Core System Fixes

- **Default Path Whitelist**: Fixed issue where default path did not match whitelist (#3740)
- **Webhook URL Parameters**: Fixed missing webhook URL query parameters (#3779)
- **Service Discovery**: Fixed service discovery host field NullPointerException (#3767)
- **Database Migration**: Removed v174 and added v180 Flyway scripts (#3787)

#### Configuration and Deployment

- **AI Configuration Sync**: Fixed AI-related configuration synchronization for Docker Compose (#3751)
- **CNCF Link Update**: Updated CNCF link to current location (#3746)

### Documentation and Internationalization

#### Enhanced Documentation

- **RISC-V Documentation**: Added RISC-V related help documentation (#3712)
- **Japanese i18n**: Added Japanese internationalization support for iDRAC monitoring (#3766)
- **Release Documentation**: Updated documentation for release process and added 1.7.3 release notes (#3749)
- **Contributor Updates**: Regular contributor documentation updates (#3759, #3783)

#### UI/UX Improvements

- **Styling Issues**: Resolved various styling issues across the application (#3734)
- **Apache Branding**: Replaced logos with new ASF branding (#3770)
- **Localization**: Improved localization with nitpicking on en-US.json (#3800)

## 🌟 Community Growth

### New Contributors

We're thrilled to welcome 16 new contributors to the Apache HertzBeat community:

- @cxhello
- @yexuanyang
- @mengnankkkk
- @jl15988
- @dedyks
- @pentium100
- @AlbertYang0801
- @warrobe
- @Jetiaime
- @P-Peaceful
- @zhaoyangplus
- @KOYR
- @Lathika226
- @Sahil-Shadwal
- @Prakash1185
- @BhanuNidumolu

### Program Contributions

- **GSOC (Google Summer of Code)**: Significant contributions in chat interface and AI features
- **OSPP (Open Source Promotion Plan)**: Major contributions in RISC-V support, MCP server, and log monitoring

## 📊 Statistics

This release includes:

- **40+ Pull Requests** merged
- **16 New Contributors** joined the community
- **5 Major Features** added
- **20+ Bug Fixes** resolved
- **Multiple Performance Improvements**

## 🔄 Upgrade Instructions

### From v1.7.x to v1.8.0

#### Docker Deployment

```bash
# Stop existing container
docker stop hertzbeat

# Remove old container
docker rm hertzbeat

# Pull new version
docker pull apache/hertzbeat:1.8.0

# Run new container
docker run -d -p 1157:1157 -p 1158:1158 --name hertzbeat apache/hertzbeat:1.8.0
```

#### Package Deployment

1. Download v1.8.0 package from [download page](https://hertzbeat.apache.org/docs/download)
2. Backup your existing configuration
3. Extract new package and replace installation
4. Update configuration if needed
5. Restart HertzBeat service

#### Kubernetes/Helm Deployment

Update your Helm chart to use the new version:

```yaml
image:
  tag: "1.8.0"
```

## 🚨 Important Notes

- **Database Migration**: This release includes database schema changes. Ensure proper backup before upgrading
- **Configuration Changes**: Some AI-related configurations may need to be updated
- **Breaking Changes**: Review the changelog for any breaking changes affecting your deployment

## 🔮 What's Next

The Apache HertzBeat community is already working on future releases with:

- Enhanced AI capabilities
- More monitoring integrations
- Performance optimizations
- Improved user experience

## 🙏 Acknowledgments

We extend our heartfelt gratitude to all contributors who made this release possible:

- All code contributors who submitted pull requests
- Community members who reported issues and provided feedback
- Documentation writers and translators
- Testers who helped ensure quality
- The Apache Software Foundation for their continued support

## 📞 Get Involved

- **GitHub**: [https://github.com/apache/hertzbeat](https://github.com/apache/hertzbeat)
- **Mailing Lists**: [https://hertzbeat.apache.org/docs/community/mailing_lists](https://hertzbeat.apache.org/docs/community/mailing_lists)
- **Discord**: [https://discord.gg/Fb6M73htGr](https://discord.gg/Fb6M73htGr)
- **Documentation**: [https://hertzbeat.apache.org/docs/](https://hertzbeat.apache.org/docs/)

## 📋 Full Changelog

For a complete list of changes, please refer to the [full changelog](https://github.com/apache/hertzbeat/compare/v1.7.3...1.8.0).

---

**Download Apache HertzBeat™ 1.8.0 today and experience the power of AI-driven monitoring!**

*Apache HertzBeat, the Apache feather logo, and the HertzBeat name are trademarks of The Apache Software Foundation.*
