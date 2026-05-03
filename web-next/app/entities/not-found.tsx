import { redirect } from 'next/navigation';

export default function EntitiesNotFound() {
  redirect('/entities');
}
