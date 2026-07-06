"use client";

import Sidebar from "./Sidebar";
import Header from "./Header";
import { cn } from "@/lib/utils";

interface PlatformLayoutProps {
  children: React.ReactNode;
  title?: string;
  breadcrumb?: { label: string; href?: string }[];
}

export default function PlatformLayout({ children, title, breadcrumb }: PlatformLayoutProps) {
  return (
    <div className="platform-layout" style={{ background: 'var(--color-bg-primary)' }}>
      {/* Grid background pattern */}
      <div className="fixed inset-0 grid-bg pointer-events-none opacity-50" aria-hidden="true" />

      {/* Ambient glow effects */}
      <div className="fixed top-0 left-1/4 w-96 h-96 rounded-full bg-electric-500/3 blur-3xl pointer-events-none" aria-hidden="true" />
      <div className="fixed bottom-0 right-1/4 w-64 h-64 rounded-full bg-cyan-500/3 blur-3xl pointer-events-none" aria-hidden="true" />

      {/* Sidebar */}
      <Sidebar />

      {/* Main Content Area */}
      <div className="main-content relative z-10">
        <Header title={title} breadcrumb={breadcrumb} />

        {/* Page Content */}
        <main
          id="main-content"
          className="flex-1 overflow-y-auto overflow-x-hidden"
          tabIndex={-1}
          aria-label="Main content"
        >
          <div className="page-content">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
