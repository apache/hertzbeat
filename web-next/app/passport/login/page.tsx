import React, { Suspense } from 'react';
import { LoginForm } from '@/components/pages/login-form';

export default function PassportLoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
