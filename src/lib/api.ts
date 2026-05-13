
const API_BASE = 'https://study-app-production-ccd3.up.railway.app/api';

async function request<T>(url: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  const text = await response.text();
  if (!text) {
    throw new Error('Empty response');
  }

  const data = JSON.parse(text);

  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

export const api = {
  auth: {
    login: (username: string, password: string) => 
      request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      }),
    logout: () => 
      request('/auth/logout', { method: 'POST' }),
    getMe: () => 
      request('/auth/me'),
  },

  questions: {
    getAll: (categoryId?: number) => 
      request(`/questions${categoryId ? `?categoryId=${categoryId}` : ''}`),
    getCategories: () => 
      request('/questions/categories'),
    getById: (id: number) => 
      request(`/questions/${id}`),
    create: (data: any) => 
      request('/questions', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: number, data: any) => 
      request(`/questions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: number) => 
      request(`/questions/${id}`, { method: 'DELETE' }),
    createCategory: (name: string, description?: string) => 
      request('/questions/categories', {
        method: 'POST',
        body: JSON.stringify({ name, description }),
      }),
  },

  study: {
    getTodayTasks: (limit?: number) => 
      request(`/study/today${limit ? `?limit=${limit}` : ''}`),
    submitAnswer: (questionId: number, selectedAnswer: number) => 
      request('/study/answer', {
        method: 'POST',
        body: JSON.stringify({ questionId, selectedAnswer }),
      }),
    getProgress: () => 
      request('/study/progress'),
    getStats: () => 
      request('/study/stats'),
  },
};
