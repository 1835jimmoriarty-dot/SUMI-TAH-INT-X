import React from 'react';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { verifySessionToken, AUTH_COOKIE_NAME } from '@/lib/auth';
import { Sidebar } from '@/components/shell/sidebar';
import { TopBar } from '@/components/shell/topbar';
import { DemoBanner } from '@/components/shell/demo-banner';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = cookies();
  const sessionCookie = cookieStore.get(AUTH_COOKIE_NAME);

  if (!sessionCookie) {
    redirect('/login');
  }

  const session = await verifySessionToken(sessionCookie.value);
  if (!session) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-charcoal-950 flex">
      <Sidebar />
      <div className="flex-1 ml-64 flex flex-col min-w-0">
        <DemoBanner />
        <TopBar />
        <main className="flex-1 p-6 md:p-8 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}