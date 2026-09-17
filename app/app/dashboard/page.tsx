import { redirect } from 'next/navigation';

/** Dashboard pengguna berganti nama menjadi Profil, sesuai aplikasi mobile. */
export default function DashboardRedirect() {
  redirect('/profile');
}
