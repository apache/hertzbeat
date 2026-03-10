import React from 'react';
import Head from '@docusaurus/Head';

export default function StructuredData() {
  const softwareSchema = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "Apache HertzBeat",
    "alternateName": "HertzBeat",
    "description": "An AI-powered, agentless open source real-time monitoring system. Unified metrics collection, log aggregation, alerting, and notification in a single platform.",
    "url": "https://hertzbeat.apache.org",
    "applicationCategory": "DeveloperApplication",
    "applicationSubCategory": "Monitoring Software",
    "operatingSystem": "Linux, macOS, Windows",
    "softwareVersion": "1.8.0",
    "releaseNotes": "https://github.com/apache/hertzbeat/releases/tag/1.8.0",
    "downloadUrl": "https://hertzbeat.apache.org/docs/download",
    "installUrl": "https://hertzbeat.apache.org/docs/start/quickstart",
    "license": "https://www.apache.org/licenses/LICENSE-2.0",
    "author": {
      "@type": "Organization",
      "name": "The Apache Software Foundation",
      "url": "https://www.apache.org/"
    },
    "publisher": {
      "@type": "Organization",
      "name": "The Apache Software Foundation",
      "url": "https://www.apache.org/",
      "logo": {
        "@type": "ImageObject",
        "url": "https://hertzbeat.apache.org/img/hertzbeat-brand.svg"
      }
    },
    "offers": {
      "@type": "Offer",
      "price": "0",
      "priceCurrency": "USD"
    },
    "screenshot": "https://hertzbeat.apache.org/img/home/0.png",
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "ratingCount": "1200",
      "bestRating": "5"
    },
    "featureList": [
      "Agentless monitoring - no agent installation required",
      "Monitor 200+ services including databases, servers, applications, networks",
      "AI-powered pattern detection and anomaly identification",
      "Custom monitoring templates via YML configuration",
      "Unified metrics, logs, alerts, and notifications platform",
      "Prometheus protocol compatible",
      "Multi-channel notifications (Email, Slack, Discord, Telegram, etc.)",
      "High performance clustering with horizontal scaling",
      "Cloud-edge collaboration for isolated networks",
      "Status page builder for service communication"
    ],
    "softwareRequirements": "Docker 20.10+ or Java 21+",
    "memoryRequirements": "4GB minimum, 8GB recommended",
    "processorRequirements": "2 CPU cores minimum",
    "storageRequirements": "10GB minimum"
  };

  const organizationSchema = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "Apache HertzBeat",
    "url": "https://hertzbeat.apache.org",
    "logo": "https://hertzbeat.apache.org/img/hertzbeat-brand.svg",
    "sameAs": [
      "https://github.com/apache/hertzbeat",
      "https://twitter.com/hertzbeat_",
      "https://discord.gg/Fb6M73htGr"
    ],
    "foundingDate": "2022",
    "founder": {
      "@type": "Organization",
      "name": "The Apache Software Foundation"
    },
    "parentOrganization": {
      "@type": "Organization",
      "name": "The Apache Software Foundation",
      "url": "https://www.apache.org/"
    }
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": "https://hertzbeat.apache.org"
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Documentation",
        "item": "https://hertzbeat.apache.org/docs/"
      },
      {
        "@type": "ListItem",
        "position": 3,
        "name": "Quick Start",
        "item": "https://hertzbeat.apache.org/docs/start/quickstart"
      }
    ]
  };

  return (
    <Head>
      <script type="application/ld+json">
        {JSON.stringify(softwareSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(organizationSchema)}
      </script>
      <script type="application/ld+json">
        {JSON.stringify(breadcrumbSchema)}
      </script>
    </Head>
  );
}
