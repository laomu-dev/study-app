
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppStore } from '../store';
import { api } from '../lib/api';
import { Category, DailyTask } from '../../shared/types';
import { CheckCircle, XCircle, RotateCcw, Home, Trophy } from 'lucide-react';
import { DEFAULT_DAILY_LIMIT } from '../../shared/studySettings';

export function Study() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, todayTasks, setTodayTasks } = useAppStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | number[] | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [completed, setCompleted] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const autoNextTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const categoryId = searchParams.get('categoryId') ? parseInt(searchParams.get('categoryId')!, 10) : undefined;
  const currentCategory = categories.find(category => category.id === categoryId);

  const currentTask: DailyTask | null = todayTasks[currentIndex] || null;
  
  const isMultiple = currentTask?.question.isMultiple || Array.isArray(currentTask?.question.correctAnswer);
  const isJudge = currentTask?.question.type === 'judge';

  useEffect(() => {
    if (user) {
      loadTasks();
    }
  }, [user, categoryId]);

  useEffect(() => {
    return () => {
      if (autoNextTimerRef.current) {
        clearTimeout(autoNextTimerRef.current);
      }
    };
  }, []);

  const loadTasks = async () => {
    try {
      if (autoNextTimerRef.current) {
        clearTimeout(autoNextTimerRef.current);
        autoNextTimerRef.current = null;
      }
      setIsLoading(true);
      const [tasksResult, categoriesResult]: any = await Promise.all([
        api.study.getTodayTasks(DEFAULT_DAILY_LIMIT, categoryId),
        api.questions.getCategories(),
      ]);
      setCategories(categoriesResult.categories || []);
      setTodayTasks(tasksResult.tasks);
      setCurrentIndex(0);
      setSelectedAnswer(null);
      setShowResult(false);
      setIsSubmitting(false);
      setCompleted(false);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNext = () => {
    if (autoNextTimerRef.current) {
      clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = null;
    }

    if (currentIndex < todayTasks.length - 1) {
      setCurrentIndex(index => index + 1);
      setSelectedAnswer(null);
      setShowResult(false);
      setIsSubmitting(false);
    } else {
      setCompleted(true);
    }
  };

  const submitAnswer = async (answer: number | number[]) => {
    if (!currentTask || isSubmitting) return;

    try {
      setIsSubmitting(true);
      const result: any = await api.study.submitAnswer(
        currentTask.question.id,
        answer
      );
      setIsCorrect(result.isCorrect);
      setShowResult(true);
      autoNextTimerRef.current = setTimeout(handleNext, result.isCorrect ? 400 : 4000);
    } catch (error) {
      console.error('Failed to submit answer:', error);
      setIsSubmitting(false);
    }
  };

  const handleSelectAnswer = (index: number) => {
    if (showResult || isSubmitting) return;

    if (isMultiple) {
      setSelectedAnswer(prev => {
        const current = Array.isArray(prev) ? [...prev] : [];
        const indexPos = current.indexOf(index);
        if (indexPos > -1) {
          current.splice(indexPos, 1);
        } else {
          current.push(index);
        }
        return current.length > 0 ? current : null;
      });
      return;
    }

    setSelectedAnswer(index);
    void submitAnswer(index);
  };

  const handleSubmit = () => {
    if (selectedAnswer === null) return;
    void submitAnswer(selectedAnswer);
  };

  const handleRestart = () => {
    if (autoNextTimerRef.current) {
      clearTimeout(autoNextTimerRef.current);
      autoNextTimerRef.current = null;
    }
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setShowResult(false);
    setIsSubmitting(false);
    setCompleted(false);
    loadTasks();
  };

  const handleGoHome = () => {
    navigate('/');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载中...</p>
        </div>
      </div>
    );
  }

  if (todayTasks.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <Trophy className="h-24 w-24 text-yellow-500 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-gray-800 mb-4">太棒了！</h2>
          <p className="text-gray-600 mb-8">
            {currentCategory ? `${currentCategory.name} 今天没有需要复习的题目` : '今天没有需要复习的题目'}
          </p>
          <button
            onClick={handleGoHome}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition-colors"
          >
            返回首页
          </button>
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <Trophy className="h-24 w-24 text-yellow-500 mx-auto mb-6" />
          <h2 className="text-3xl font-bold text-gray-800 mb-4">完成！</h2>
          <p className="text-gray-600 mb-8">
            您已完成今日所有学习任务，继续保持！
          </p>
          <div className="space-x-4">
            <button
              onClick={handleRestart}
              className="bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors inline-flex items-center space-x-2"
            >
              <RotateCcw className="h-5 w-5" />
              <span>再学一遍</span>
            </button>
            <button
              onClick={handleGoHome}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors inline-flex items-center space-x-2"
            >
              <Home className="h-5 w-5" />
              <span>返回首页</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const progress = ((currentIndex + 1) / todayTasks.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <div className="mb-4">
            <button
              onClick={handleGoHome}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              返回题库选择
            </button>
            <h1 className="text-2xl font-bold text-gray-900 mt-2">
              {currentCategory ? currentCategory.name : '全部题库'}
            </h1>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-600">
              第 {currentIndex + 1} 题 / 共 {todayTasks.length} 题
            </span>
            {currentTask?.isNew && (
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                新题
              </span>
            )}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {currentTask && (
          <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 p-6 text-white">
              <h2 className="text-xl font-bold mb-2">{currentTask.question.content}</h2>
            </div>

            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-700">
                  {isJudge ? '（判断题）' : isMultiple ? '（多选，可选择多个答案）' : '（单选）'}
                </h3>
              </div>
              
              <div className={`space-y-3 mb-6 ${isJudge ? 'flex gap-4' : ''}`}>
                {currentTask.question.options.map((option, index) => {
                  let buttonClass = isJudge
                    ? 'flex-1 text-center p-4 rounded-lg border-2 transition-all duration-200 text-lg font-semibold '
                    : 'w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ';

                  const isSelected = isMultiple
                    ? (Array.isArray(selectedAnswer) && selectedAnswer.includes(index))
                    : index === selectedAnswer;
                  
                  const correctAnswer = currentTask.question.correctAnswer;
                  const isCorrectAnswer = Array.isArray(correctAnswer)
                    ? correctAnswer.includes(index)
                    : index === correctAnswer;
                  
                  const isWrongSelected = showResult && isSelected && !isCorrectAnswer;

                  if (showResult) {
                    if (isCorrectAnswer) {
                      buttonClass += 'border-green-500 bg-green-50 text-green-800';
                    } else if (isWrongSelected) {
                      buttonClass += 'border-red-500 bg-red-50 text-red-800';
                    } else {
                      buttonClass += 'border-gray-200 bg-gray-50 text-gray-500';
                    }
                  } else {
                    buttonClass +=
                      isSelected
                        ? 'border-blue-500 bg-blue-50 text-blue-800 ring-2 ring-blue-200'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50';
                  }

                  return (
                    <button
                      key={index}
                      onClick={() => handleSelectAnswer(index)}
                      disabled={showResult || isSubmitting}
                      className={buttonClass}
                    >
                      <div className="flex items-center justify-center">
                        <span className="font-medium">
                          {isJudge ? option : `${String.fromCharCode(65 + index)}. ${option}`}
                        </span>
                        {showResult && isCorrectAnswer && (
                          <CheckCircle className="h-6 w-6 text-green-500 ml-2" />
                        )}
                        {showResult && isWrongSelected && (
                          <XCircle className="h-6 w-6 text-red-500 ml-2" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {showResult && (
                <div
                  className={`p-4 rounded-lg mb-6 ${
                    isCorrect ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                  }`}
                >
                  <div className="flex items-center space-x-2 mb-2">
                    {isCorrect ? (
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    ) : (
                      <XCircle className="h-6 w-6 text-red-600" />
                    )}
                    <span
                      className={`font-bold text-lg ${
                        isCorrect ? 'text-green-800' : 'text-red-800'
                      }`}
                    >
                      {isCorrect ? '回答正确！' : '回答错误'}
                    </span>
                  </div>
                  {currentTask.question.explanation && (
                    <p
                      className={`text-sm ${
                        isCorrect ? 'text-green-700' : 'text-red-700'
                      }`}
                    >
                      {currentTask.question.explanation}
                    </p>
                  )}
                </div>
              )}

              {!showResult && isMultiple ? (
                <button
                  onClick={handleSubmit}
                  disabled={selectedAnswer === null || isSubmitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-lg transition-colors"
                >
                  {isSubmitting ? '正在判定...' : '提交多选答案'}
                </button>
              ) : !showResult ? (
                <div className="w-full bg-blue-50 border border-blue-200 text-blue-800 font-medium py-4 px-6 rounded-lg text-center">
                  {isSubmitting ? '正在判定...' : '点击一个选项即可作答'}
                </div>
              ) : (
                <div
                  className={`w-full border font-medium py-4 px-6 rounded-lg text-center ${
                    isCorrect
                      ? 'bg-green-50 border-green-200 text-green-800'
                      : 'bg-red-50 border-red-200 text-red-800'
                  }`}
                >
                  {isCorrect
                    ? '回答正确，正在进入下一题...'
                    : '请查看解析，稍后自动进入下一题...'}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
