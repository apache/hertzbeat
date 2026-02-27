import { NgModule } from '@angular/core';
import { DelonFormModule, WidgetRegistry } from '@delon/form';

import { SharedModule } from '../shared.module';
import { TestWidget } from './test/test.widget';

export const SCHEMA_THIRDS_COMPONENTS = [TestWidget];

@NgModule({
  declarations: SCHEMA_THIRDS_COMPONENTS,
  imports: [SharedModule, DelonFormModule.forRoot()],
  exports: SCHEMA_THIRDS_COMPONENTS
})
export class JsonSchemaModule {
  constructor(widgetRegistry: WidgetRegistry) {
    widgetRegistry.register(TestWidget.KEY, TestWidget);
  }
}
