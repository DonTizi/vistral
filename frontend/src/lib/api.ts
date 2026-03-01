const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function throwApiError(res: Response, fallback: string): Promise<never> {
  const body = await res.json().catch(() => null);
  throw new Error(body?.detail || `${fallback}: ${res.statusText}`);
}

export const api = {
  upload: async (file: File): Promise<{ job_id: string; stream_url: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/api/upload`, { method: 'POST', body: formData });
    if (!res.ok) await throwApiError(res, 'Upload failed');
    return res.json();
  },

  uploadUrl: async (url: string): Promise<{ job_id: string; stream_url: string }> => {
    const res = await fetch(`${API_BASE}/api/upload-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url }),
    });
    if (!res.ok) await throwApiError(res, 'Upload failed');
    return res.json();
  },

  getResults: async (jobId: string) => {
    const res = await fetch(`${API_BASE}/api/jobs/${jobId}/results`);
    if (!res.ok) await throwApiError(res, 'Failed to fetch results');
    return res.json();
  },

  getDemo: async (name: string) => {
    const res = await fetch(`${API_BASE}/api/demo/${name}`);
    if (!res.ok) await throwApiError(res, 'Failed to fetch demo');
    return res.json();
  },

  listJobs: async (): Promise<{ job_id: string; title: string; summary: string; created_at: number; topics_count: number; status: string }[]> => {
    const res = await fetch(`${API_BASE}/api/jobs`);
    if (!res.ok) return [];
    return res.json();
  },

  getSettings: async (): Promise<{ mistral_api_key: string; has_api_key: boolean; jobs_count: number; uploads_count: number }> => {
    const res = await fetch(`${API_BASE}/api/settings`);
    if (!res.ok) await throwApiError(res, 'Failed to fetch settings');
    return res.json();
  },

  updateApiKey: async (apiKey: string): Promise<{ status: string; mistral_api_key: string }> => {
    const res = await fetch(`${API_BASE}/api/settings/api-key`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: apiKey }),
    });
    if (!res.ok) await throwApiError(res, 'Failed to update API key');
    return res.json();
  },

  purgeData: async (): Promise<{ status: string; jobs_deleted: number; uploads_deleted: number }> => {
    const res = await fetch(`${API_BASE}/api/data`, { method: 'DELETE' });
    if (!res.ok) await throwApiError(res, 'Failed to purge data');
    return res.json();
  },

  getStreamUrl: (jobId: string) => `${API_BASE}/api/jobs/${jobId}/stream`,
  getVideoUrl: (jobId: string) => `${API_BASE}/api/jobs/${jobId}/video`,
};
