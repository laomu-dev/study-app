
const API_BASE = 'https://study-app-production-ccd3.up.railway.app/api';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    
    try {
      const response = await fetch(url, {
        ...options,
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error: any) {
      console.error('API Error:', error);
      throw error;
    }
  }

  auth = {
    login: (username: string, password: string) => 
      this.request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      }),
    logout: () => 
      this.request('/auth/logout', { method: 'POST' }),
    getMe: () => 
      this.request('/auth/me'),
  };

  questions = {
    getAll: (categoryId?: number) => 
      this.request(`/questions${categoryId ? `?categoryId=${categoryId}` : ''}`),
    getCategories: () => 
      this.request('/questions/categories'),
    getById: (id: number) => 
      this.request(`/questions/${id}`),
    create: (data: any) => 
      this.request('/questions', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: number, data: any) => 
      this.request(`/questions/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    delete: (id: number) => 
      this.request(`/questions/${id}`, { method: 'DELETE' }),
    createCategory: (name: string, description?: string) => 
      this.request('/questions/categories', {
        method: 'POST',
        body: JSON.stringify({ name, description }),
      }),
  };

  study = {
    getTodayTasks: (limit?: number) => 
      this.request(`/study/today${limit ? `?limit=${limit}` : ''}`),
    submitAnswer: (questionId: number, selectedAnswer: number) => 
      this.request('/study/answer', {
        method: 'POST',
        body: JSON.stringify({ questionId, selectedAnswer }),
      }),
    getProgress: () => 
      this.request('/study/progress'),
    getStats: () => 
      this.request('/study/stats'),
  };
}

export const api = new ApiClient(API_BASE);
