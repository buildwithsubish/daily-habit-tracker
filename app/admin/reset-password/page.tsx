import { redirect } from 'next/navigation';

/** @deprecated Use /admin/password */
export default function AdminResetPasswordRedirect() {
  redirect('/admin/password');
}