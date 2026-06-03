import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Category } from '../../shared/types';
import { CheckCircle, ClipboardCheck, RotateCcw, Send, XCircle } from 'lucide-react';

type AnswerValue = number | number[];

type QuizQuestion = {
  id: number;
  categoryId: number;
  content: string;
  options: string[];
  correctAnswer?: AnswerValue;
  isMultiple?: boolean;
  type?: 'single' | 'multiple' | 'judge';
};

type QuizResultQuestion = {
  questionId: number;
  content: string;
  options: string[];
  selectedAnswer: AnswerValue | null;
  correctAnswer: AnswerValue;
  isCorrect: boolean;
  explanation?: string;
};

type QuizResult = {
  total: number;
  correct: number;
  accuracy: number;
  results: QuizResultQuestion[];
};

function isResultQuestion(question: QuizQuestion | QuizResultQuestion): question is QuizResultQuestion {
  return 'questionId' in question;
}

export function Quiz() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | ''>('');
  const [limit, setLimit] = useState(20);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, AnswerValue>>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const response: any = await api.questions.getCategories();
      setCategories(response.categories || []);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  const startQuiz = async () => {
    try {
      setIsLoading(true);
      setError('');
      setResult(null);
      setAnswers({});
      const response: any = await api.quiz.start(selectedCategory || undefined, limit);
      setQuestions(response.questions || []);
    } catch (error: any) {
      setError(error.message || '创建测验失败');
    } finally {
      setIsLoading(false);
    }
  };

  const selectAnswer = (question: QuizQuestion, optionIndex: number) => {
    if (result) return;

    const isMultiple = question.isMultiple || Array.isArray(question.correctAnswer);
    setAnswers(prev => {
      if (!isMultiple) {
        return { ...prev, [question.id]: optionIndex };
      }

      const current = Array.isArray(prev[question.id]) ? [...prev[question.id] as number[]] : [];
      const existingIndex = current.indexOf(optionIndex);
      if (existingIndex >= 0) {
        current.splice(existingIndex, 1);
      } else {
        current.push(optionIndex);
      }

      const next = { ...prev };
      if (current.length === 0) {
        delete next[question.id];
      } else {
        next[question.id] = current;
      }
      return next;
    });
  };

  const isSelected = (questionId: number, optionIndex: number) => {
    const answer = answers[questionId];
    return Array.isArray(answer) ? answer.includes(optionIndex) : answer === optionIndex;
  };

  const isCorrectOption = (correctAnswer: AnswerValue | null, optionIndex: number) => {
    if (correctAnswer === null) return false;
    return Array.isArray(correctAnswer)
      ? correctAnswer.includes(optionIndex)
      : correctAnswer === optionIndex;
  };

  const submitQuiz = async () => {
    try {
      setIsLoading(true);
      setError('');
      const payload = questions.map(question => ({
        questionId: question.id,
        selectedAnswer: answers[question.id] ?? -1,
      }));
      const response: any = await api.quiz.submit(payload);
      setResult(response);
    } catch (error: any) {
      setError(error.message || '提交测验失败');
    } finally {
      setIsLoading(false);
    }
  };

  const resetQuiz = () => {
    setQuestions([]);
    setAnswers({});
    setResult(null);
    setError('');
  };

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <div className="flex items-center space-x-3 mb-6">
              <div className="bg-blue-50 p-3 rounded-xl">
                <ClipboardCheck className="h-8 w-8 text-blue-600" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">阶段测验</h1>
                <p className="text-gray-600">按题库抽题，集中检查最近的学习效果</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">选择题库</label>
                <select
                  value={selectedCategory}
                  onChange={(event) => setSelectedCategory(event.target.value ? Number(event.target.value) : '')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">全部题库</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>{category.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">测验题量</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={limit}
                  onChange={(event) => setLimit(Number(event.target.value))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
                {error}
              </div>
            )}

            <button
              onClick={startQuiz}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold py-4 px-6 rounded-lg transition-colors"
            >
              {isLoading ? '生成测验中...' : '开始测验'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const displayQuestions: Array<QuizQuestion | QuizResultQuestion> = result?.results || questions;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">阶段测验</h1>
            <p className="text-gray-600">共 {questions.length} 道题</p>
          </div>
          <button
            onClick={resetQuiz}
            className="inline-flex items-center space-x-2 px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50"
          >
            <RotateCcw className="h-4 w-4" />
            <span>重新设置</span>
          </button>
        </div>

        {result && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">测验结果</h2>
                <p className="text-gray-600">答对 {result.correct} / {result.total} 题</p>
              </div>
              <div className="text-4xl font-bold text-blue-600">{result.accuracy}%</div>
            </div>
          </div>
        )}

        <div className="space-y-5">
          {displayQuestions.map((question, questionIndex) => {
            const questionId = isResultQuestion(question) ? question.questionId : question.id;

            return (
              <div key={questionId} className="bg-white rounded-2xl shadow-md p-6">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <h2 className="text-lg font-bold text-gray-900">
                    {questionIndex + 1}. {question.content}
                  </h2>
                  {isResultQuestion(question) && (
                    question.isCorrect ? (
                      <CheckCircle className="h-6 w-6 text-green-500 flex-shrink-0" />
                    ) : (
                      <XCircle className="h-6 w-6 text-red-500 flex-shrink-0" />
                    )
                  )}
                </div>

                <div className="space-y-3">
                  {question.options.map((option, optionIndex) => {
                    const selected = isResultQuestion(question)
                      ? isCorrectOption(question.selectedAnswer, optionIndex)
                      : isSelected(question.id, optionIndex);
                    const correct = isResultQuestion(question)
                      ? isCorrectOption(question.correctAnswer, optionIndex)
                      : false;

                    return (
                      <button
                        key={optionIndex}
                        onClick={() => !isResultQuestion(question) && selectAnswer(question, optionIndex)}
                        disabled={Boolean(result)}
                        className={`w-full text-left p-4 rounded-lg border-2 transition-colors ${
                          result
                            ? correct
                              ? 'border-green-500 bg-green-50 text-green-800'
                              : selected
                                ? 'border-red-500 bg-red-50 text-red-800'
                                : 'border-gray-200 bg-gray-50 text-gray-600'
                            : selected
                              ? 'border-blue-500 bg-blue-50 text-blue-800'
                              : 'border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        {String.fromCharCode(65 + optionIndex)}. {option}
                      </button>
                    );
                  })}
                </div>

                {isResultQuestion(question) && question.explanation && (
                  <div className="mt-4 bg-gray-50 rounded-lg p-4 text-sm text-gray-600">
                    <span className="font-medium text-gray-800">解析：</span>{question.explanation}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {!result && (
          <button
            onClick={submitQuiz}
            disabled={isLoading}
            className="w-full mt-6 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-bold py-4 px-6 rounded-lg transition-colors inline-flex items-center justify-center space-x-2"
          >
            <Send className="h-5 w-5" />
            <span>{isLoading ? '提交中...' : '提交测验'}</span>
          </button>
        )}
      </div>
    </div>
  );
}
