// Define LogEntry interface based on backend structure
export class LogEntry {
  timeUnixNano?: number;
  observedTimeUnixNano?: number;
  severityNumber?: number;
  severityText?: string;
  body?: any;
  attributes?: { [key: string]: any };
  droppedAttributesCount?: number;
  traceId?: string;
  spanId?: string;
  traceFlags?: number;
  resource?: { [key: string]: any };
  instrumentationScope?: {
    name?: string;
    version?: string;
    attributes?: { [key: string]: any };
  };
}
