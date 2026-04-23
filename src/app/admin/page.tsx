import { redirect } from 'next/navigation';

export default function AdminPage() {
  // Simple redirect to the assets page for now
  redirect('/admin/assets');
}
