
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { api } from '../lib/api';
import { BookOpen, CheckCircle, Calendar, TrendingUp, Play } from 'lucide-react';
import { Category } from '../../shared/types';

export function Home() {
  const navigate = useNavigate();
  const { user, progress, stats, setProgress, setStats } = useAppStore();
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      const [progressResult, statsResult]: any = await Promise.all([
        api.study.getProgress(),
        api.study.getStats(),
      ]);
      setProgress(progressResult.progress);
      setStats(statsResult.stats);

      const categoriesResult: any = await api.questions.getCategories();
      setCategories(categoriesResult.categories || []);
    } catch (error) {
      console.error('Failed to load data:', error);
    }
  };

  const startLearning = (categoryId?: number) => {
    navigate(categoryId ? `/study?categoryId=${categoryId}` : '/study');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            欢迎回来, {user?.username}!
          </h1>
          <p className="text-gray-600">今天是学习的好日子</p>
        </div>

        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-gray-900">选择题库学习</h2>
              <p className="text-sm text-gray-600">按题库进入学习，只练当前题库里的内容</p>
            </div>
            <button
              onClick={() => startLearning()}
              className="hidden sm:inline-flex items-center space-x-2 px-4 py-2 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-800"
            >
              <Play className="h-4 w-4" />
              <span>全部题库</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {categories.map((category) => (
              <button
                key={category.id}
                onClick={() => startLearning(category.id)}
                className="bg-white rounded-xl shadow-md p-5 text-left hover:shadow-lg hover:-translate-y-0.5 transition-all border border-gray-100"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900 mb-1">{category.name}</h3>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {category.description || '进入这个题库开始学习'}
                    </p>
                  </div>
                  <div className="bg-blue-50 p-2 rounded-lg">
                    <BookOpen className="h-5 w-5 text-blue-600" />
                  </div>
                </div>
                <div className="mt-4 inline-flex items-center space-x-2 text-blue-600 font-medium text-sm">
                  <Play className="h-4 w-4" />
                  <span>开始这个题库</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">今日待复习</p>
                <p className="text-3xl font-bold text-blue-600">
                  {progress?.dueToday || 0}
                </p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <Calendar className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">今日已完成</p>
                <p className="text-3xl font-bold text-green-600">
                  {progress?.reviewedToday || 0}
                </p>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <CheckCircle className="h-8 w-8 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">总题目数</p>
                <p className="text-3xl font-bold text-purple-600">
                  {progress?.totalQuestions || 0}
                </p>
              </div>
              <div className="bg-purple-100 p-3 rounded-full">
                <BookOpen className="h-8 w-8 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">正确率</p>
                <p className="text-3xl font-bold text-orange-600">
                  {progress?.accuracy || 0}%
                </p>
              </div>
              <div className="bg-orange-100 p-3 rounded-full">
                <TrendingUp className="h-8 w-8 text-orange-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-2xl shadow-lg p-8 text-white">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold mb-2">今日学习</h2>
                <p className="text-blue-200">基于艾宾浩斯记忆曲线的科学复习</p>
              </div>
              <BookOpen className="h-12 w-12 text-blue-200" />
            </div>

            <div className="mb-6">
              <div className="flex justify-between text-sm mb-2">
                <span>今日进度</span>
                <span>
                  {progress?.reviewedToday || 0} / {progress?.dueToday || 0}
                </span>
              </div>
              <div className="w-full bg-blue-900 rounded-full h-3">
                <div
                  className="bg-white rounded-full h-3 transition-all duration-500"
                  style={{
                    width: progress?.dueToday
                      ? `${(progress.reviewedToday / progress.dueToday) * 100}%`
                      : '0%',
                  }}
                />
              </div>
            </div>

            <button
              onClick={() => startLearning()}
              className="w-full bg-white text-blue-700 font-bold py-4 px-6 rounded-xl hover:bg-blue-50 transition-colors flex items-center justify-center space-x-2 shadow-lg hover:shadow-xl"
            >
              <Play className="h-5 w-5" />
              <span>开始学习</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-xl font-bold text-gray-800 mb-6">学习统计</h2>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <span className="text-gray-600">总练习次数</span>
                <span className="text-2xl font-bold text-gray-800">
                  {stats?.totalReviews || 0}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <span className="text-gray-600">正确次数</span>
                <span className="text-2xl font-bold text-green-600">
                  {stats?.totalCorrect || 0}
                </span>
              </div>

              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <span className="text-gray-600">平均正确率</span>
                <span className="text-2xl font-bold text-blue-600">
                  {stats?.accuracy || 0}%
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-8 border border-indigo-100">
          <h3 className="text-xl font-bold text-gray-800 mb-4">关于科学记忆法</h3>
          <p className="text-gray-600 mb-4">
            本系统采用艾宾浩斯记忆曲线原理，根据您的答题情况智能安排复习时间，
            帮助您更高效地记忆和巩固知识。
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4">
              <div className="text-3xl font-bold text-indigo-600 mb-1">科学</div>
              <div className="text-sm text-gray-600">基于心理学研究</div>
            </div>
            <div className="text-center p-4">
              <div className="text-3xl font-bold text-purple-600 mb-1">高效</div>
              <div className="text-sm text-gray-600">合理安排复习时间</div>
            </div>
            <div className="text-center p-4">
              <div className="text-3xl font-bold text-pink-600 mb-1">持久</div>
              <div className="text-sm text-gray-600">强化长期记忆</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
