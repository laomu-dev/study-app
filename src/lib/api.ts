
const API_BASE = import.meta.env.VITE_API_URL || '/api';

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
    register: (username: string, password: string, email?: string) =>
      this.request('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ username, password, email }),
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
    generateMissingExplanations: (categoryId?: number, batchSize = 5) =>
      this.request('/questions/generate-explanations', {
        method: 'POST',
        body: JSON.stringify({ categoryId, batchSize }),
      }),
  };

  study = {
    getTodayTasks: (limit?: number, categoryId?: number) => {
      const params = new URLSearchParams();
      if (limit) params.set('limit', String(limit));
      if (categoryId) params.set('categoryId', String(categoryId));
      const query = params.toString();
      return this.request(`/study/today${query ? `?${query}` : ''}`);
    },
    submitAnswer: (questionId: number, selectedAnswer: number | number[]) => 
      this.request('/study/answer', {
        method: 'POST',
        body: JSON.stringify({ questionId, selectedAnswer }),
      }),
    getProgress: (categoryId?: number) => 
      this.request(`/study/progress${categoryId ? `?categoryId=${categoryId}` : ''}`),
    getStats: () => 
      this.request('/study/stats'),
    getWrongQuestions: () =>
      this.request('/study/wrong'),
  };

  quiz = {
    start: (categoryId?: number, limit?: number) =>
      this.request('/quiz/start', {
        method: 'POST',
        body: JSON.stringify({ categoryId, limit }),
      }),
    submit: (answers: Array<{ questionId: number; selectedAnswer: number | number[] }>) =>
      this.request('/quiz/submit', {
        method: 'POST',
        body: JSON.stringify({ answers }),
      }),
  };

  tutor = {
    chat: (
      message: string,
      categoryId?: number,
      history: Array<{ role: 'user' | 'assistant'; content: string }> = [],
    ) =>
      this.request('/tutor/chat', {
        method: 'POST',
        body: JSON.stringify({ message, categoryId, history }),
      }),
  };

  materials = {
    extract: async (file: File, questionCount: number) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('questionCount', String(questionCount));

      const response = await fetch(`${this.baseUrl}/materials/extract`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return await response.json();
    },
    generate: async (file: File, questionCount: number, categoryId: number) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('questionCount', String(questionCount));
      formData.append('categoryId', String(categoryId));

      const response = await fetch(`${this.baseUrl}/materials/generate`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return await response.json();
    },
    parseGenerated: (content: string, categoryId: number) =>
      this.request('/materials/parse-generated', {
        method: 'POST',
        body: JSON.stringify({ content, categoryId }),
      }),
  };

  import = {
    parseFile: async (file: File, categoryId: number) => {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('categoryId', categoryId.toString());

      const response = await fetch(`${this.baseUrl}/import/parse`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return await response.json();
    },
    batchImport: (questions: any[]) => 
      this.request('/import/batch', {
        method: 'POST',
        body: JSON.stringify({ questions }),
      }),
  };
}

export const api = new ApiClient(API_BASE);
