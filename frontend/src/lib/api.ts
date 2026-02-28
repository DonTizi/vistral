const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export const api = {
  upload: async (file: File): Promise<{ job_id: string; stream_url: string }> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/api/upload`, { method: 'POST', body: formData });
    if (!res.ok) throw new Error(`Upload failed: ${res.statusText}`);
    return res.json();
  },

  getResults: async (jobId: string) => {
    const res = await fetch(`${API_BASE}/api/jobs/${jobId}/results`);
    if (!res.ok) throw new Error(`Failed to fetch results: ${res.statusText}`);
    return res.json();
  },

  getDemo: async (name: string) => {
    const res = await fetch(`${API_BASE}/api/demo/${name}`);
    if (!res.ok) throw new Error(`Failed to fetch demo: ${res.statusText}`);
    return res.json();
  },

  getStreamUrl: (jobId: string) => `${API_BASE}/api/jobs/${jobId}/stream`,
  getVideoUrl: (jobId: string) => `${API_BASE}/api/jobs/${jobId}/video`,
};
