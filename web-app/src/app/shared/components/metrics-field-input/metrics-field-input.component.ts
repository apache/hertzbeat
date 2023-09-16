import {Component, EventEmitter, Input, OnInit, Output} from '@angular/core';

@Component({
  selector: 'app-metrics-field-input',
  templateUrl: './metrics-field-input.component.html',
  styleUrls: ['./metrics-field-input.component.less']
})
export class MetricsFieldInputComponent implements OnInit {
  constructor() {
  }

  @Input() value!: any;
  @Output() readonly valueChange = new EventEmitter<string>();

  @Input()
  FieldAlias: string = 'field';
  @Input()
  UnitAlias: string = 'unit';
  @Input()
  TypeAlias: string = 'type';

  fields: any[] = [];

  ngOnInit(): void {
    this.fields.push({
      field: '',
      unit: '',
      type: ''
    })
  }

  addNew(e?: MouseEvent) {
    if (e) {
      e.preventDefault();
    }
    this.fields.push({
      field: '',
      unit: '',
      type: ''
    });
  }

  removeCurrent(index: number, e?: MouseEvent) {
    if (e) {
      e.preventDefault();
    }
    if (this.fields.length > 1) {
      this.fields.splice(index, 1);
    }
  }

  onChange() {
    this.value = this.fields
    this.valueChange.emit(JSON.stringify(this.value));
  }
}
