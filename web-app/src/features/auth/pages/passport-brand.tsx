/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements.  See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import styles from './login-page.module.css';

/** Keeps the product identity consistent across full passport pages and compact lock panels. */
export function PassportBrand({ variant = 'compact' }: { variant?: 'full' | 'compact' }) {
  if (variant === 'full') {
    return (
      <div className={styles.brandFull}>
        <img
          className={styles.brandLogoFull}
          src="/assets/hertzbeat-brand.svg"
          alt="HertzBeat"
          width={220}
          height={55}
        />
      </div>
    );
  }

  return (
    <div className={styles.brand}>
      <img className={styles.brandLogo} src="/assets/logo.svg" alt="HertzBeat" width={32} height={31} />
      <span className={styles.brandName} aria-hidden="true">
        HertzBeat
      </span>
    </div>
  );
}
