import axios from 'axios';

const API_URL = '/api';

const getAuthHeader = () => {
  const token = localStorage.getItem('founders_circle_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const apiService = {
  // ── Auth ─────────────────────────────────────────────────────────────────
  async login(credentials: any) {
    const response = await axios.post(`${API_URL}/auth/login`, credentials);
    if (response.data.token) {
      localStorage.setItem('founders_circle_token', response.data.token);
    }
    return response.data;
  },

  async register(data: any) {
    const response = await axios.post(`${API_URL}/auth/register`, data);
    if (response.data.token) {
      localStorage.setItem('founders_circle_token', response.data.token);
    }
    return response.data;
  },

  async getMe() {
    const response = await axios.get(`${API_URL}/auth/me`, { headers: getAuthHeader() });
    return response.data;
  },

  // ── Posts / Feed ─────────────────────────────────────────────────────────
  async getFeed(page = 1, limit = 10) {
    const response = await axios.get(`${API_URL}/posts/feed`, {
      params: { page, limit },
      headers: getAuthHeader(),
    });
    return response.data;
  },

  async createPost(data: { content: string; tag?: string; metric?: string; metricLabel?: string; image?: string }) {
    const response = await axios.post(`${API_URL}/posts`, data, { headers: getAuthHeader() });
    return response.data;
  },

  async likePost(postId: string) {
    const response = await axios.post(`${API_URL}/posts/${postId}/like`, {}, { headers: getAuthHeader() });
    return response.data;
  },

  async addComment(postId: string, content: string) {
    const response = await axios.post(`${API_URL}/posts/${postId}/comment`, { content }, { headers: getAuthHeader() });
    return response.data;
  },

  // ── Matches (B.I.R.D Engine) ─────────────────────────────────────────────
  async getMatches(filters?: { sector?: string; stage?: string; location?: string }) {
    const response = await axios.get(`${API_URL}/matches`, {
      params: filters,
      headers: getAuthHeader(),
    });
    return response.data; // { matches: [...], total: n }
  },

  // ── Connections ──────────────────────────────────────────────────────────
  async sendConnection(receiverId: string) {
    const response = await axios.post(`${API_URL}/connections`, { receiverId }, { headers: getAuthHeader() });
    return response.data;
  },

  async getMyConnections() {
    const response = await axios.get(`${API_URL}/connections`, { headers: getAuthHeader() });
    return response.data; // { sent: [...], received: [...] }
  },

  async updateConnectionStatus(connectionId: string, status: 'ACCEPTED' | 'REJECTED') {
    const response = await axios.patch(`${API_URL}/connections/${connectionId}`, { status }, { headers: getAuthHeader() });
    return response.data;
  },

  // ── Analytics ────────────────────────────────────────────────────────────
  async getAnalyticsSummary() {
    const response = await axios.get(`${API_URL}/analytics/summary`, { headers: getAuthHeader() });
    return response.data; // { platform: {...}, user: {...} }
  },

  // ── Notifications ─────────────────────────────────────────────────────────
  async getNotifications() {
    const response = await axios.get(`${API_URL}/notifications`, { headers: getAuthHeader() });
    return response.data; // { notifications: [...], unreadCount: n }
  },

  async markNotificationRead(notificationId: string) {
    const response = await axios.patch(`${API_URL}/notifications/${notificationId}/read`, {}, { headers: getAuthHeader() });
    return response.data;
  },

  // ── Legacy compatibility (Discover page uses these) ───────────────────────
  async getCompanies() {
    const response = await axios.get(`${API_URL}/users/companies`, { headers: getAuthHeader() });
    return response.data;
  },

  async getInvestors() {
    const response = await axios.get(`${API_URL}/users/investors`, { headers: getAuthHeader() });
    return response.data;
  },

  async getProfile(id: string) {
    const response = await axios.get(`${API_URL}/users/${id}`, { headers: getAuthHeader() });
    return response.data;
  },

  async updateProfile(data: any) {
    const response = await axios.put(`${API_URL}/users/profile`, data, { headers: getAuthHeader() });
    return response.data;
  },
};
