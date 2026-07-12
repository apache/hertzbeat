/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Layout } from 'antd';
import { Outlet } from 'react-router-dom';

import styles from './BasicLayout.module.css';

const { Content, Header, Sider } = Layout;

export function BasicLayout() {
  return (
    <Layout className={styles.root}>
      <Header className={styles.header}>
        <strong className={styles.brand}>HertzBeat</strong>
      </Header>
      <Layout>
        <Sider className={styles.sider} width={220} aria-label="Primary navigation" />
        <Content className={styles.content}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
