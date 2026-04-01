import Link from 'next/link';
import { ArrowUpRight, FlaskConical, Pill } from 'lucide-react';

import StatsSection from '@/components/StatsSection';

export default function HomeLandingPanels() {
  return (
    <div className="space-y-12">
      <StatsSection />

      <section>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link
            href="/"
            className="group bg-white p-7 rounded-2xl border border-blue-100 shadow-sm hover:shadow-lg hover:border-blue-200 transition-all"
          >
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-100 transition-colors">
              <FlaskConical className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">MSDS-Centric Search</h3>
            <p className="text-sm text-gray-600">Search a chemical and explore MSDS data, related patents, and market trends from the detail page.</p>
            <div className="flex items-center gap-1 mt-4 text-blue-600 text-sm font-semibold">
              Start MSDS Lookup
              <ArrowUpRight className="w-3 h-3" />
            </div>
          </Link>

          <Link
            href="/drugs"
            className="group bg-white p-7 rounded-2xl border border-emerald-100 shadow-sm hover:shadow-lg hover:border-emerald-200 transition-all"
          >
            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center mb-4 group-hover:bg-emerald-100 transition-colors">
              <Pill className="w-6 h-6 text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Integrated Drug Search</h3>
            <p className="text-sm text-gray-600">View drug approval data and consumer medication info, then explore related patents and market data.</p>
            <div className="flex items-center gap-1 mt-4 text-emerald-600 text-sm font-semibold">
              Go to Drugs Page
              <ArrowUpRight className="w-3 h-3" />
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}
