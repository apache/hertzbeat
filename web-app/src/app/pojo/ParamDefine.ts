export class ParamDefine {
  name!: string;
  field!: string;
  type!: string;
  required: boolean = false;
  defaultValue: string | undefined;
  placeholder!: string;
  range: string | undefined;
  limit: number | undefined;
  //'[{"label":"GET请求","value":"GET"},{"label":"PUT请求","value":"PUT"}]'
  options!: any[];
}
