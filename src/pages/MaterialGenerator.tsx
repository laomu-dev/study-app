import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api';
import { Category } from '../../shared/types';
import { AlertCircle, BookOpen, Check, FileText, Upload, Wand2 } from 'lucide-react';

type ParsedQuestion = {
  content: string;
  options: string[];
  correctAnswer: number | number[];
  explanation?: string;
  categoryId: number;
};

export function MaterialGenerator() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number>(0);
  const [questionCount, setQuestionCount] = useState(20);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [message, setMessage] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const generateDisabledReason = !selectedCategory
    ? '请先选择目标题库'
    : !selectedFile
      ? '请先选择资料文件'
      : '';

  useEffect(() => {
    loadCategories();
  }, []);

  const loadCategories = async () => {
    try {
      const result: any = await api.questions.getCategories();
      const nextCategories = result.categories || [];
      setCategories(nextCategories);
      setSelectedCategory(nextCategories[0]?.id || 0);
      if (nextCategories.length === 0) {
        setErrors(['没有加载到题库分类，请确认后端服务是否正常。']);
      }
    } catch (error: any) {
      setCategories([]);
      setSelectedCategory(0);
      setErrors([error.message || '题库分类加载失败，请确认后端服务是否已启动。']);
    }
  };

  const generateQuestions = async () => {
    if (!selectedCategory) {
      setErrors(['请先选择目标题库']);
      return;
    }
    if (!selectedFile) {
      setErrors(['请先选择资料文件']);
      return;
    }

    try {
      setIsGenerating(true);
      setErrors([]);
      setMessage('');
      setParsedQuestions([]);

      const result: any = await api.materials.generate(selectedFile, questionCount, selectedCategory);
      setParsedQuestions(result.questions || []);
      setErrors(result.errors || []);
      setMessage(result.message || `已生成 ${result.questions?.length || 0} 道题`);
    } catch (error: any) {
      setErrors([error.message || '生成题目失败']);
    } finally {
      setIsGenerating(false);
    }
  };

  const importQuestions = async () => {
    if (parsedQuestions.length === 0) return;

    try {
      setIsImporting(true);
      setErrors([]);

      const result: any = await api.import.batchImport(parsedQuestions);
      setMessage(`导入完成：${result.success} 成功，${result.failed} 失败`);
      if (result.errors?.length) setErrors(result.errors);
    } catch (error: any) {
      setErrors([error.message || '导入失败']);
    } finally {
      setIsImporting(false);
    }
  };

  const isCorrectOption = (question: ParsedQuestion, index: number) => {
    return Array.isArray(question.correctAnswer)
      ? question.correctAnswer.includes(index)
      : question.correctAnswer === index;
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">资料生成题目</h1>
          <p className="text-gray-600">上传 PDF、Word、TXT 或 Markdown，直接生成可导入题库的题目草稿。</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <section className="lg:col-span-1 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3 mb-6">
              <div className="bg-blue-50 p-3 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">生成设置</h2>
                <p className="text-sm text-gray-600">选择题库和题量</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">目标题库</label>
                <select
                  value={selectedCategory}
                  onChange={(event) => setSelectedCategory(Number(event.target.value))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-500"
                  disabled={categories.length === 0}
                >
                  <option value={0}>
                    {categories.length === 0 ? '题库加载中或后端未连接' : '请选择题库'}
                  </option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id} className="bg-white text-gray-900">
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">生成题量</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={questionCount}
                  onChange={(event) => setQuestionCount(Number(event.target.value))}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                onClick={() => fileInputRef.current?.click()}
                className="w-full border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".docx,.doc,.pdf,.txt,.md"
                  className="hidden"
                  onChange={(event) => setSelectedFile(event.target.files?.[0] || null)}
                />
                <Upload className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                <span className="text-gray-700">{selectedFile ? selectedFile.name : '选择资料文件'}</span>
              </button>

              <button
                onClick={generateQuestions}
                disabled={isGenerating || !!generateDisabledReason}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold py-3 px-6 rounded-lg transition-colors inline-flex items-center justify-center space-x-2"
                title={generateDisabledReason}
              >
                <Wand2 className="h-5 w-5" />
                <span>{isGenerating ? '生成中...' : generateDisabledReason || '生成题目草稿'}</span>
              </button>
            </div>
          </section>

          <section className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div className="flex items-center space-x-3">
                <div className="bg-green-50 p-3 rounded-lg">
                  <BookOpen className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">题目预览</h2>
                  <p className="text-sm text-gray-600">生成后检查答案和解析</p>
                </div>
              </div>

              <button
                onClick={importQuestions}
                disabled={isImporting || parsedQuestions.length === 0}
                className="bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-bold py-3 px-5 rounded-lg transition-colors inline-flex items-center justify-center space-x-2"
              >
                <Check className="h-5 w-5" />
                <span>{isImporting ? '导入中...' : `确认导入 ${parsedQuestions.length} 道题`}</span>
              </button>
            </div>

            {message && (
              <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg">
                {message}
              </div>
            )}

            {errors.length > 0 && (
              <div className="mb-4 bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-lg">
                <div className="flex items-start space-x-2">
                  <AlertCircle className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <div>
                    {errors.map((error, index) => (
                      <p key={index}>{error}</p>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {parsedQuestions.length > 0 ? (
              <div className="space-y-3">
                {parsedQuestions.map((question, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <p className="font-bold text-gray-900 mb-3">{index + 1}. {question.content}</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {question.options.map((option, optionIndex) => (
                        <div
                          key={optionIndex}
                          className={`px-3 py-2 rounded-lg text-sm ${
                            isCorrectOption(question, optionIndex)
                              ? 'bg-green-50 text-green-700 border border-green-200'
                              : 'bg-gray-50 text-gray-600 border border-gray-100'
                          }`}
                        >
                          {String.fromCharCode(65 + optionIndex)}. {option}
                        </div>
                      ))}
                    </div>
                    {question.explanation && (
                      <p className="text-sm text-gray-600 mt-3">解析：{question.explanation}</p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-80 bg-gray-50 rounded-lg border border-dashed border-gray-300 flex items-center justify-center text-gray-500">
                上传资料并生成后，题目会显示在这里
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
