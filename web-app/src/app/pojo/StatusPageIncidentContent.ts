export class StatusPageIncidentContent {
  id!: number;
  incidentId!: number;
  message!: string;
  state: number = 0;
  timestamp!: number;
  creator!: string;
  modifier!: string;
  gmtCreate!: number;
  gmtUpdate!: number;
}
