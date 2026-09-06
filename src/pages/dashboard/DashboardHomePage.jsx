import React, { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  getAdminBooks,
  getAdminRecovery,
  getAdminTextReviewQueue,
  getAdminCoverReviewQueue,
  getAdminRightsReviewQueue,
  runNextPhase,
  retryPhase,
  archiveBook,
  getFileSignedUrl
} from '../../lib/api';

// Components
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import ErrorState from '../../components/ui/ErrorState';
import ConfirmDialog from '../../components/ui/ConfirmDialog';
import BookFilters from '../../components/books/BookFilters';
import BookTable from '../../components/books/BookTable';
import UploadBookModal from '../../components/books/UploadBookModal';
import Pagination from '../../components/ui/Pagination';
import Badge from '../../components/ui/Badge';

import {
  BookOpen,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  UploadCloud,
  FileCode,
  Search,
  Plus,
  Terminal,
  Play,
  RotateCcw,
  Archive,
  Image as ImageIcon
} from 'lucide-react';

const DashboardHomePage = () => {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState('');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

  // Trace query input state
  const [traceSearch, setTraceSearch] = useState('');

  // Dialog configurations
  const [confirmRetryId, setConfirmRetryId] = useState(null);
  const [confirmArchiveId, setConfirmArchiveId] = useState(null);

  // Queries
  const {
    data: booksData,
    isLoading: booksLoading,
    error: booksError,
    refetch: refetchBooks,
  } = useQuery({
    queryKey: ['adminBooks'],
    queryFn: () => getAdminBooks(),
  });

  const {
    data: recoveryData,
    isLoading: recoveryLoading,
    error: recoveryError,
  } = useQuery({
    queryKey: ['adminRecovery'],
    queryFn: () => getAdminRecovery(),
  });

  const {
    data: textQueueData,
    isLoading: textLoading,
    error: textError,
  } = useQuery({
    queryKey: ['adminTextQueue'],
    queryFn: () => getAdminTextReviewQueue(),
  });

  const {
    data: coverQueueData,
    isLoading: coverLoading,
    error: coverError,
  } = useQuery({
    queryKey: ['adminCoverQueue'],
    queryFn: () => getAdminCoverReviewQueue(),
  });

  const {
    data: rightsQueueData,
    isLoading: rightsLoading,
    error: rightsError,
  } = useQuery({
    queryKey: ['adminRightsQueue'],
    queryFn: () => getAdminRightsReviewQueue(),
  });

  // Listen to open-register-book event to toggle local modal as well
  useEffect(() => {
    const handleOpenModal = () => {
      setIsUploadModalOpen(true);
    };
    window.addEventListener('open-register-book', handleOpenModal);
    return () => {
      window.removeEventListener('open-register-book', handleOpenModal);
    };
  }, []);

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

  // Action Handlers
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

  const handleRetryAll = () => {
    refetchBooks();
  };

  const isAnyLoading = booksLoading || recoveryLoading || textLoading || coverLoading || rightsLoading;
  const isAnyError = booksError || recoveryError || textError || coverError || rightsError;

  // Filter logic matching the catalog (excluding archived books by default from active overview)
  const filteredBooks = useMemo(() => {
    let list = Array.isArray(booksData) ? booksData : booksData?.items || booksData?.books || [];

    // Filter out archived books from active overview unless explicitly requested in search params
    const requestedPublicationStatus = searchParams.get('publication_status');
    if (requestedPublicationStatus !== 'archived') {
      list = list.filter(
        (b) =>
          String(b.publication_status || b.publicationStatus).toLowerCase() !== 'archived' &&
          String(b.current_stage || b.currentStage).toLowerCase() !== 'archived'
      );
    }

    if (search.trim()) {
      const query = search.toLowerCase();
      list = list.filter(
        (b) =>
          (b.title && b.title.toLowerCase().includes(query)) ||
          (b.author && b.author.toLowerCase().includes(query)) ||
          (b.book_id && String(b.book_id).toLowerCase().includes(query))
      );
    }

    const currentStage = searchParams.get('current_stage');
    if (currentStage) {
      list = list.filter((b) => String(b.current_stage).toLowerCase() === currentStage.toLowerCase());
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
  }, [booksData, search, searchParams]);

  // Client-side pagination
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

  // Metrics calculation excluding archived books & using real backend/queue approvals
  const metrics = useMemo(() => {
    const rawBooks = Array.isArray(booksData) ? booksData : booksData?.items || booksData?.books || [];
    const activeBooks = rawBooks.filter(
      (b) =>
        String(b.publication_status || b.publicationStatus).toLowerCase() !== 'archived' &&
        String(b.current_stage || b.currentStage).toLowerCase() !== 'archived'
    );

    // 1. Ingestion Count: active volumes currently in compile phases
    const ingestionCount = activeBooks.filter((b) =>
      ['uploaded', 'normalization', 'structure', 'rendering', 'assembly'].includes(
        String(b.current_stage).toLowerCase()
      ) && b.stage_status !== 'failed'
    ).length;

    // 2. Human Approval Count: pending reviewer action from queues or backend metric object
    const backendApproval = booksData?.human_approval || booksData?.humanApproval;

    let textCount = Array.isArray(textQueueData) ? textQueueData.length : 0;
    let coverCount = Array.isArray(coverQueueData) ? coverQueueData.length : 0;
    let rightsCount = Array.isArray(rightsQueueData) ? rightsQueueData.length : 0;
    let totalApprovals = textCount + coverCount + rightsCount;

    if (backendApproval && typeof backendApproval === 'object') {
      totalApprovals = backendApproval.total ?? totalApprovals;
      textCount = backendApproval.text_reviews ?? textCount;
      coverCount = backendApproval.cover_reviews ?? coverCount;
      rightsCount = backendApproval.rights_reviews ?? rightsCount;
    }

    // 3. Ready to Publish Count: cleared reviews but not published
    const readyToPublishCount = activeBooks.filter(
      (b) =>
        String(b.text_status).toLowerCase() === 'approved' &&
        String(b.cover_status).toLowerCase() === 'approved' &&
        (String(b.rights_status).toLowerCase() === 'verified' ||
          String(b.rights_status).toLowerCase() === 'approved') &&
        String(b.publication_status).toLowerCase() !== 'published'
    ).length;

    return {
      ingestion: ingestionCount,
      approvals: totalApprovals,
      textCount,
      coverCount,
      rightsCount,
      ready: readyToPublishCount
    };
  }, [booksData, textQueueData, coverQueueData, rightsQueueData]);

  // Combined Urgent Approvals list
  const urgentApprovalsList = useMemo(() => {
    const items = [];
    const textQueue = Array.isArray(textQueueData) ? textQueueData : [];
    const coverQueue = Array.isArray(coverQueueData) ? coverQueueData : [];
    const rightsQueue = Array.isArray(rightsQueueData) ? rightsQueueData : [];

    textQueue.forEach((b) => {
      items.push({
        id: b.book_id,
        title: b.title,
        author: b.author,
        slug: b.slug,
        type: 'TEXT REVIEW',
        badgeVariant: 'warning',
        route: '/dashboard/review/text',
        description: b.last_error || 'Fragmented OCR plain text output detected. Needs manual layout audit.',
        coverUrl: b.cover_url
      });
    });

    coverQueue.forEach((b) => {
      items.push({
        id: b.book_id,
        title: b.title,
        author: b.author,
        slug: b.slug,
        type: 'COVER REVIEW',
        badgeVariant: 'purple',
        route: '/dashboard/review/covers',
        description: b.cover_prompt || 'Spine alignment variance review needed for AI candidates.',
        coverUrl: b.cover_url
      });
    });

    rightsQueue.forEach((b) => {
      items.push({
        id: b.book_id,
        title: b.title,
        author: b.author,
        slug: b.slug,
        type: 'RIGHTS REVIEW',
        badgeVariant: 'danger',
        route: '/dashboard/review/rights',
        description: b.public_domain_reason || 'Copyright verification pending life + 70 years sign-off.',
        coverUrl: b.cover_url
      });
    });

    return items.slice(0, 3);
  }, [textQueueData, coverQueueData, rightsQueueData]);

  // Real-time logs for Automation Trace
  const traceLogs = useMemo(() => {
    const rawLogs = [];
    const books = Array.isArray(booksData) ? booksData : [];

    books.forEach((b) => {
      if (b.last_error) {
        rawLogs.push({
          time: new Date(b.updated_at || Date.now()).toLocaleTimeString(),
          level: 'WARN',
          message: `[${b.title}] Compiler halted: ${String(b.last_error).substring(0, 70)}...`
        });
      }
      if (b.stage_status === 'complete') {
        rawLogs.push({
          time: new Date(b.updated_at || Date.now()).toLocaleTimeString(),
          level: 'INFO',
          message: `Phase ${b.current_stage} successful for '${b.title}'`
        });
      }
    });

    const sorted = rawLogs.sort((a, b) => b.time.localeCompare(a.time));
    if (traceSearch.trim()) {
      const q = traceSearch.toLowerCase();
      return sorted.filter((l) => l.message.toLowerCase().includes(q) || l.level.toLowerCase().includes(q));
    }
    return sorted.slice(0, 7);
  }, [booksData, traceSearch]);

  if (isAnyLoading) {
    return <LoadingSpinner message="Querying platform telemetry data..." />;
  }

  if (isAnyError) {
    return (
      <ErrorState
        title="Failed to Sync Platform Status"
        description="Could not establish connections to backend admin data feeds."
        onRetry={handleRetryAll}
      />
    );
  }

  return (
    <div className="space-y-10 w-full font-sans text-[#1A1A1A]">
      {/* Editorial Control Room Header */}
      <div className="border-b border-[#DED2BE] pb-6">
        <h2 className="text-3xl font-bold text-[#2A473E] font-serif leading-tight">Editorial Control Room</h2>
        <p className="text-sm text-[#5F5A52] max-w-3xl mt-2 font-serif leading-relaxed">
          Centralized orchestration for the Arche archival sequence. Monitoring ingestion latency and manual editorial bottlenecks.
        </p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Ingestion */}
        <Card className="p-6 flex flex-col justify-between h-36 border border-[#DED2BE] bg-[#FFFDF8]">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-[#5F5A52] font-sans font-bold uppercase tracking-widest bg-[#FAF6EE] px-2 py-0.5 rounded border border-[#DED2BE]">
              Ingestion
            </span>
            <div className="text-[#2A473E]">
              <UploadCloud className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-3xl font-bold text-[#1A1A1A] font-serif block">
              {metrics.ingestion.toLocaleString()}
            </span>
            <span className="text-[10px] text-[#5F5A52] uppercase tracking-wider font-semibold">
              Volumes currently being indexed
            </span>
          </div>
        </Card>

        {/* Human Approval */}
        <Card className="p-6 flex flex-col justify-between h-36 border border-[#DED2BE] bg-[#FFFDF8]">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-[#8A2D3B] font-sans font-bold uppercase tracking-widest bg-[#8A2D3B]/5 px-2 py-0.5 rounded border border-[#8A2D3B]/10">
              Human Approval
            </span>
            <div className="text-[#8A2D3B]">
              <FileText className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-3xl font-bold text-[#8A2D3B] font-serif block">
              {metrics.approvals}
            </span>
            <span className="text-[10px] text-[#5F5A52] uppercase tracking-wider font-semibold block truncate">
              {metrics.approvals === 0
                ? 'No manual approvals waiting.'
                : `Text: ${metrics.textCount} · Cover: ${metrics.coverCount} · Rights: ${metrics.rightsCount}`}
            </span>
          </div>
        </Card>

        {/* Ready to Publish */}
        <Card className="p-6 flex flex-col justify-between h-36 border border-[#DED2BE] bg-[#FFFDF8]">
          <div className="flex justify-between items-start">
            <span className="text-[10px] text-[#3F6F5A] font-sans font-bold uppercase tracking-widest bg-[#3F6F5A]/5 px-2 py-0.5 rounded border border-[#3F6F5A]/10">
              Ready to Publish
            </span>
            <div className="text-[#3F6F5A]">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-3xl font-bold text-[#1A1A1A] font-serif block">
              {metrics.ready.toLocaleString()}
            </span>
            <span className="text-[10px] text-[#5F5A52] uppercase tracking-wider font-semibold">
              Verified and pending catalog entry
            </span>
          </div>
        </Card>
      </div>


      {/* Split Section: Urgent Approvals & Automation Trace */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
        {/* Urgent Approvals List */}
        <Card className="p-6 border border-[#DED2BE] bg-[#FFFDF8] flex flex-col justify-between">
          <div className="space-y-4">
            <h3 className="text-sm font-sans font-bold text-[#2A473E] uppercase tracking-widest border-b border-[#DED2BE] pb-2.5 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#C79A3B]" />
              Urgent Approvals
            </h3>

            <div className="space-y-4">
              {urgentApprovalsList.length > 0 ? (
                urgentApprovalsList.map((item) => (
                  <div key={item.id} className="flex gap-4 p-4 rounded border border-[#DED2BE] bg-[#FAF6EE] hover:border-[#2A473E] transition-all">
                    <div className="w-12 h-16 bg-[#FFFDF8] border border-[#DED2BE] rounded shrink-0 flex items-center justify-center overflow-hidden">
                      {item.coverUrl ? (
                        <img src={item.coverUrl} alt="Cover" className="w-full h-full object-cover" />
                      ) : (
                        <BookOpen className="w-5 h-5 text-[#5F5A52]/40" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex justify-between items-start gap-2">
                        <Link to={item.route} className="font-serif font-bold text-[#1A1A1A] hover:text-[#2A473E] text-sm truncate block">
                          {item.title}
                        </Link>
                        <Badge variant={item.badgeVariant}>{item.type}</Badge>
                      </div>
                      <p className="text-[11px] text-[#5F5A52] line-clamp-2 leading-relaxed font-serif italic">
                        {item.description}
                      </p>
                      <span className="text-[9px] text-[#5F5A52] font-mono block pt-1">
                        ID: {item.id} | AUTHOR: {item.author}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-10 text-[#5F5A52]/60 text-xs italic">
                  No urgent approvals currently pending. Review catalog is clear!
                </div>
              )}
            </div>
          </div>
        </Card>

        {/* Automation Trace Console (n8n logs / compiler stream view) */}
        <Card className="p-6 border border-[#DED2BE] bg-[#FFFDF8] flex flex-col justify-between">
          <div className="space-y-4 flex-1 flex flex-col justify-between">
            <div>
              <div className="flex justify-between items-center border-b border-[#DED2BE] pb-2.5">
                <h3 className="text-sm font-sans font-bold text-[#2A473E] uppercase tracking-widest flex items-center gap-2">
                  <Terminal className="w-4 h-4 text-[#2A473E]" />
                  Automation Trace
                </h3>
                <div className="flex items-center gap-1.5 text-[9px] text-[#5F5A52] font-mono">
                  <span>STREAM: ARCH-GLOBAL-01</span>
                  <span className="w-1.5 h-1.5 rounded-full bg-[#3F6F5A] animate-pulse" />
                  <span className="text-[#3F6F5A] font-bold">LIVE</span>
                </div>
              </div>

              {/* Logs area */}
              <div className="mt-3 space-y-1.5 font-mono text-[10px] text-[#5F5A52] max-h-56 overflow-y-auto pr-1">
                {traceLogs.length > 0 ? (
                  traceLogs.map((log, i) => (
                    <div key={i} className="flex gap-3 py-1 border-b border-[#DED2BE]/40 select-all">
                      <span className="text-[#5F5A52] shrink-0">{log.time}</span>
                      <span className={`font-bold shrink-0 ${log.level === 'WARN' ? 'text-[#8A2D3B]' : 'text-[#2A473E]'}`}>
                        [{log.level}]
                      </span>
                      <span className="text-[#1A1A1A] truncate">{log.message}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-16 text-[#5F5A52]/40 italic">
                    No active automation traces.
                  </div>
                )}
              </div>
            </div>

            {/* Trace Search input */}
            <div className="relative pt-4 mt-auto">
              <input
                type="text"
                placeholder="Query trace..."
                value={traceSearch}
                onChange={(e) => setTraceSearch(e.target.value)}
                className="w-full pl-3 pr-10 py-2 bg-[#FAF6EE] border border-[#DED2BE] rounded text-xs text-[#1A1A1A] focus:outline-none focus:border-[#2A473E] transition-all font-mono"
              />
              <Search className="absolute right-3 top-6 w-3.5 h-3.5 text-[#5F5A52]" />
            </div>
          </div>
        </Card>
      </div>

      {/* Main Real-time Pipeline Table */}
      <div className="space-y-4 pt-4 border-t border-[#DED2BE]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h3 className="text-lg font-bold text-[#1A1A1A] font-serif leading-tight">Real-time Pipeline Overview</h3>
            <p className="text-xs text-[#5F5A52] mt-0.5">Track raw book ingestion, structuring, approvals, and publications.</p>
          </div>
          <Button
            variant="primary"
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center gap-2 self-start sm:self-center"
          >
            <Plus className="w-4 h-4" />
            Register New Book
          </Button>
        </div>

        {/* Filters Header */}
        <BookFilters search={search} setSearch={setSearch} />

        {/* Main Grid/Table */}
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
            <div className="text-center py-16 text-[#5F5A52]/60 text-xs italic">
              No books currently match the active filters.
            </div>
          )}
        </Card>
      </div>

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

export default DashboardHomePage;
