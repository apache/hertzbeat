import { FlatCompat } from '@eslint/eslintrc';

const compat = new FlatCompat({ baseDirectory: import.meta.dirname });

const eslintConfig = [
  {
    ignores: ['.next/**', '.next-*/**', 'next-env.d.ts']
  },
  ...compat.extends('next/core-web-vitals')
];

export default eslintConfig;
