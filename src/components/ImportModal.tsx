import { useState, useRef } from 'react';
import { Upload, X, FileText, Check, AlertCircle, ChevronDown, Download } from 'lucide-react';
import { api } from '../lib/api';
import { Category } from '../../shared/types';

interface ParsedQuestion {
  content: string;
  options: string[];
  correctAnswer: number | number[];
  isMultiple?: boolean;
  type?: 'single' | 'multiple' | 'judge';
  explanation?: string;
  categoryId: number;
}

interface ImportModalProps {
  categories: Category[];
  initialCategoryId?: number;
  onClose: () => void;
  onImportComplete: () => void;
}

export function ImportModal({ categories, initialCategoryId, onClose, onImportComplete }: ImportModalProps) {
  const [selectedCategory, setSelectedCategory] = useState<number>(initialCategoryId || categories[0]?.id || 0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestion[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: number; failed: number } | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isCorrectOption = (question: ParsedQuestion, index: number) => {
    return Array.isArray(question.correctAnswer)
      ? question.correctAnswer.includes(index)
      : question.correctAnswer === index;
  };

  const handleDownloadTemplate = () => {
    const rows = [
      ['题目', '选项A', '选项B', '选项C', '选项D', '选项E', '选项F', '选项G', '选项H', '答案', '解析'],
      ['光纤通信中常用的三个波长窗口包括？', '850nm', '1310nm', '1550nm', '以上都是', '', '', '', '', 'D', '850nm、1310nm、1550nm 都是常用窗口'],
      ['TCP/IP 协议中，IP 层对应 OSI 模型的哪一层？', '数据链路层', '网络层', '传输层', '应用层', '', '', '', '', 'B', 'IP 协议工作在网络层'],
      ['下面哪些属于多选题示例？', '选项一', '选项二', '选项三', '选项四', '', '', '', '', 'AC', '多选题答案可填写 AB、ACD 等'],
    ];

    const escapeCsvCell = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const csv = rows.map(row => row.map(escapeCsvCell).join(',')).join('\r\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = '题目导入标准模板.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setParsedQuestions([]);
      setErrors([]);
      setImportResult(null);
      setShowPreview(false);
    }
  };

  const handleParse = async () => {
    console.log('handleParse 被调用');
    console.log('selectedFile:', selectedFile);
    console.log('selectedCategory:', selectedCategory);
    
    if (!selectedFile || !selectedCategory) {
      console.log('文件或分类未选择');
      if (!selectedFile) setErrors(['请先选择文件']);
      if (!selectedCategory) setErrors(['请先选择分类']);
      return;
    }

    setIsLoading(true);
    setErrors([]);
    setParsedQuestions([]);

    try {
      console.log('开始调用 API');
      const result = await api.import.parseFile(selectedFile, selectedCategory);
      console.log('API 响应:', result);
      
      if (result.success && result.questions.length > 0) {
        setParsedQuestions(result.questions);
        setErrors(result.errors || []);
        setShowPreview(true);
      } else {
        setErrors(['未能解析出题目，请检查文件格式']);
      }
    } catch (error: any) {
      console.error('解析错误:', error);
      setErrors([error.message || '解析文件失败']);
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (parsedQuestions.length === 0) return;

    setIsImporting(true);
    try {
      const result: any = await api.import.batchImport(parsedQuestions);
      setImportResult({ success: result.success, failed: result.failed });
      
      if (result.success > 0) {
        setTimeout(() => {
          onImportComplete();
          onClose();
        }, 1500);
      }
    } catch (error: any) {
      setErrors([error.message || '导入失败']);
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-6 border-b flex justify-between items-center bg-gradient-to-r from-green-500 to-teal-500">
          <div className="flex items-center space-x-3">
            <Upload className="h-6 w-6 text-white" />
            <h2 className="text-2xl font-bold text-white">批量导入题目</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-white hover:bg-opacity-20 rounded-lg transition-colors"
          >
            <X className="h-6 w-6 text-white" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {!showPreview ? (
            <div className="space-y-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="font-semibold text-blue-800 mb-2">推荐使用标准 CSV 模板</h3>
                    <ul className="text-sm text-blue-700 space-y-1">
                      <li>按固定列填写：题目、选项A-H、答案、解析。</li>
                      <li>单选答案填 A/B/C/D，多选答案填 AB、ACD。</li>
                      <li>保存为 CSV 后上传，解析准确率最高。</li>
                    </ul>
                  </div>
                  <button
                    type="button"
                    onClick={handleDownloadTemplate}
                    className="inline-flex shrink-0 items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
                  >
                    <Download className="h-4 w-4" />
                    <span>下载标准模板</span>
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  选择分类
                </label>
                <div className="relative">
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(parseInt(e.target.value))}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 appearance-none"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div
                className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-green-500 transition-colors cursor-pointer"
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".docx,.doc,.txt,.csv,.json,.pdf"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                {selectedFile ? (
                  <div>
                    <p className="text-green-600 font-medium">{selectedFile.name}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                ) : (
                  <div>
                    <p className="text-gray-600">点击或拖拽文件到这里</p>
                    <p className="text-sm text-gray-400 mt-1">支持 docx, pdf, txt, csv, json 格式</p>
                  </div>
                )}
              </div>

              {errors.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="h-5 w-5 text-yellow-500 mt-0.5" />
                    <div>
                      <p className="font-medium text-yellow-800">警告</p>
                      {errors.map((err, i) => (
                        <p key={i} className="text-sm text-yellow-700">{err}</p>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-700 mb-2">CSV 格式示例：</h3>
                <div className="text-sm text-gray-600 space-y-2 font-mono overflow-x-auto">
                  <p>题目,A,B,C,D,答案,解析</p>
                  <p>光纤通信常用波长窗口是？,850nm,1310nm,1550nm,以上都是,D,三种波长都常见</p>
                  <p>TCP/IP 中 IP 层对应 OSI 哪一层？,数据链路层,网络层,传输层,应用层,B,IP 工作在网络层</p>
                </div>
                <div className="text-sm text-gray-600 mt-4 space-y-2 font-mono">
                  <p>文本/Word 也支持这种题块：</p>
                  <p>1. 题目内容是什么？</p>
                  <p>A. 选项一</p>
                  <p>B. 选项二</p>
                  <p>C. 选项三</p>
                  <p>D. 选项四</p>
                  <p className="text-green-600">答案：B</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center space-x-3">
                  <Check className="h-6 w-6 text-green-500" />
                  <div>
                    <p className="font-medium text-green-800">
                      成功解析 {parsedQuestions.length} 道题目
                    </p>
                    {errors.length > 0 && (
                      <p className="text-sm text-yellow-600">
                        {errors.length} 道题目解析失败
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-sm text-green-600 hover:text-green-800"
                >
                  重新选择文件
                </button>
              </div>

              <div className="max-h-96 overflow-y-auto space-y-3">
                {parsedQuestions.map((q, index) => (
                  <div key={index} className="bg-white border rounded-lg p-4">
                    <p className="font-medium text-gray-800 mb-2">
                      {index + 1}. {q.content}
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      {q.options.map((opt, i) => (
                        <div
                          key={i}
                          className={`px-3 py-1 rounded ${
                            isCorrectOption(q, i)
                              ? 'bg-green-100 text-green-700 border border-green-300'
                              : 'bg-gray-50 text-gray-600'
                          }`}
                        >
                          {String.fromCharCode(65 + i)}. {opt}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t bg-gray-50 flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
          >
            取消
          </button>
          {!showPreview ? (
            <button
              onClick={handleParse}
              disabled={!selectedFile || isLoading}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>解析中...</span>
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  <span>解析文件</span>
                </>
              )}
            </button>
          ) : !importResult ? (
            <button
              onClick={handleImport}
              disabled={isImporting}
              className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            >
              {isImporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  <span>导入中...</span>
                </>
              ) : (
                <>
                  <Check className="h-4 w-4" />
                  <span>确认导入</span>
                </>
              )}
            </button>
          ) : (
            <div className="flex items-center space-x-2 text-green-600">
              <Check className="h-5 w-5" />
              <span>导入完成！</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
