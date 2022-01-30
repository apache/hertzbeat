import { Monitor } from './Monitor';

export class AlertDefineBind {
  id!: number;
  alertDefineId!: number;
  monitorId!: number;
  monitor!: Monitor;
  gmtCreate!: number;
  gmtUpdate!: number;
}
