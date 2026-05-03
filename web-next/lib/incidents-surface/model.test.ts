import { describe, expect, it } from 'vitest';
import { buildIncidentsDomainModel } from './model';

const t = (key: string) => {
  const messages: Record<string, string> = {
    'incidents.subtitle': 'Response timeline, ownership, and next steps stay grouped in a single operator context.',
    'incidents.focus': 'Incident posture and response handoff',
    'incidents.summary': 'The incidents entry page keeps response state, owners, and related evidence aligned while the deeper domain is still landing.',
    'incidents.checklist.shell.title': 'Shell ready',
    'incidents.checklist.shell.copy': 'The incidents route already shares the workbench shell and routing posture.',
    'incidents.checklist.adapter.title': 'Adapters next',
    'incidents.checklist.adapter.copy': 'Incident list, owner state, and response timeline can plug into the current API boundary.',
    'incidents.checklist.drilldown.title': 'Drilldown reserved',
    'incidents.checklist.drilldown.copy': 'Log, trace, and entity handoff stay on the planned expansion path.',
    'menu.dashboard.back': 'Open overview',
    'menu.log.manage': 'Log manage',
    'menu.trace.manage': 'Trace manage'
  };
  return messages[key] ?? key;
};

describe('incidents domain model', () => {
  it('builds an incident-centered workspace snapshot', () => {
    const model = buildIncidentsDomainModel(t);

    expect(model.title).toBe('Incidents');
    expect(model.incidents).toHaveLength(3);
    expect(model.incidents[0]?.severity).toBe('critical');
    expect(model.timeline).toHaveLength(3);
    expect(model.metrics).toEqual([
      { label: 'Open incidents', value: '3' },
      { label: 'Critical', value: '1' },
      { label: 'Mitigating', value: '1' },
      { label: 'Ownership queues', value: '3' }
    ]);
  });
});
