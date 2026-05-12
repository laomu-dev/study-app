
import { useEffect, useState } from 'react';
import { useAppStore } from '../store';
import { api } from '../lib/api';
import { Question, Category } from '../../shared/types';
import { Plus, Edit, Trash2, BookOpen, Save, X } from 'lucide-react';

export function Questions() {
  const { user } = useAppStore();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [formData, setFormData] = useState({
    categoryId: 0,
    content: '',
    options: ['', '', '', ''],
    correctAnswer: 0,
    explanation: '',
  });

  useEffect(() => {
    if (user?.role === 'admin') {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [questionsResult, categoriesResult]: any = await Promise.all([
        api.questions.getAll(selectedCategory),
        api.questions.getCategories(),
      ]);
      setQuestions(questionsResult.questions);
      setCategories(categoriesResult.categories);
      if (categoriesResult.categories.length > 0 && !formData.categoryId) {
        setFormData(prev => ({ ...prev, categoryId: categoriesResult.categories[0].id }));
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleEdit = (question: Question) => {
    setEditingQuestion(question);
    setFormData({
      categoryId: question.categoryId,
      content: question.content,
      options: [...question.options],
      correctAnswer: question.correctAnswer,
      explanation: question.explanation || '',
    });
    setShowModal(true);
  };

  const handleCreate = () => {
    setEditingQuestion(null);
    setFormData({
      categoryId: categories.length > 0 ? categories[0].id : 0,
      content: '',
      options: ['', '', '', ''],
      correctAnswer: 0,
      explanation: '',
    });
    setShowModal(true);
  };

  const handleDelete = async (id: number) => {
    if (!confirm('确定要删除这个题目吗？')) return;

    try {
      await api.questions.delete(id);
      loadData();
    } catch (error) {
      console.error('Failed to delete question:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingQuestion) {
        await api.questions.update(editingQuestion.id, formData);
      } else {
        await api.questions.create(formData);
      }
      setShowModal(false);
      loadData();
    } catch (error) {
      console.error('Failed to save question:', error);
    }
  };

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...formData.options];
    newOptions[index] = value;
    setFormData(prev => ({ ...prev, options: newOptions }));
  };

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">权限不足</h2>
          <p className="text-gray-600">只有管理员可以访问此页面</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">题库管理</h1>
            <p className="text-gray-600">管理和维护学习题目</p>
          </div>
          <button
            onClick={handleCreate}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center space-x-2"
          >
            <Plus className="h-5 w-5" />
            <span>添加题目</span>
          </button>
        </div>

        <div className="mb-6">
          <select
            value={selectedCategory || ''}
            onChange={(e) => setSelectedCategory(e.target.value ? parseInt(e.target.value) : null)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="">所有分类</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">加载中...</p>
          </div>
        ) : (
          <div className="grid gap-6">
            {questions.map((question) => (
              <div
                key={question.id}
                className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-3">
                      <BookOpen className="h-5 w-5 text-blue-600" />
                      <span className="text-lg font-semibold text-gray-800">
                        {question.content}
                      </span>
                    </div>
                    <div className="space-y-2 mb-4">
                      {question.options.map((option, index) => (
                        <div
                          key={index}
                          className={`flex items-center space-x-2 text-sm ${
                            index === question.correctAnswer
                              ? 'text-green-600 font-medium'
                              : 'text-gray-600'
                          }`}
                        >
                          <span>{String.fromCharCode(65 + index)}.</span>
                          <span>{option}</span>
                          {index === question.correctAnswer && (
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
                              正确答案
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                    {question.explanation && (
                      <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                        <span className="font-medium">解析：</span>
                        {question.explanation}
                      </p>
                    )}
                  </div>
                  <div className="flex space-x-2 ml-4">
                    <button
                      onClick={() => handleEdit(question)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                      <Edit className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(question.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {questions.length === 0 && (
              <div className="text-center py-12 bg-white rounded-xl shadow-md">
                <p className="text-gray-600">暂无题目</p>
              </div>
            )}
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-bold text-gray-800">
                    {editingQuestion ? '编辑题目' : '添加题目'}
                  </h2>
                  <button
                    onClick={() => setShowModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="h-6 w-6 text-gray-500" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    分类
                  </label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) =>
                      setFormData(prev => ({ ...prev, categoryId: parseInt(e.target.value) }))
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    题目内容
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) =>
                      setFormData(prev => ({ ...prev, content: e.target.value }))
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    required
                  />
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700">
                    选项
                  </label>
                  {formData.options.map((option, index) => (
                    <div key={index} className="flex items-center space-x-3">
                      <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                          type="radio"
                          name="correctAnswer"
                          checked={formData.correctAnswer === index}
                          onChange={() =>
                            setFormData(prev => ({ ...prev, correctAnswer: index }))
                          }
                          className="h-4 w-4 text-blue-600"
                        />
                        <span className="text-sm font-medium text-gray-700">
                          {String.fromCharCode(65 + index)}.
                        </span>
                      </label>
                      <input
                        type="text"
                        value={option}
                        onChange={(e) => handleOptionChange(index, e.target.value)}
                        className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder={`选项 ${String.fromCharCode(65 + index)}`}
                        required
                      />
                    </div>
                  ))}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    解析（可选）
                  </label>
                  <textarea
                    value={formData.explanation}
                    onChange={(e) =>
                      setFormData(prev => ({ ...prev, explanation: e.target.value }))
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows={3}
                  />
                </div>

                <div className="flex justify-end space-x-4 pt-4 border-t">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-6 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center space-x-2"
                  >
                    <Save className="h-5 w-5" />
                    <span>保存</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
