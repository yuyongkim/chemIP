'use client';

import Navbar from '@/components/Navbar';

import PatentsHero from './components/PatentsHero';
import PatentResultsPanel from './components/PatentResultsPanel';
import { usePatentSearch } from './usePatentSearch';

export default function PatentsPage() {
  const { query, results, loading, error, searched, currentPage, totalPages, total, handleSearch, handlePageChange } =
    usePatentSearch({ limit: 20 });

  return (
    <main className="min-h-screen bg-white">
      <Navbar />

      <PatentsHero query={query} onSearch={handleSearch} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <PatentResultsPanel
          query={query}
          loading={loading}
          error={error}
          searched={searched}
          results={results}
          total={total}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      </div>
    </main>
  );
}
