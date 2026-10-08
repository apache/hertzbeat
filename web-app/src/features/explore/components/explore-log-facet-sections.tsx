/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { CloseOutlined, DownOutlined, RightOutlined } from '@ant-design/icons';
import { Button } from 'antd';
import { useTranslation } from 'react-i18next';
import type { ExploreLogFacetsProps } from './explore-log-facet-types';
import styles from './explore-log-facets.module.css';

type FieldOption = { id: string; label: string; removable?: boolean };

export function FacetSections({
  coreFields,
  addedFields,
  expanded,
  onToggle,
  onRemove,
  renderValues
}: {
  coreFields: FieldOption[];
  addedFields: FieldOption[];
  expanded: string[];
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  renderValues: ExploreLogFacetsProps['renderValues'];
}) {
  return (
    <>
      {[...coreFields, ...addedFields].map(field => (
        <FacetSection
          key={field.id}
          field={field}
          expanded={expanded.includes(field.id)}
          onToggle={onToggle}
          onRemove={onRemove}
          renderValues={renderValues}
        />
      ))}
    </>
  );
}

function FacetSection({
  field,
  expanded,
  onToggle,
  onRemove,
  renderValues
}: {
  field: FieldOption;
  expanded: boolean;
  onToggle: (id: string) => void;
  onRemove: (id: string) => void;
  renderValues: ExploreLogFacetsProps['renderValues'];
}) {
  const { t } = useTranslation();
  return (
    <section className={styles.coreSection} aria-label={field.label}>
      <div className={styles.sectionHeading}>
        <button type="button" aria-expanded={expanded} onClick={() => onToggle(field.id)}>
          <span className={styles.chevron} aria-hidden>
            {expanded ? <DownOutlined /> : <RightOutlined />}
          </span>
          <strong>{field.label}</strong>
        </button>
        {field.removable && (
          <Button
            type="text"
            size="small"
            aria-label={t('explore.logFacets.removeDisplayed', { field: field.label })}
            icon={<CloseOutlined aria-hidden />}
            onClick={() => onRemove(field.id)}
          />
        )}
      </div>
      {expanded && <div className={styles.coreValues}>{renderValues(field.id, field.label)}</div>}
    </section>
  );
}
