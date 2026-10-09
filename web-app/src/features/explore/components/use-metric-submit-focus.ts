/* Licensed to the Apache Software Foundation (ASF) under the Apache License, Version 2.0. */
import { useLayoutEffect, useRef, useState } from 'react';
import { invalidLogSearchSubmitEvent } from './log-search-focus-intent';
import type { ExploreSubmissionViewModel } from '../model/explore-submission-model';

/** Consume one focus request per explicit submission, never per draft/error update. */
export function useExploreSubmitFocus(submission: ExploreSubmissionViewModel) {
  const queryRef = useRef<HTMLDivElement>(null);
  const [attempt, setAttempt] = useState(0);
  const handled = useRef(0);
  const { errors, draft } = submission;
  useLayoutEffect(() => {
    if (attempt === handled.current) return;
    handled.current = attempt;
    const root = queryRef.current;
    if (!root) return;
    if (draft.signal === 'logs' && errors.query) {
      const input = root.querySelector<HTMLElement>('[data-log-search-input]');
      if (input && input.dispatchEvent(new Event(invalidLogSearchSubmitEvent, { cancelable: true }))) {
        input.focus();
      }
      return;
    }
    if (draft.signal !== 'metrics' || !errors.metricPlan) return;
    const issue = root.querySelector<HTMLElement>('[data-metric-issue-ref]');
    if (!issue) return;
    focusMetricIssue(root, issue);
  }, [attempt, errors, draft.signal]);
  return {
    queryRef,
    requestFocus: () => {
      if (draft.signal === 'metrics' || draft.signal === 'logs') setAttempt(value => value + 1);
    }
  };
}

function focusMetricIssue(root: HTMLElement, issue: HTMLElement) {
  // Native toggle delivery can lag an immediate keyboard submission.
  const disclosure = issue.closest('details');
  if (disclosure) disclosure.open = true;
  const editableIssue = ['metric', 'formula', 'reference'].includes(issue.dataset.metricIssueField ?? '');
  const input = editableIssue
    ? Array.from(root.querySelectorAll<HTMLInputElement>('[data-metric-plan-ref]')).find(
        node => node.dataset.metricPlanRef === issue.dataset.metricIssueRef
      )
    : undefined;
  issue.scrollIntoView({ block: 'center', behavior: 'instant' });
  const bounds = input?.getBoundingClientRect();
  const inputVisible = bounds && bounds.top >= 0 && bounds.bottom <= window.innerHeight;
  (inputVisible ? input! : issue).focus({ preventScroll: true });
}
