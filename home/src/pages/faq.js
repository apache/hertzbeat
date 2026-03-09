import React from 'react';
import Layout from '@theme/Layout';
import FAQSchema from '../components/FAQSchema';
import styles from './styles.module.css';

const faqs = [
  {
    question: "What is Apache HertzBeat?",
    answer: "Apache HertzBeat is an AI-powered, agentless open source real-time monitoring system. It unifies metrics collection, log aggregation, alerting, and notification in a single platform without requiring agent installation."
  },
  {
    question: "Does HertzBeat require agent installation?",
    answer: "No. HertzBeat uses agentless monitoring via native protocols (HTTP, SNMP, JMX, SSH, JDBC). You only need to provide IP, port, and credentials through the web interface."
  },
  {
    question: "How do I install HertzBeat?",
    answer: "Run this single Docker command: docker run -d -p 1157:1157 -p 1158:1158 --name hertzbeat apache/hertzbeat. Then access http://localhost:1157 with default credentials admin/hertzbeat."
  },
  {
    question: "What systems can HertzBeat monitor?",
    answer: "HertzBeat monitors 200+ services including databases (MySQL, PostgreSQL, MongoDB, Redis, Oracle, SQL Server), operating systems (Linux, Windows, Unix), middleware (Tomcat, Kafka, Zookeeper, RabbitMQ, Nginx), cloud (Kubernetes, Docker), and networks (Cisco, Huawei, HPE switches)."
  },
  {
    question: "Can I create custom monitoring templates?",
    answer: "Yes. Create YML templates via the web UI to monitor any service. Templates define metrics, collection protocols, and thresholds without coding."
  },
  {
    question: "Is HertzBeat compatible with Prometheus?",
    answer: "Yes. HertzBeat supports Prometheus protocol and can collect metrics from Prometheus exporters."
  },
  {
    question: "How does HertzBeat compare to Prometheus + Grafana?",
    answer: "HertzBeat provides a unified platform including collection, alerting, and notifications. Prometheus + Grafana requires separate components for alerts (Alertmanager) and lacks built-in multi-channel notifications."
  },
  {
    question: "What notification channels does HertzBeat support?",
    answer: "Email, Discord, Slack, Telegram, DingTalk, WeChat, FeiShu, SMS, and Webhook."
  },
  {
    question: "Can HertzBeat scale for large deployments?",
    answer: "Yes. Deploy collector clusters for horizontal scaling. Collectors auto-balance tasks and provide failover for high availability."
  },
  {
    question: "What license does HertzBeat use?",
    answer: "Apache License 2.0. HertzBeat is completely open source with no monitoring limits or license restrictions."
  },
  {
    question: "What are HertzBeat's system requirements?",
    answer: "Minimum: 2 CPU cores, 4GB RAM (8GB recommended), 10GB disk space, Docker 20.10+ or Java 21+. Supported on Linux, macOS, Windows."
  },
  {
    question: "How do I upgrade HertzBeat?",
    answer: "For Docker: stop and remove the old container, pull the latest image, and run a new container. For package installations, download the new version, backup your configuration, and replace the installation directory."
  },
  {
    question: "What database does HertzBeat use?",
    answer: "HertzBeat uses H2 embedded database by default. For production, configure external databases: MySQL or PostgreSQL for metadata, VictoriaMetrics, IoTDB, TDengine, or InfluxDB for time-series data."
  },
  {
    question: "Can HertzBeat monitor isolated networks?",
    answer: "Yes, through cloud-edge collaboration. Deploy edge collectors in isolated networks that report to the centralized HertzBeat server for unified management."
  },
  {
    question: "Does HertzBeat have a status page feature?",
    answer: "Yes. HertzBeat includes a status page builder to create public status pages (similar to GitHub Status) that communicate service availability to users."
  },
  {
    question: "How often is HertzBeat updated?",
    answer: "HertzBeat releases new versions approximately every 2-3 months with bug fixes, security patches, and new features."
  },
  {
    question: "Is HertzBeat production-ready?",
    answer: "Yes. HertzBeat is an Apache Software Foundation project used in production by many organizations. It supports high-performance clustering and has been included in the CNCF Observability Landscape."
  },
  {
    question: "Can I contribute to HertzBeat?",
    answer: "Yes. HertzBeat is open source under Apache License 2.0. Contributions are welcome through GitHub pull requests, documentation improvements, bug reports, and feature suggestions."
  }
];

export default function FAQ() {
  return (
    <>
      <FAQSchema faqs={faqs} />
      <Layout
        title="Frequently Asked Questions - Apache HertzBeat"
        description="Common questions and answers about Apache HertzBeat monitoring system - installation, features, compatibility, and usage."
      >
        <main className="container margin-vert--lg">
          <div className="row">
            <div className="col col--8 col--offset-2">
              <h1>Frequently Asked Questions</h1>
              <p className="margin-bottom--lg">
                Common questions about Apache HertzBeat monitoring system. Can't find your answer? 
                Visit our <a href="/docs/community/contact">community page</a> for support.
              </p>

              {faqs.map((faq, index) => (
                <div key={index} className="margin-bottom--lg">
                  <h2 id={`faq-${index}`}>{faq.question}</h2>
                  <p>{faq.answer}</p>
                </div>
              ))}

              <div className="margin-top--xl">
                <h2>Still have questions?</h2>
                <p>
                  <strong>Documentation:</strong> <a href="/docs/">https://hertzbeat.apache.org/docs/</a>
                </p>
                <p>
                  <strong>GitHub Discussions:</strong> <a href="https://github.com/apache/hertzbeat/discussions">https://github.com/apache/hertzbeat/discussions</a>
                </p>
                <p>
                  <strong>Community:</strong> <a href="/docs/community/contact">Contact us</a>
                </p>
              </div>
            </div>
          </div>
        </main>
      </Layout>
    </>
  );
}
