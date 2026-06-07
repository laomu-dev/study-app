
import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { api } from '../lib/api';
import { AlertTriangle, BookOpen, Home, Settings, LogOut, BookMarked, Menu, X, ClipboardCheck, FileText, Sparkles } from 'lucide-react';

export function Navbar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, setUser } = useAppStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await api.auth.logout();
      setUser(null);
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  if (!user) return null;

  return (
    <nav className="bg-gradient-to-r from-blue-800 to-blue-600 text-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2 text-xl font-bold">
              <BookOpen className="h-8 w-8" />
              <span className="hidden sm:inline">传输通信知识学习助手</span>
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-1 lg:space-x-4">
            <Link
              to="/"
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive('/')
                  ? 'bg-blue-900 text-white shadow-md'
                  : 'text-blue-100 hover:bg-blue-700'
              }`}
            >
              <Home className="h-4 w-4" />
              <span>首页</span>
            </Link>
            
            <Link
              to="/study"
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive('/study')
                  ? 'bg-blue-900 text-white shadow-md'
                  : 'text-blue-100 hover:bg-blue-700'
              }`}
            >
              <BookMarked className="h-4 w-4" />
              <span>学习</span>
            </Link>

            <Link
              to="/quiz"
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive('/quiz')
                  ? 'bg-blue-900 text-white shadow-md'
                  : 'text-blue-100 hover:bg-blue-700'
              }`}
            >
              <ClipboardCheck className="h-4 w-4" />
              <span>测验</span>
            </Link>
            
            <Link
              to="/ai-tutor"
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive('/ai-tutor')
                  ? 'bg-blue-900 text-white shadow-md'
                  : 'text-blue-100 hover:bg-blue-700'
              }`}
            >
              <Sparkles className="h-4 w-4" />
              <span>AI导师</span>
            </Link>

            <Link
              to="/wrong"
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive('/wrong')
                  ? 'bg-blue-900 text-white shadow-md'
                  : 'text-blue-100 hover:bg-blue-700'
              }`}
            >
              <AlertTriangle className="h-4 w-4" />
              <span>错题</span>
            </Link>
            
            <Link
              to="/materials"
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive('/materials')
                  ? 'bg-blue-900 text-white shadow-md'
                  : 'text-blue-100 hover:bg-blue-700'
              }`}
            >
              <FileText className="h-4 w-4" />
              <span>资料</span>
            </Link>
            <Link
              to="/questions"
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                isActive('/questions')
                  ? 'bg-blue-900 text-white shadow-md'
                  : 'text-blue-100 hover:bg-blue-700'
              }`}
            >
              <Settings className="h-4 w-4" />
              <span>题库</span>
            </Link>
          </div>

          <div className="hidden md:flex items-center space-x-3">
            <span className="text-sm text-blue-100">
              {user.username}
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium bg-blue-900 hover:bg-blue-950 transition-all shadow-md active:scale-95"
            >
              <LogOut className="h-4 w-4" />
              <span>退出</span>
            </button>
          </div>

          <div className="md:hidden flex items-center">
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden pb-4">
            <div className="flex flex-col space-y-2">
              <Link
                to="/"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                  isActive('/')
                    ? 'bg-blue-900 text-white'
                    : 'text-blue-100 hover:bg-blue-700'
                }`}
              >
                <Home className="h-5 w-5" />
                <span>首页</span>
              </Link>
              
              <Link
                to="/study"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                  isActive('/study')
                    ? 'bg-blue-900 text-white'
                    : 'text-blue-100 hover:bg-blue-700'
                }`}
              >
                <BookMarked className="h-5 w-5" />
                <span>学习</span>
              </Link>

              <Link
                to="/quiz"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                  isActive('/quiz')
                    ? 'bg-blue-900 text-white'
                    : 'text-blue-100 hover:bg-blue-700'
                }`}
              >
                <ClipboardCheck className="h-5 w-5" />
                <span>测验</span>
              </Link>
              
              <Link
                to="/ai-tutor"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                  isActive('/ai-tutor')
                    ? 'bg-blue-900 text-white'
                    : 'text-blue-100 hover:bg-blue-700'
                }`}
              >
                <Sparkles className="h-5 w-5" />
                <span>AI 通信导师</span>
              </Link>

              <Link
                to="/wrong"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                  isActive('/wrong')
                    ? 'bg-blue-900 text-white'
                    : 'text-blue-100 hover:bg-blue-700'
                }`}
              >
                <AlertTriangle className="h-5 w-5" />
                <span>错题集</span>
              </Link>
              
              <Link
                to="/materials"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                  isActive('/materials')
                    ? 'bg-blue-900 text-white'
                    : 'text-blue-100 hover:bg-blue-700'
                }`}
              >
                <FileText className="h-5 w-5" />
                <span>资料生成</span>
              </Link>
              <Link
                to="/questions"
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-all ${
                  isActive('/questions')
                    ? 'bg-blue-900 text-white'
                    : 'text-blue-100 hover:bg-blue-700'
                }`}
              >
                <Settings className="h-5 w-5" />
                <span>题库管理</span>
              </Link>
              
              <div className="border-t border-blue-600 pt-2 mt-2">
                <div className="px-4 py-2 text-sm text-blue-200">
                  欢迎, {user.username}
                </div>
                <button
                  onClick={handleLogout}
                  className="flex items-center space-x-3 w-full px-4 py-3 rounded-lg text-blue-100 hover:bg-blue-700 transition-all"
                >
                  <LogOut className="h-5 w-5" />
                  <span>退出登录</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}
