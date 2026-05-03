'use client';

import * as React from 'react';
import { cn } from '../../lib/utils';
import {
  FieldWrapper as ObservabilityFieldWrapper,
  ToolbarGroup as ObservabilityToolbarGroup,
  ToolbarInput as ObservabilityToolbarInput,
  ToolbarNativeSelect as ObservabilityToolbarNativeSelect,
  ToolbarRow as ObservabilityToolbarRow
} from '../observability/toolbar';

export type ToolbarDensity = 'default' | 'compact';

type ToolbarRowProps = React.ComponentProps<typeof ObservabilityToolbarRow> & {
  density?: ToolbarDensity;
};

const toolbarDensityClassNames: Record<ToolbarDensity, string> = {
  default: 'rounded-[6px] gap-3 p-3.5 shadow-none',
  compact: 'rounded-[4px] gap-3 p-3 shadow-none'
};

export function ToolbarRow({ className, density = 'default', ...props }: ToolbarRowProps) {
  return <ObservabilityToolbarRow className={cn(toolbarDensityClassNames[density], className)} {...props} />;
}

type ToolbarGroupProps = React.ComponentProps<typeof ObservabilityToolbarGroup>;

export function ToolbarGroup(props: ToolbarGroupProps) {
  return <ObservabilityToolbarGroup {...props} />;
}

type FieldWrapperProps = React.ComponentProps<typeof ObservabilityFieldWrapper>;

export function FieldWrapper(props: FieldWrapperProps) {
  return <ObservabilityFieldWrapper {...props} />;
}

export function ToolbarField(props: FieldWrapperProps) {
  return <ObservabilityFieldWrapper {...props} />;
}

type ToolbarInputProps = React.ComponentProps<typeof ObservabilityToolbarInput>;

export const ToolbarInput = React.forwardRef<HTMLInputElement, ToolbarInputProps>((props, ref) => (
  <ObservabilityToolbarInput ref={ref} {...props} />
));

ToolbarInput.displayName = 'ToolbarInput';

type ToolbarNativeSelectProps = React.ComponentProps<typeof ObservabilityToolbarNativeSelect>;

export const ToolbarNativeSelect = React.forwardRef<HTMLSelectElement, ToolbarNativeSelectProps>((props, ref) => (
  <ObservabilityToolbarNativeSelect ref={ref} {...props} />
));

ToolbarNativeSelect.displayName = 'ToolbarNativeSelect';
