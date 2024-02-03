import { StatusPageComponent } from './StatusPageComponent';
import { StatusPageIncidentContent } from './StatusPageIncidentContent';

export class StatusPageIncident {
  id!: number;
  orgId!: number;
  name!: string;
  // incident current state: 0-Investigating 1-Identified 2-Monitoring 3-Resolved
  state: number = 0;
  // incident start Investigating timestamp
  startTime!: number;
  // incident end Resolved timestamp
  endTime!: number;
  creator!: string;
  modifier!: string;
  gmtCreate!: number;
  gmtUpdate!: number;

  components!: StatusPageComponent[];
  contents!: StatusPageIncidentContent[];
}
