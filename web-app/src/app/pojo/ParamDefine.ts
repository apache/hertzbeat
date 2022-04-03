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
  // 当type为key-value时有效,表示别名描述
  keyAlias!: string;
  valueAlias!: string;
}
