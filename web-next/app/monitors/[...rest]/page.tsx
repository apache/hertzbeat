import { redirect } from 'next/navigation';

export default function MonitorUnknownRoutePage() {
  redirect('/monitors');
}
