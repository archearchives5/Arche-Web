import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Plus, SlidersHorizontal, Layers } from 'lucide-react';
import {
  getAdminBooks,
  runNextPhase,
  retryPhase,
  archiveBook
} from '../../lib/api';
import BookFilters from '../../components/books/BookFilters';
import { useAuth } from '../../context/AuthContext';
import { canRunAutomation } from '../../lib/auth';
import BookTable from '../../components/books/BookTable';
import UploadBookModal from '../../components/books/UploadBookModal';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Pagination from '../../components/ui/Pagination';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorState from '../../components/ui/ErrorState';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmDialog from '../../components/ui/ConfirmDialog';

const BooksPage = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [showFilters, setShowFilters] = useState(true);

  // Dialog configurations
  const [confirmRetryId, setConfirmRetryId] = useState(null);
  const [confirmArchiveId, setConfirmArchiveId] = useState(null);

  // TanStack Query GET Books Catalog
  const { data, isLoading, error } = useQuery({
    queryKey: ['adminBooks'],
    queryFn: () => getAdminBooks(),
  });

  // Mutations
  const runNextMutation = useMutation({
    mutationFn: (bookId) => runNextPhase(bookId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminBooks'] });
      toast.success('Automated pipeline next phase started!');
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to dispatch run phase.');
    },
  });

  const retryMutation = useMutation({
    mutationFn: (bookId) => retryPhase(bookId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminBooks'] });
      toast.success('Retry command successfully processed!');
      setConfirmRetryId(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to dispatch retry.');
      setConfirmRetryId(null);
    },
  });

  const archiveMutation = useMutation({
    mutationFn: (bookId) => archiveBook(bookId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['adminBooks'] });
      toast.success('Book record archived successfully.');
      setConfirmArchiveId(null);
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || 'Failed to archive book.');
      setConfirmArchiveId(null);
    },
  });

  // Action Triggers
  const handleRunNextPhase = (bookId) => {
    runNextMutation.mutate(bookId);
  };

  const handleRetryConfirm = () => {
    if (confirmRetryId) {
      retryMutation.mutate(confirmRetryId);
    }
  };

  const handleArchiveConfirm = () => {
    if (confirmArchiveId) {
      archiveMutation.mutate(confirmArchiveId);
    }
  };

  // URL-driven and Search-driven Filtering
  const filteredBooks = useMemo(() => {
    let list = Array.isArray(data) ? data : data?.items || data?.books || [];

    // Exclude archived books by default unless publication_status=archived or current_stage=archived is explicitly requested
    const requestedPublicationStatus = searchParams.get('publication_status');
    const requestedCurrentStage = searchParams.get('current_stage');

    if (requestedPublicationStatus !== 'archived' && requestedCurrentStage !== 'archived') {
      list = list.filter(
        (b) =>
          String(b.publication_status || b.publicationStatus).toLowerCase() !== 'archived' &&
          String(b.current_stage || b.currentStage).toLowerCase() !== 'archived'
      );
    }

    // 1. Filter by keyword
    if (search.trim()) {
      const query = search.toLowerCase();
      list = list.filter(
        (b) =>
          (b.title && b.title.toLowerCase().includes(query)) ||
          (b.author && b.author.toLowerCase().includes(query)) ||
          (b.book_id && String(b.book_id).toLowerCase().includes(query))
      );
    }

    // 2. Filter by search params
    if (requestedCurrentStage) {
      list = list.filter((b) => String(b.current_stage).toLowerCase() === requestedCurrentStage.toLowerCase());
    }

    const stageStatus = searchParams.get('stage_status');
    if (stageStatus) {
      list = list.filter((b) => String(b.stage_status).toLowerCase() === stageStatus.toLowerCase());
    }

    const textStatus = searchParams.get('text_status');
    if (textStatus) {
      list = list.filter((b) => String(b.text_status).toLowerCase() === textStatus.toLowerCase());
    }

    const coverStatus = searchParams.get('cover_status');
    if (coverStatus) {
      list = list.filter((b) => String(b.cover_status).toLowerCase() === coverStatus.toLowerCase());
    }

    const rightsStatus = searchParams.get('rights_status');
    if (rightsStatus) {
      list = list.filter((b) => String(b.rights_status).toLowerCase() === rightsStatus.toLowerCase());
    }

    if (requestedPublicationStatus) {
      list = list.filter((b) => String(b.publication_status).toLowerCase() === requestedPublicationStatus.toLowerCase());
    }

    const workType = searchParams.get('work_type');
    if (workType) {
      list = list.filter((b) => String(b.work_type).toLowerCase() === workType.toLowerCase());
    }

    return list;
  }, [data, search, searchParams]);

  // Client-side Pagination
  const itemsPerPage = 8;
  const pageParam = parseInt(searchParams.get('page') || '1', 10);
  const totalPages = Math.ceil(filteredBooks.length / itemsPerPage) || 1;
  const currentPage = Math.min(pageParam, totalPages);

  const paginatedBooks = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredBooks.slice(start, start + itemsPerPage);
  }, [filteredBooks, currentPage]);

  const handlePageChange = (page) => {
    const newParams = new URLSearchParams(searchParams);
    newParams.set('page', String(page));
    setSearchParams(newParams);
  };

  if (isLoading) {
    return <LoadingSpinner message="Retrieving books catalog datasets..." />;
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to Load Catalog"
        description="Could not synchronize catalog datasets with the server."
        onRetry={() => queryClient.invalidateQueries({ queryKey: ['adminBooks'] })}
      />
    );
  }

  return (
    <div className="space-y-8 w-full font-sans">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#DED2BE] pb-6">
        <div>
          <h1 className="text-3xl font-bold text-[#2A473E] font-serif leading-tight">Books Catalog</h1>
          <p className="text-xs text-[#5F5A52] font-mono mt-1 font-bold uppercase tracking-widest flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#3F6F5A]" />
            {filteredBooks.length} VOLUMES IN CATALOG
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            {showFilters ? 'Advanced Filters' : 'Advanced Filters'}
          </Button>
          {canRunAutomation(user) && (
            <Button
              variant="primary"
              onClick={() => setIsUploadModalOpen(true)}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5"
            >
              <Layers className="w-3.5 h-3.5" />
              Bulk Ingest
            </Button>
          )}
        </div>
      </div>

      {/* Filters Header */}
      {showFilters && (
        <BookFilters search={search} setSearch={setSearch} />
      )}

      {/* Main Table */}
      <Card className="p-0 border border-[#DED2BE] overflow-hidden bg-[#FFFDF8]">
        {paginatedBooks.length > 0 ? (
          <div className="p-4 sm:p-6 space-y-4 bg-[#FFFDF8]">
            <BookTable
              books={paginatedBooks}
              onRunNextPhase={handleRunNextPhase}
              onRetry={setConfirmRetryId}
              onArchive={setConfirmArchiveId}
            />
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePageChange}
            />
          </div>
        ) : (
          <EmptyState
            title="No Books Found"
            description="There are no books matching the selected filter query."
          />
        )}
      </Card>

      {/* Upload Book Modal */}
      <UploadBookModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onSuccess={() => {
          setIsUploadModalOpen(false);
          queryClient.invalidateQueries({ queryKey: ['adminBooks'] });
        }}
      />

      {/* Confirm Retry Dialog */}
      <ConfirmDialog
        isOpen={confirmRetryId !== null}
        onClose={() => setConfirmRetryId(null)}
        onConfirm={handleRetryConfirm}
        title="Retry Phase Operation"
        message="Are you sure you want to retry the current failed execution phase for this book? This will restart the phase orchestrator."
        confirmText="Retry Stage"
        confirmVariant="primary"
        isLoading={retryMutation.isPending}
      />

      {/* Confirm Archive Dialog */}
      <ConfirmDialog
        isOpen={confirmArchiveId !== null}
        onClose={() => setConfirmArchiveId(null)}
        onConfirm={handleArchiveConfirm}
        title="Archive Book Record"
        message="Are you sure you want to move this book record to archived storage? It will no longer display in the active catalog queues."
        confirmText="Archive Book"
        confirmVariant="danger"
        isLoading={archiveMutation.isPending}
      />
    </div>
  );
};

export default BooksPage;
