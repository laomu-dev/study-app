
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../store';
import { api } from '../lib/api';
import { DailyTask } from '../../shared/types';
import { CheckCircle, XCircle, ArrowRight, RotateCcw, Home, Trophy } from 'lucide-react';

export function Study() {
  const navigate = useNavigate();
  const { user, todayTasks, setTodayTasks } = useAppStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [completed, setCompleted] = useState(false);

  const currentTask: DailyTask | null = todayTasks[currentIndex] || null;

  useEffect(() => {
    if (user) {
      loadTasks();
    }
  }, [user]);

  const loadTasks = async () => {
    try {
      setIsLoading(true);
      const result: any = await api.study.getTodayTasks();
      setTodayTasks(result.tasks);
    } catch (error) {
      console.error('Failed to load tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAnswer = (index: number) => {
    if (showResult) return;
    setSelectedAnswer(index);
  };

  const handleSubmit = async () => {
    if (selectedAnswer === null || !currentTask) return;

    try {
      const result: any = await api.study.submitAnswer(
        currentTask.question.id,
        selectedAnswer
      );
      setIsCorrect(result.isCorrect);
      setShowResult(true);
    } catch (error) {
      console.error('Failed to submit answer:', error);
    }
  };

  const handleNext = () => {
    if (currentIndex < todayTasks.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSelectedAnswer(null);
      setShowResult(false);
    } else {
      setCompleted(true);
    }
  };

  const handleRestart = () => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setShowResult(false);
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
          <p className="text-gray-600 mb-8">今天没有需要复习的题目</p>
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
              <div className="space-y-3 mb-6">
                {currentTask.question.options.map((option, index) => {
                  let buttonClass =
                    'w-full text-left p-4 rounded-lg border-2 transition-all duration-200 ';

                  if (showResult) {
                    if (index === currentTask.question.correctAnswer) {
                      buttonClass += 'border-green-500 bg-green-50 text-green-800';
                    } else if (index === selectedAnswer) {
                      buttonClass += 'border-red-500 bg-red-50 text-red-800';
                    } else {
                      buttonClass += 'border-gray-200 bg-gray-50 text-gray-500';
                    }
                  } else {
                    buttonClass +=
                      index === selectedAnswer
                        ? 'border-blue-500 bg-blue-50 text-blue-800 ring-2 ring-blue-200'
                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50';
                  }

                  return (
                    <button
                      key={index}
                      onClick={() => handleSelectAnswer(index)}
                      disabled={showResult}
                      className={buttonClass}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">
                          {String.fromCharCode(65 + index)}. {option}
                        </span>
                        {showResult && index === currentTask.question.correctAnswer && (
                          <CheckCircle className="h-6 w-6 text-green-500" />
                        )}
                        {showResult &&
                          index === selectedAnswer &&
                          index !== currentTask.question.correctAnswer && (
                            <XCircle className="h-6 w-6 text-red-500" />
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

              {!showResult ? (
                <button
                  onClick={handleSubmit}
                  disabled={selectedAnswer === null}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-lg transition-colors"
                >
                  提交答案
                </button>
              ) : (
                <button
                  onClick={handleNext}
                  className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 px-6 rounded-lg transition-colors flex items-center justify-center space-x-2"
                >
                  <span>{currentIndex < todayTasks.length - 1 ? '下一题' : '完成'}</span>
                  <ArrowRight className="h-5 w-5" />
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
