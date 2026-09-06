import axios from 'axios';
import { API_BASE_URL } from './constants';
import { getStoredToken, logout } from './auth';

/**
 * Centered Axios instance configured with API_BASE_URL
 */
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Automatically attach Authorization Bearer token to headers if available
 */
api.interceptors.request.use(
  (config) => {
    const token = getStoredToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Catch responses to check for unauthorized access (401)
 * Clears credentials and redirects to the correct login path
 */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      logout();
      const path = window.location.pathname;
      const isDashboard = path.startsWith('/dashboard') || error.config?.url?.includes('/api/admin/');
      if (!path.includes('/login')) {
        if (isDashboard) {
          window.location.href = '/admin/login';
        } else {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  }
);

/* ==========================================
   AUTHENTICATION ENDPOINTS
   ========================================== */

/**
 * Public: Register a new reader user account
 */
export const registerUser = async (payload) => {
  const response = await api.post('/api/auth/register', payload);
  return response.data;
};

/**
 * Public: Sign in to reader user account
 */
export const loginUser = async (credentials) => {
  const response = await api.post('/api/auth/login', credentials);
  return response.data;
};

/**
 * Public: Retrieve currently authenticated reader user profile
 */
export const getPublicMe = async () => {
  const response = await api.get('/api/auth/me');
  return response.data;
};

/**
 * Public: Log out authenticated reader user
 */
export const logoutUser = async () => {
  const response = await api.post('/api/auth/logout');
  return response.data;
};

/**
 * Admin: Sign in to admin/staff publisher console
 */
export const loginAdmin = async (credentials) => {
  const response = await api.post('/api/admin/auth/login', credentials);
  return response.data;
};

/**
 * Admin: Retrieve currently authenticated admin/staff profile
 */
export const getAdminMe = async () => {
  const response = await api.get('/api/admin/auth/me');
  return response.data;
};

/**
 * Admin: Log out authenticated admin/staff user
 */
export const logoutAdmin = async () => {
  const response = await api.post('/api/admin/auth/logout');
  return response.data;
};

/* ==========================================
   ADMIN/DASHBOARD CATALOG ENDPOINTS
   ========================================== */

/**
 * Retrieve admin books list catalog with filters/pagination
 * @param {Object} [params] - Query parameters (e.g. { page, limit, status })
 */
export const getAdminBooks = async (params) => {
  const queryParams = { limit: 1000, ...params };
  const response = await api.get('/api/admin/books', { params: queryParams });
  return response.data;
};

/**
 * Retrieve book metadata record by book ID
 */
export const getAdminBookById = async (bookId) => {
  const response = await api.get(`/api/admin/books/${bookId}`);
  return response.data;
};

/**
 * Retrieve book raw files inventory
 */
export const getAdminBookFiles = async (bookId) => {
  const response = await api.get(`/api/admin/books/${bookId}/files`);
  return response.data;
};

/**
 * Retrieve book QC verification results
 */
export const getAdminBookQc = async (bookId) => {
  const response = await api.get(`/api/admin/books/${bookId}/qc`);
  return response.data;
};

/**
 * Retrieve rendering reports logs for print-ready PDFs
 */
export const getAdminBookRenderReports = async (bookId) => {
  const response = await api.get(`/api/admin/books/${bookId}/render-reports`);
  return response.data;
};

/**
 * Retrieve approval tracking parameters
 */
export const getAdminBookApprovals = async (bookId) => {
  const response = await api.get(`/api/admin/books/${bookId}/approvals`);
  return response.data;
};

/**
 * Retrieve global server recoveries logs
 */
export const getAdminRecovery = async () => {
  const response = await api.get('/api/admin/recovery');
  return response.data;
};

/**
 * Retrieve text review queues
 */
export const getAdminTextReviewQueue = async (params) => {
  const response = await api.get('/api/admin/review-queue/text', { params });
  return response.data;
};

/**
 * Retrieve covers design queues
 */
export const getAdminCoverReviewQueue = async (params) => {
  const response = await api.get('/api/admin/review-queue/covers', { params });
  return response.data;
};

/**
 * Retrieve rights permissions check queues
 */
export const getAdminRightsReviewQueue = async (params) => {
  const response = await api.get('/api/admin/review-queue/rights', { params });
  return response.data;
};

/**
 * Run next phase for the book's automated compilation pipeline
 */
export const runNextPhase = async (bookId) => {
  const response = await api.post(`/api/admin/books/${bookId}/run-next-phase`);
  return response.data;
};

export const runPhase = async (bookId, phase) => {
  const response = await api.post(`/api/admin/books/${bookId}/run-phase/${phase}`);
  return response.data;
};

export const runPhaseBatch = async (phase, payload = {}) => {
  const response = await api.post(`/api/admin/pipeline/run-phase/${phase}`, payload);
  return response.data;
};

export const getEligibleBooks = async (phase, limit = 10) => {
  const response = await api.get('/api/admin/pipeline/eligible', {
    params: { phase, limit }
  });
  return response.data;
};

/**
 * Retry current failed book compilation phase
 */
export const retryPhase = async (bookId) => {
  const response = await api.post(`/api/admin/books/${bookId}/retry`);
  return response.data;
};

/**
 * Approve text composition reviews
 * @param {Object} data - Feedback/review logs
 */
export const approveTextReview = async (bookId, data) => {
  const response = await api.post(`/api/admin/books/${bookId}/text-review/approve`, data);
  return response.data;
};

/**
 * Reject text composition reviews
 */
export const rejectTextReview = async (bookId, data) => {
  const response = await api.post(`/api/admin/books/${bookId}/text-review/reject`, data);
  return response.data;
};

/**
 * Mark text review as needing changes
 */
export const needsChangesTextReview = async (bookId, data) => {
  const response = await api.post(`/api/admin/books/${bookId}/text-review/needs-changes`, data);
  return response.data;
};

/**
 * Approve book cover designs
 */
export const approveCoverReview = async (bookId, data) => {
  const response = await api.post(`/api/admin/books/${bookId}/covers/approve`, data);
  return response.data;
};

/**
 * Reject book cover designs
 */
export const rejectCoverReview = async (bookId, data) => {
  const response = await api.post(`/api/admin/books/${bookId}/covers/reject`, data);
  return response.data;
};

/**
 * Approve intellectual property rights clearance
 */
export const approveRightsReview = async (bookId, data) => {
  const response = await api.post(`/api/admin/books/${bookId}/rights/approve`, data);
  return response.data;
};

/**
 * Reject intellectual property rights clearance
 */
export const rejectRightsReview = async (bookId, data) => {
  const response = await api.post(`/api/admin/books/${bookId}/rights/reject`, data);
  return response.data;
};

/**
 * Deploy catalog book public release
 */
export const publishBook = async (bookId, data) => {
  const response = await api.post(`/api/admin/books/${bookId}/publish`, data);
  return response.data;
};

/**
 * Revoke public release status
 */
export const unpublishBook = async (bookId) => {
  const response = await api.post(`/api/admin/books/${bookId}/unpublish`);
  return response.data;
};

/**
 * Move book record to archived storage
 */
export const archiveBook = async (bookId) => {
  const response = await api.post(`/api/admin/books/${bookId}/archive`);
  return response.data;
};

/**
 * Move book record back to active queues from archive
 */
export const unarchiveBook = async (bookId) => {
  const response = await api.post(`/api/admin/books/${bookId}/unarchive`);
  return response.data;
};


/**
 * Mark a recovery pipeline failed stage as ready to retry
 * @param {string} bookId
 * @param {Object} data - { notes }
 */
export const markRecoveryReady = async (bookId, data) => {
  const response = await api.post(`/api/admin/books/${bookId}/recovery/mark-ready`, data);
  return response.data;
};

/**
 * Block a recovery pipeline failed stage from execution retries
 * @param {string} bookId
 */
export const blockRecovery = async (bookId) => {
  const response = await api.post(`/api/admin/books/${bookId}/recovery/block`);
  return response.data;
};

/**
 * Retrieve one-shot signed URL for file downloads
 */
export const getFileSignedUrl = async (bookId, fileId) => {
  const response = await api.get(`/api/admin/books/${bookId}/files/${fileId}/signed-url`);
  return response.data;
};

/**
 * Request a presigned S3 upload URL for a raw file (Alias to signed-upload-url)
 * @param {object} data - { file_name, content_type }
 */
export const getPresignedUploadUrl = async (data) => {
  try {
    const response = await api.post('/api/admin/books/signed-upload-url', data);
    return response.data;
  } catch (e) {
    const response = await api.post('/api/admin/books/presigned-upload-url', data);
    return response.data;
  }
};

/**
 * Register a new book metadata and raw_source_path in database and trigger phase 1
 * @param {object} data - { title, author, slug, raw_source_path }
 */
export const registerBook = async (data) => {
  const response = await api.post('/api/admin/books/register', data);
  return response.data;
};

/**
 * Override book cover with a custom human-designed design path
 * @param {string} bookId
 * @param {object} data - { approved_cover_path, reviewer_name, notes }
 */
export const overrideCoverHumanDesign = async (bookId, data) => {
  const response = await api.post(`/api/admin/books/${bookId}/covers/human-design`, data);
  return response.data;
};

/**
 * Update book metadata details
 * @param {string} bookId
 * @param {object} data - { title, author, year, description, keywords }
 */
export const updateBookMetadata = async (bookId, data) => {
  const response = await api.post(`/api/admin/books/${bookId}/metadata`, data);
  return response.data;
};

/**
 * Reset book compilation stage and status parameters
 * @param {string} bookId
 * @param {object} data - { target_stage, target_status }
 */
export const resetBookStageStatus = async (bookId, data) => {
  const response = await api.post(`/api/admin/books/${bookId}/reset`, data);
  return response.data;
};

/* ==========================================
   PUBLIC ARCHIVE ENDPOINTS
   ========================================== */

/**
 * Retrieve public catalog list with pagination/filters
 */
export const getPublicBooks = async (params) => {
  const queryParams = { limit: 1000, ...params };
  const response = await api.get('/api/public/books', { params: queryParams });
  return response.data;
};

/**
 * Retrieve public book details by URL slug
 */
export const getPublicBookBySlug = async (slug) => {
  const response = await api.get(`/api/public/books/${slug}`);
  return response.data;
};

/**
 * Retrieve public chapters/table of contents
 */
export const getPublicBookChapters = async (slug) => {
  const response = await api.get(`/api/public/books/${slug}/chapters`);
  return response.data;
};

/**
 * Retrieve download options for public editions
 */
export const getPublicBookDownloads = async (slug) => {
  const response = await api.get(`/api/public/books/${slug}/downloads`);
  return response.data;
};

/**
 * Retrieve cover thumbnail images for public editions
 */
export const getPublicBookCover = async (slug) => {
  const response = await api.get(`/api/public/books/${slug}/cover`);
  return response.data;
};

export const requestHumanCoverUploadUrl = async (bookId, payload) => {
  const response = await api.post(`/api/admin/books/${bookId}/covers/human-design/upload-url`, payload);
  return response.data;
};

export const submitHumanCover = async (bookId, payload) => {
  const response = await api.post(`/api/admin/books/${bookId}/covers/human-design`, payload);
  return response.data;
};

/**
 * Reupload cover image and replace old approved cover
 */
export const reuploadCover = async (bookId, payload) => {
  const response = await api.post(`/api/admin/books/${bookId}/covers/reupload`, payload);
  return response.data;
};

/**
 * Request presigned upload URL for cover reupload
 */
export const requestCoverReuploadUrl = async (bookId, payload) => {
  try {
    const response = await api.post(`/api/admin/books/${bookId}/covers/reupload/upload-url`, payload);
    return response.data;
  } catch (e) {
    return requestHumanCoverUploadUrl(bookId, payload);
  }
};

/**
 * Permanently delete an entire book record and DigitalOcean storage objects
 */
export const deleteBookPermanently = async (bookId) => {
  const response = await api.delete(`/api/admin/books/${bookId}`, {
    data: {
      confirm: 'DELETE_BOOK',
      delete_storage: true
    }
  });
  return response.data;
};

/**
 * Request presigned upload URL for edited DOCX
 */
export const requestDocxEditUploadUrl = async (bookId, payload) => {
  const response = await api.post(`/api/admin/books/${bookId}/docx-edit/upload-url`, payload);
  return response.data;
};

/**
 * Trigger DOCX edit import and Phase 3 re-render queue
 */
export const triggerDocxEditImport = async (bookId, payload) => {
  const response = await api.post(`/api/admin/books/${bookId}/docx-edit/import`, payload);
  return response.data;
};

export default api;


