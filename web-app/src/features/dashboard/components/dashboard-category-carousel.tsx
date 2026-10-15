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

import { Button, Card, Tag } from 'antd';
import { Autoplay, Navigation, A11y } from 'swiper/modules';
import { Swiper, SwiperSlide } from 'swiper/react';
import 'swiper/css';
import 'swiper/css/navigation';
import { useTranslation } from 'react-i18next';
import { useId } from 'react';
import { OperationalStatePanel } from '@/shared/operational-page';
import type { DashboardCategory } from '../model/dashboard-category';
import styles from './dashboard-category-carousel.module.css';
export function DashboardCategoryCarousel({
  categories,
  kind
}: {
  categories: DashboardCategory[];
  kind: 'loading' | 'permission' | 'error' | 'ready';
}) {
  const { t } = useTranslation();
  const id = useId().replaceAll(':', '');
  if (kind !== 'ready')
    return (
      <OperationalStatePanel
        kind={kind}
        title={t(
          kind === 'loading'
            ? 'monitor.loading'
            : kind === 'permission'
              ? 'monitor.permission.title'
              : 'common.routeError.description'
        )}
      />
    );
  if (categories.length === 0) return null;
  return (
    <section className={styles.carousel} aria-label={t('dashboard.carousel.categories')}>
      <div className={styles.navigation}>
        <Button className={`previous-${id}`} aria-label={t('dashboard.carousel.previous')}>
          ‹
        </Button>
        <Button className={`next-${id}`} aria-label={t('dashboard.carousel.next')}>
          ›
        </Button>
      </div>
      <Swiper
        modules={[Navigation, Autoplay, A11y]}
        a11y={{ prevSlideMessage: t('dashboard.carousel.previous'), nextSlideMessage: t('dashboard.carousel.next') }}
        slidesPerView={1}
        spaceBetween={12}
        breakpoints={{ 700: { slidesPerView: 2 }, 1024: { slidesPerView: 4 } }}
        navigation={{ prevEl: `.previous-${id}`, nextEl: `.next-${id}` }}
        autoplay={categories.length > 4 ? { delay: 3000, pauseOnMouseEnter: true, disableOnInteraction: false } : false}
        rewind
        watchOverflow
        resizeObserver
      >
        {categories.map(category => (
          <SwiperSlide key={category.category}>
            <CategoryCard value={category} />
          </SwiperSlide>
        ))}
      </Swiper>
    </section>
  );
}
function CategoryCard({ value }: { value: DashboardCategory }) {
  const { t } = useTranslation();
  return (
    <Card size="small" className={styles.card!}>
      <strong>{t(`monitor.categories.${value.category}`, { defaultValue: value.category })}</strong>
      <div className={styles.total}>{value.total}</div>
      <div className={styles.status}>
        <Tag>
          {t('monitor.status.available')}: {value.available}
        </Tag>
        <Tag>
          {t('monitor.status.unavailable')}: {value.unavailable}
        </Tag>
        <Tag>
          {t('monitor.status.paused')}: {value.paused}
        </Tag>
      </div>
    </Card>
  );
}
