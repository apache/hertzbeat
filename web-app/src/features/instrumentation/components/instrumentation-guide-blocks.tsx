/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the License for the specific language
 * governing permissions and limitations under the License.
 */

import { Alert, App, Button, Descriptions, Input, Space, Tag, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import type { GuideBlock, RenderResponse } from '../model/instrumentation-v2-contract';
import { translateBackend } from './instrumentation-i18n';
import styles from './instrumentation-guide.module.css';

export function InstrumentationGuideBlocks(props: {
  guide: RenderResponse;
  token: string;
  onToken: (value: string) => void;
  onCopy: (block: GuideBlock) => Promise<void>;
  onDetect: () => void;
}) {
  const { t } = useTranslation();
  const { message } = App.useApp();
  const copy = async (block: GuideBlock) => {
    try {
      await props.onCopy(block);
      message.success(t('instrumentation.copySuccess'));
    } catch {
      message.warning(t('instrumentation.copyFailed'));
    }
  };
  return (
    <section className={styles.guide} aria-labelledby="instrumentation-guide-title">
      <Typography.Title id="instrumentation-guide-title" level={4}>
        {t('instrumentation.v2.installTitle')}
      </Typography.Title>
      <Input.Password
        value={props.token}
        autoComplete="off"
        placeholder={t('instrumentation.field.tokenPlaceholder')}
        onChange={event => props.onToken(event.target.value)}
        aria-label={t('instrumentation.field.token')}
      />
      <Typography.Text type="secondary">{t('instrumentation.field.tokenMemory')}</Typography.Text>
      <GuideSummary guide={props.guide} />
      <div className={styles.blocks}>
        {props.guide.blocks.map(block => (
          <GuideBlockView key={block.id} block={block} token={props.token} onCopy={copy} />
        ))}
      </div>
      <Button type="primary" onClick={props.onDetect}>
        {t('instrumentation.action.startDetection')}
      </Button>
    </section>
  );
}

function GuideSummary({ guide }: { guide: RenderResponse }) {
  const { t } = useTranslation();
  return (
    <>
      {guide.components.map(component => (
        <Descriptions key={component.name} size="small" column={4} className={styles.component!}>
          <Descriptions.Item label={t('instrumentation.v2.component')}>
            <a href={component.sourceUrl}>{component.name}</a>
          </Descriptions.Item>
          <Descriptions.Item label={t('instrumentation.v2.version')}>
            {component.version ?? t('common.unavailable')}
          </Descriptions.Item>
          <Descriptions.Item label={t('instrumentation.v2.license')}>{component.license}</Descriptions.Item>
          <Descriptions.Item label={t('instrumentation.official')}>
            <Tag color="blue">{t('instrumentation.official')}</Tag>
          </Descriptions.Item>
        </Descriptions>
      ))}
      <Space wrap>
        {(['metrics', 'logs', 'traces'] as const).map(signal => (
          <Tag key={signal} color={guide.signals[signal] === 'preview' ? 'warning' : 'default'}>
            {t(`instrumentation.signal.${signal}`)} · {t(`instrumentation.capability.${guide.signals[signal]}`)}
          </Tag>
        ))}
      </Space>
    </>
  );
}

function GuideBlockView(props: { block: GuideBlock; token: string; onCopy: (block: GuideBlock) => Promise<void> }) {
  const { t } = useTranslation();
  const block = props.block;
  const copyable = Boolean(block.content);
  const tokenRequired = block.placeholders.includes('authorizationToken');
  const alertType = block.type === 'warning' ? 'warning' : block.type === 'check' ? 'success' : 'info';
  if (!copyable) {
    return (
      <Alert
        type={alertType}
        showIcon
        message={translateBackend(t, block.titleKey)}
        description={
          block.bodyKey ? (
            translateBackend(t, block.bodyKey)
          ) : block.href ? (
            <a href={block.href}>{t('instrumentation.v2.openOfficialLink')}</a>
          ) : undefined
        }
      />
    );
  }
  return (
    <article className={styles.block}>
      <Space className={styles.blockHeader!}>
        <div>
          <Typography.Text strong>{translateBackend(t, block.titleKey)}</Typography.Text>
          <Typography.Text type="secondary">{translateBackend(t, block.executionLocationKey)}</Typography.Text>
        </div>
        <Button size="small" disabled={tokenRequired && !props.token.trim()} onClick={() => void props.onCopy(block)}>
          {tokenRequired && !props.token.trim() ? t('instrumentation.tokenRequired') : t('instrumentation.action.copy')}
        </Button>
      </Space>
      <pre>
        <code>{block.content}</code>
      </pre>
      {block.href && <a href={block.href}>{t('instrumentation.v2.openOfficialLink')}</a>}
    </article>
  );
}
