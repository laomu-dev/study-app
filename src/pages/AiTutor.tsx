import { FormEvent, KeyboardEvent, useEffect, useRef, useState } from 'react';
import { BookOpen, MessageCircle, RotateCcw, Send, Sparkles } from 'lucide-react';
import { Category } from '../../shared/types';
import { api } from '../lib/api';

type Reference = {
  questionId: number;
  content: string;
};

type ChatMessage = {
  role: 'user' | 'assistant';
  content: string;
  keyPoints?: string[];
  suggestedQuestions?: string[];
  references?: Reference[];
};

const welcomeMessage: ChatMessage = {
  role: 'assistant',
  content: '选择一个题库或使用全部题库，然后输入你想学习的通信知识。我会先结合你的题库讲解，再补充必要的拓展内容。',
  suggestedQuestions: [
    '帮我梳理光纤通信的核心知识',
    '从基础开始讲解通信线路工程验收',
    '根据我的题库找出最容易混淆的概念',
  ],
};

export function AiTutor() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | ''>('');
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMessage]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    api.questions.getCategories()
      .then((result: any) => setCategories(result.categories || []))
      .catch(() => setError('题库列表加载失败'));
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const sendMessage = async (text: string) => {
    const question = text.trim();
    if (!question || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: question };
    const history = messages
      .filter(message => message !== welcomeMessage)
      .map(message => ({ role: message.role, content: message.content }))
      .slice(-8);

    setMessages(previous => [...previous, userMessage]);
    setInput('');
    setError('');
    setIsLoading(true);

    try {
      const result: any = await api.tutor.chat(
        question,
        selectedCategory || undefined,
        history,
      );
      setMessages(previous => [...previous, {
        role: 'assistant',
        content: result.answer,
        keyPoints: result.keyPoints || [],
        suggestedQuestions: result.suggestedQuestions || [],
        references: result.references || [],
      }]);
    } catch (requestError: any) {
      setError(requestError.message || 'AI 导师暂时无法回答，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    void sendMessage(input);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void sendMessage(input);
    }
  };

  const resetChat = () => {
    setMessages([welcomeMessage]);
    setInput('');
    setError('');
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
          <div>
            <div className="flex items-center gap-3">
              <Sparkles className="h-7 w-7 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">AI 通信导师</h1>
            </div>
            <p className="text-gray-600 mt-2">结合个人题库进行讲解、拓展和追问学习</p>
          </div>
          <button
            onClick={resetChat}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 rounded-lg text-gray-700"
          >
            <RotateCcw className="h-4 w-4" />
            新对话
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[260px_minmax(0,1fr)] gap-5">
          <aside className="bg-white border border-gray-200 rounded-lg p-4 h-fit">
            <label className="block text-sm font-medium text-gray-700 mb-2">学习范围</label>
            <select
              value={selectedCategory}
              onChange={event => setSelectedCategory(event.target.value ? Number(event.target.value) : '')}
              className="w-full px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="">全部个人题库</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>

            <div className="mt-6">
              <div className="flex items-center gap-2 text-sm font-medium text-gray-800 mb-3">
                <BookOpen className="h-4 w-4 text-blue-600" />
                学习方式
              </div>
              <div className="space-y-2 text-sm text-gray-600">
                <p>概念讲解与知识拓展</p>
                <p>题目依据与易错点分析</p>
                <p>继续追问与学习引导</p>
              </div>
            </div>
          </aside>

          <section className="bg-white border border-gray-200 rounded-lg min-h-[640px] flex flex-col overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div className={`max-w-3xl ${message.role === 'user' ? 'w-auto' : 'w-full'}`}>
                    <div
                      className={`px-4 py-3 rounded-lg whitespace-pre-wrap leading-7 ${
                        message.role === 'user'
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-50 border border-gray-200 text-gray-800'
                      }`}
                    >
                      {message.content}
                    </div>

                    {message.keyPoints && message.keyPoints.length > 0 && (
                      <div className="mt-3 border-l-4 border-green-500 bg-green-50 px-4 py-3">
                        <div className="font-semibold text-green-900 mb-2">知识要点</div>
                        <ul className="space-y-1 text-sm text-green-900">
                          {message.keyPoints.map((point, pointIndex) => (
                            <li key={pointIndex}>{pointIndex + 1}. {point}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {message.references && message.references.length > 0 && (
                      <div className="mt-3">
                        <div className="text-xs font-medium text-gray-500 mb-2">相关题库依据</div>
                        <div className="space-y-2">
                          {message.references.map(reference => (
                            <div key={reference.questionId} className="text-sm bg-blue-50 text-blue-900 px-3 py-2 rounded-lg">
                              题目 #{reference.questionId}：{reference.content}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {message.suggestedQuestions && message.suggestedQuestions.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {message.suggestedQuestions.map(suggestion => (
                          <button
                            key={suggestion}
                            onClick={() => void sendMessage(suggestion)}
                            disabled={isLoading}
                            className="text-left text-sm px-3 py-2 border border-blue-200 text-blue-700 hover:bg-blue-50 rounded-lg disabled:opacity-50"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex items-center gap-3 text-gray-600">
                  <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full" />
                  AI 导师正在整理题库和拓展知识...
                </div>
              )}
              <div ref={endRef} />
            </div>

            <div className="border-t border-gray-200 p-4">
              {error && <div className="text-sm text-red-600 mb-3">{error}</div>}
              <form onSubmit={handleSubmit} className="flex gap-3 items-end">
                <div className="flex-1">
                  <textarea
                    value={input}
                    onChange={event => setInput(event.target.value)}
                    onKeyDown={handleKeyDown}
                    rows={3}
                    maxLength={2000}
                    placeholder="输入想学习的问题，例如：OTDR 是如何定位光纤故障的？"
                    className="w-full resize-none px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  title="发送"
                  className="h-12 w-12 flex items-center justify-center bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white rounded-lg"
                >
                  <Send className="h-5 w-5" />
                </button>
              </form>
              <div className="flex items-center gap-2 text-xs text-gray-500 mt-2">
                <MessageCircle className="h-3.5 w-3.5" />
                Enter 发送，Shift + Enter 换行
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
