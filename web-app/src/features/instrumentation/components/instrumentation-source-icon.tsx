/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0.
 */

import {
  ApiOutlined,
  CloudOutlined,
  CodeOutlined,
  DatabaseOutlined,
  DesktopOutlined,
  FileTextOutlined,
  ThunderboltOutlined
} from '@ant-design/icons';
import appleIcon from 'devicon/icons/apple/apple-original.svg';
import kafkaIcon from 'devicon/icons/apachekafka/apachekafka-original.svg';
import azureIcon from 'devicon/icons/azure/azure-original.svg';
import cppIcon from 'devicon/icons/cplusplus/cplusplus-original.svg';
import dockerIcon from 'devicon/icons/docker/docker-original.svg';
import dotnetIcon from 'devicon/icons/dotnetcore/dotnetcore-original.svg';
import goIcon from 'devicon/icons/go/go-original.svg';
import googleCloudIcon from 'devicon/icons/googlecloud/googlecloud-original.svg';
import javaIcon from 'devicon/icons/java/java-original.svg';
import kubernetesIcon from 'devicon/icons/kubernetes/kubernetes-original.svg';
import linuxIcon from 'devicon/icons/linux/linux-original.svg';
import mongodbIcon from 'devicon/icons/mongodb/mongodb-original.svg';
import mysqlIcon from 'devicon/icons/mysql/mysql-original.svg';
import nginxIcon from 'devicon/icons/nginx/nginx-original.svg';
import nodeIcon from 'devicon/icons/nodejs/nodejs-original.svg';
import phpIcon from 'devicon/icons/php/php-original.svg';
import postgresqlIcon from 'devicon/icons/postgresql/postgresql-original.svg';
import pythonIcon from 'devicon/icons/python/python-original.svg';
import rabbitmqIcon from 'devicon/icons/rabbitmq/rabbitmq-original.svg';
import redisIcon from 'devicon/icons/redis/redis-original.svg';
import rubyIcon from 'devicon/icons/ruby/ruby-original.svg';
import rustIcon from 'devicon/icons/rust/rust-original.svg';
import springIcon from 'devicon/icons/spring/spring-original.svg';
import swiftIcon from 'devicon/icons/swift/swift-original.svg';
import windowsIcon from 'devicon/icons/windows11/windows11-original.svg';

import type { SourceEntry } from '../model/instrumentation-v2-contract';
import styles from './instrumentation-shell.module.css';

const branded: Record<string, string> = {
  java: javaIcon,
  dotnet: dotnetIcon,
  nodejs: nodeIcon,
  python: pythonIcon,
  php: phpIcon,
  go: goIcon,
  ruby: rubyIcon,
  rust: rustIcon,
  swift: swiftIcon,
  cpp: cppIcon,
  docker: dockerIcon,
  kubernetes: kubernetesIcon,
  nginx: nginxIcon,
  postgresql: postgresqlIcon,
  mysql: mysqlIcon,
  redis: redisIcon,
  mongodb: mongodbIcon,
  kafka: kafkaIcon,
  rabbitmq: rabbitmqIcon,
  'azure-vm': azureIcon,
  'azure-aks': azureIcon,
  'gcp-compute-engine': googleCloudIcon,
  'gcp-gke': googleCloudIcon
};

export function InstrumentationSourceIcon({ source }: { source: SourceEntry }) {
  const image = branded[source.iconKey];
  if (image) return <img className={styles.sourceIcon} src={image} alt="" aria-hidden="true" />;
  return genericIcon(source);
}

export function InstrumentationChoiceIcon({ value }: { value: string }) {
  const image = choiceIcons[value];
  if (image) return <img className={styles.choiceIcon} src={image} alt="" aria-hidden="true" />;
  const Icon = value === 'vm' ? DesktopOutlined : CodeOutlined;
  return <Icon className={styles.choiceIcon} aria-hidden="true" />;
}

const choiceIcons: Record<string, string> = {
  spring_boot: springIcon,
  java_jar: javaIcon,
  docker: dockerIcon,
  kubernetes: kubernetesIcon,
  linux_amd64: linuxIcon,
  linux_arm64: linuxIcon,
  macos_amd64: appleIcon,
  macos_arm64: appleIcon,
  windows_amd64: windowsIcon,
  windows_service: windowsIcon
};

function genericIcon(source: SourceEntry) {
  const props = { className: styles.sourceIcon, 'aria-hidden': true };
  if (source.groupIds.includes('cloud')) return <CloudOutlined {...props} />;
  if (source.groupIds.includes('databases')) return <DatabaseOutlined {...props} />;
  if (source.groupIds.includes('logs')) return <FileTextOutlined {...props} />;
  if (source.groupIds.includes('applications')) return <CodeOutlined {...props} />;
  if (source.groupIds.includes('quick_start')) return <ThunderboltOutlined {...props} />;
  return <ApiOutlined {...props} />;
}
