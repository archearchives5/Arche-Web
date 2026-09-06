import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPublicBooks } from '../../lib/api';

// Components
import Select from '../../components/ui/Select';
import PublicBookCard from '../../components/public/PublicBookCard';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorState from '../../components/ui/ErrorState';
import EmptyState from '../../components/ui/EmptyState';
import Card from '../../components/ui/Card';
import { Search } from 'lucide-react';

const PublicBooksPage = () => {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [langFilter, setLangFilter] = useState('');
  const [page, setPage] = useState(1);
  const itemsPerPage = 8;

  // TanStack Query
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['publicBooksCatalog', page, search, typeFilter, langFilter],
    queryFn: () =>
      getPublicBooks({
        page,
        limit: itemsPerPage,
        search: search.trim() || undefined,
        work_type: typeFilter || undefined,
        language: langFilter || undefined,
      }),
  });

  const { paginatedBooks, totalPages } = useMemo(() => {
    let list = [];
    let total = 0;

    if (data) {
      if (Array.isArray(data)) {
        list = data;
        total = data.length;
      } else if (Array.isArray(data.items)) {
        list = data.items;
        total = typeof data.total === 'number' ? data.total : data.items.length;
      } else if (Array.isArray(data.books)) {
        list = data.books;
        total = typeof data.total === 'number' ? data.total : data.books.length;
      }
    }

    // Filter to published books only if status field exists
    list = list.filter(
      (b) =>
        !b.publication_status ||
        String(b.publication_status).toLowerCase() === 'published' ||
        String(b.publicationStatus).toLowerCase() === 'published'
    );

    // If backend returns all items (unpaginated/mock fallback), do client-side slice
    let finalBooks = list;
    if (Array.isArray(data) && list.length > itemsPerPage) {
      const start = (page - 1) * itemsPerPage;
      finalBooks = list.slice(start, start + itemsPerPage);
    }

    const calculatedTotalPages = Math.ceil(total / itemsPerPage) || 1;
    return { paginatedBooks: finalBooks, totalPages: calculatedTotalPages };
  }, [data, page, itemsPerPage]);

  const currentPage = Math.min(page, totalPages);

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    setPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const TYPE_OPTIONS = [
    { value: 'novel', label: 'Novel' },
    { value: 'play', label: 'Play' },
    { value: 'poetry', label: 'Poetry' },
    { value: 'essay', label: 'Essay' },
    { value: 'drama', label: 'Drama' },
    { value: 'prose', label: 'Prose' },
  ];

  const LANG_OPTIONS = [
    { value: 'en', label: 'English' },
    { value: 'fr', label: 'French' },
    { value: 'es', label: 'Spanish' },
    { value: 'la', label: 'Latin' },
  ];

  if (isLoading) {
    return <LoadingSpinner message="Retrieving public library catalog..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to Load Public Catalog"
        description="Could not connect to the public library archives feed."
        onRetry={refetch}
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full space-y-8 bg-[#FAF6EE] text-[var(--color-ink)] font-sans text-left">
      {/* Header section */}
      <div className="border-b border-[var(--color-border)] pb-6">
        <span className="px-2 py-0.5 bg-[var(--color-warning-soft)] border border-[var(--color-warning)]/20 text-[9px] font-bold text-[var(--color-warning)] uppercase tracking-widest rounded mb-3 inline-block">
          Public Release
        </span>
        <h1 className="text-4xl font-bold text-[var(--color-archive-green)] font-serif leading-tight">Arche Archives Library</h1>
        <p className="text-sm text-[var(--color-muted-ink)] max-w-3xl mt-2 font-serif leading-relaxed">
          "Preserving the intellectual heritage of humanity through meticulous digital curation. Explore our curated selection of physical manuscripts and rare editions, now accessible for universal scholarly inquiry."
        </p>
      </div>

      {/* Filter panel */}
      <Card className="p-5 border border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end text-xs">
          <div className="md:col-span-2 space-y-1">
            <span className="text-[9px] text-[var(--color-muted-ink)] font-bold uppercase tracking-widest block">Search Catalogs</span>
            <div className="relative">
              <input
                type="text"
                placeholder="Title, Author, or Keyword..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-3 pr-9 py-2 bg-[var(--color-panel)] border border-[var(--color-border)] rounded text-xs text-[var(--color-ink)] placeholder-[var(--color-muted-ink)]/50 focus:outline-none focus:border-[var(--color-archive-green)]"
              />
              <Search className="absolute right-3 top-2.5 w-3.5 h-3.5 text-[var(--color-muted-ink)]" />
            </div>
          </div>

          <Select
            label="Genre"
            placeholder="All Genres"
            options={TYPE_OPTIONS}
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            size="sm"
          />

          <Select
            label="Language"
            placeholder="All Languages"
            options={LANG_OPTIONS}
            value={langFilter}
            onChange={(e) => {
              setLangFilter(e.target.value);
              setPage(1);
            }}
            size="sm"
          />
        </div>
      </Card>

      {/* Content grid */}
      {paginatedBooks.length > 0 ? (
        <div className="space-y-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {paginatedBooks.map((book) => (
              <PublicBookCard key={book.book_id || book.id} book={book} />
            ))}
          </div>

          {/* Pagination controls */}
          {totalPages > 1 && (
            <div className="border-t border-[var(--color-border)] pt-6 flex items-center justify-center gap-6 text-xs select-none">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="font-bold text-[var(--color-muted-ink)] hover:text-[var(--color-archive-green)] disabled:opacity-40 uppercase tracking-widest cursor-pointer"
              >
                ← Previous Folio
              </button>
              <div className="flex items-center gap-2">
                {Array.from({ length: totalPages }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => handlePageChange(i + 1)}
                    className={`w-7 h-7 flex items-center justify-center font-mono font-bold border transition-all rounded-xl cursor-pointer ${
                      currentPage === i + 1
                        ? 'bg-[var(--color-archive-green)] border-[var(--color-archive-green)] text-[var(--color-surface)] shadow-sm'
                        : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-ink)] hover:bg-[var(--color-panel)]'
                    }`}
                  >
                    {String(i + 1).padStart(2, '0')}
                  </button>
                ))}
              </div>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="font-bold text-[var(--color-muted-ink)] hover:text-[var(--color-archive-green)] disabled:opacity-40 uppercase tracking-widest cursor-pointer"
              >
                Next Folio →
              </button>
            </div>
          )}
        </div>
      ) : (
        <EmptyState
          title={search || typeFilter || langFilter ? "No Books Found" : "No published books available yet."}
          description={
            search || typeFilter || langFilter
              ? "We couldn't find any published works matching your search parameters."
              : "Check back soon as new restored volumes are added to the library."
          }
        />
      )}
    </div>
  );
};

export default PublicBooksPage;
