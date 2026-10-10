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

import { useTranslation } from 'react-i18next';

import styles from './login-page.module.css';
import { usePassportIntroductionMotion } from './passport-introduction-motion';

export {
  PASSPORT_INTRODUCTION_HOLD_MS,
  PASSPORT_INTRODUCTION_ROLL_MS,
  PASSPORT_INTRODUCTION_TYPE_MS
} from './passport-introduction-motion';

const INTRODUCTION_KEYS = [
  'auth.passport.capability1',
  'auth.passport.capability2',
  'auth.passport.capability3',
  'auth.passport.capability4',
  'auth.passport.capability5',
  'auth.passport.capability6',
  'auth.passport.introductionAiAutomation'
] as const;

/** Keeps the login introduction calm, replaceable, and independent from authentication state. */
export function PassportIntroduction() {
  const { t } = useTranslation();
  const motion = usePassportIntroductionMotion(INTRODUCTION_KEYS.map(key => t(key)));
  return (
    <section
      className={styles.introduction}
      data-testid="passport-introduction"
      aria-labelledby="passport-introduction-title"
    >
      <h1 id="passport-introduction-title" className={styles.screenReaderOnly}>
        {t('auth.passport.accessibleSummary')}
      </h1>
      <div className={styles.introductionHeading} aria-hidden="true">
        <img
          className={styles.introductionBrand}
          src="/assets/hertzbeat-brand-white.svg"
          alt=""
          aria-hidden="true"
          width={280}
          height={70}
          data-testid="passport-introduction-brand"
        />
        <span className={styles.introductionPositioning} data-testid="passport-introduction-positioning">
          {t('auth.passport.description')}
        </span>
        <PassportIntroductionPhrase {...motion} />
      </div>
    </section>
  );
}

function PassportIntroductionPhrase(props: ReturnType<typeof usePassportIntroductionMotion>) {
  const { currentPhrase, fittedFontSize, measureRef, phase, reducedMotion, stageRef, visiblePhrase } = props;
  const typingClass = `${styles.introductionTypingLine} ${phase === 'rolling' ? styles.introductionRollOut : ''}`;
  return (
    <span
      ref={stageRef}
      className={styles.introductionPhraseStage}
      data-testid="passport-introduction-stage"
      data-typewriter-phase={phase}
    >
      <span className={typingClass} style={{ fontSize: fittedFontSize }}>
        <span className={styles.introductionPhrase} data-testid="passport-introduction-phrase">
          {visiblePhrase}
        </span>
        {!reducedMotion && (
          <span aria-hidden="true" className={styles.introductionCursor} data-testid="passport-introduction-cursor" />
        )}
      </span>
      {phase === 'rolling' && (
        <span
          className={`${styles.introductionTypingLine} ${styles.introductionRollIn}`}
          style={{ fontSize: fittedFontSize }}
        >
          <span aria-hidden="true" className={styles.introductionCursor} />
        </span>
      )}
      <span
        ref={measureRef}
        aria-hidden="true"
        className={styles.introductionMeasure}
        data-testid="passport-introduction-measure"
      >
        {currentPhrase}
      </span>
    </span>
  );
}
