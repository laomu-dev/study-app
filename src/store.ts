
import { create } from 'zustand';
import { User, DailyTask, StudyProgress, StudyStats } from '../shared/types';

interface AppState {
  user: User | null;
  setUser: (user: User | null) => void;
  
  todayTasks: DailyTask[];
  setTodayTasks: (tasks: DailyTask[]) => void;
  
  progress: StudyProgress | null;
  setProgress: (progress: StudyProgress) => void;
  
  stats: StudyStats | null;
  setStats: (stats: StudyStats) => void;
  
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  
  error: string | null;
  setError: (error: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  
  todayTasks: [],
  setTodayTasks: (tasks) => set({ todayTasks: tasks }),
  
  progress: null,
  setProgress: (progress) => set({ progress }),
  
  stats: null,
  setStats: (stats) => set({ stats }),
  
  isLoading: false,
  setIsLoading: (isLoading) => set({ isLoading }),
  
  error: null,
  setError: (error) => set({ error }),
}));
