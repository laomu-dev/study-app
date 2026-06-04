import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, BookOpen, CheckCircle, RotateCcw } from 'lucide-react';
import { api } from '../lib/api';
import { WrongQuestion } from '../../shared/types';

function isCorrectOption(question: WrongQuestion['question'], optionIndex: number) {
  return Array.isArray(question.correctAnswer)
    ? question.correctAnswer.includes(optionIndex)
    : question.correctAnswer === optionIndex;
}

export function WrongQuestions() {
  const navigate = useNavigate();
  const [wrongQuestions, setWrongQuestions] = useState<WrongQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadWrongQuestions();
  }, []);

  const totalWrongAnswers = useMemo(
    () => wrongQuestions.reduce((sum, item) => sum + item.wrongCount, 0),
    [wrongQuestions],
  );

  const loadWrongQuestions = async () => {
    try {
      setIsLoading(true);
      setError('');
      const result: any = await api.study.getWrongQuestions();
      setWrongQuestions(result.questions || []);
    } catch (err: any) {
      setError(err.message || '错题加载失败');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">错题集</h1>
            <p className="text-gray-600">答错过的题目会自动归集到这里，方便集中复习。</p>
          </div>
          <button
            onClick={() => navigate('/study')}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
          >
            <RotateCcw className="h-5 w-5" />
            <span>继续复习</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">错题数量</p>
                <p className="text-3xl font-bold text-red-600">{wrongQuestions.length}</p>
              </div>
              <div className="bg-red-100 p-3 rounded-full">
                <AlertTriangle className="h-8 w-8 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">累计答错</p>
                <p className="text-3xl font-bold text-orange-600">{totalWrongAnswers}</p>
              </div>
              <div className="bg-orange-100 p-3 rounded-full">
                <BookOpen className="h-8 w-8 text-orange-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">复习建议</p>
                <p className="text-xl font-bold text-gray-900">先看高频错题</p>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <CheckCircle className="h-8 w-8 text-blue-600" />
              </div>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-red-700">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">错题加载中...</p>
          </div>
        ) : wrongQuestions.length === 0 ? (
          <div className="bg-white rounded-xl shadow-md p-12 text-center border border-gray-100">
            <CheckCircle className="h-14 w-14 text-green-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">还没有错题</h2>
            <p className="text-gray-600 mb-6">学习或测验时答错的题目会自动出现在这里。</p>
            <button
              onClick={() => navigate('/study')}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors"
            >
              <BookOpen className="h-5 w-5" />
              <span>开始学习</span>
            </button>
          </div>
        ) : (
          <div className="grid gap-6">
            {wrongQuestions.map(({ question, studyRecord, categoryName, wrongCount, accuracy }) => (
              <div key={question.id} className="bg-white rounded-xl shadow-md p-6 border border-gray-100">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-3">
                      {categoryName && (
                        <span className="px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium">
                          {categoryName}
                        </span>
                      )}
                      <span className="px-2.5 py-1 rounded-full bg-red-50 text-red-700 text-xs font-medium">
                        答错 {wrongCount} 次
                      </span>
                      <span className="px-2.5 py-1 rounded-full bg-gray-100 text-gray-700 text-xs font-medium">
                        正确率 {accuracy}%
                      </span>
                    </div>

                    <h2 className="text-lg font-semibold text-gray-900 leading-relaxed mb-4">
                      {question.content}
                    </h2>

                    <div className="space-y-2 mb-4">
                      {question.options.map((option, index) => {
                        const correct = isCorrectOption(question, index);

                        return (
                          <div
                            key={index}
                            className={`flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${
                              correct
                                ? 'border-green-200 bg-green-50 text-green-800'
                                : 'border-gray-200 bg-gray-50 text-gray-700'
                            }`}
                          >
                            <span className="font-semibold shrink-0">{String.fromCharCode(65 + index)}.</span>
                            <span className="flex-1">{option}</span>
                            {correct && <span className="text-xs font-medium shrink-0">正确答案</span>}
                          </div>
                        );
                      })}
                    </div>

                    {question.explanation && (
                      <div className="rounded-lg bg-slate-50 border border-slate-200 p-4 text-sm text-slate-700">
                        <span className="font-semibold">解析：</span>
                        {question.explanation}
                      </div>
                    )}
                  </div>

                  <div className="lg:w-48 rounded-lg bg-gray-50 border border-gray-200 p-4 text-sm text-gray-600">
                    <div className="flex justify-between mb-2">
                      <span>答题次数</span>
                      <span className="font-semibold text-gray-900">{studyRecord.reviewCount}</span>
                    </div>
                    <div className="flex justify-between mb-2">
                      <span>答对次数</span>
                      <span className="font-semibold text-green-700">{studyRecord.correctCount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>记忆强度</span>
                      <span className="font-semibold text-blue-700">{studyRecord.memoryStrength}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
