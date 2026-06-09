import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Download,
  FileSliders,
  Flag,
  Layers3,
  Loader2,
  RefreshCw,
  Sparkles,
  Target,
} from 'lucide-react';
import { Category } from '../../shared/types';
import { api } from '../lib/api';
import { exportTopicStudyPpt, type TopicStudyData } from '../lib/topicPpt';

export function TopicStudy() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | ''>('');
  const [topic, setTopic] = useState<TopicStudyData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.questions.getCategories()
      .then((result: any) => setCategories(result.categories || []))
      .catch(() => setError('题库列表加载失败'));
  }, []);

  const generateTopic = async () => {
    try {
      setIsLoading(true);
      setError('');
      const result: any = await api.topicStudy.generate(selectedCategory || undefined);
      setTopic(result);
    } catch (requestError: any) {
      setError(requestError.message || '专题学习内容生成失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  const exportPpt = async () => {
    if (!topic) return;
    try {
      setIsExporting(true);
      setError('');
      await exportTopicStudyPpt(topic);
    } catch (exportError: any) {
      setError(exportError.message || 'PPT 导出失败，请稍后重试');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
          <div>
            <div className="flex items-center gap-3">
              <Layers3 className="h-7 w-7 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">专题学习</h1>
            </div>
            <p className="text-gray-600 mt-2">把题库、知识脉络和个人掌握度组织成完整专题</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={selectedCategory}
              onChange={event => setSelectedCategory(event.target.value ? Number(event.target.value) : '')}
              className="min-w-[220px] px-3 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">全部个人题库</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>{category.name}</option>
              ))}
            </select>
            <button
              onClick={generateTopic}
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold rounded-lg"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {topic ? '重新生成' : '生成专题'}
            </button>
            {topic && (
              <button
                onClick={exportPpt}
                disabled={isExporting}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-300 text-white font-semibold rounded-lg"
              >
                {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                导出 PPT
              </button>
            )}
          </div>
        </div>

        {error && (
          <div className="mb-5 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700">
            {error}
          </div>
        )}

        {!topic ? (
          <section className="min-h-[620px] bg-white border border-gray-200 rounded-lg flex items-center justify-center p-8">
            <div className="max-w-2xl text-center">
              <FileSliders className="h-16 w-16 text-blue-600 mx-auto mb-5" />
              <h2 className="text-xl font-bold text-gray-900 mb-3">生成一页完整的专题学习空间</h2>
              <p className="text-gray-600 leading-7 mb-7">
                系统会根据当前账号的题库、正确率和错题情况，整理专题章节、核心要点、易错点、代表题和复习计划，并可导出为可编辑 PPT。
              </p>
              <button
                onClick={generateTopic}
                disabled={isLoading}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold rounded-lg"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {isLoading ? '正在组织专题...' : '开始生成专题'}
              </button>
            </div>
          </section>
        ) : (
          <div className="space-y-8">
            <section className="bg-[#173B65] text-white rounded-lg px-6 py-8 sm:px-9">
              <div className="text-sm font-semibold text-blue-200 mb-3">AI 个性化专题</div>
              <h2 className="text-3xl font-bold leading-tight">{topic.title}</h2>
              <p className="text-blue-100 mt-3 text-lg">{topic.subtitle}</p>
              <p className="text-blue-50 mt-6 leading-8 max-w-5xl">{topic.overview}</p>
            </section>

            <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              {[
                ['题库总量', topic.performance.totalQuestions, '题'],
                ['当前正确率', topic.performance.accuracy, '%'],
                ['今日已复习', topic.performance.reviewedToday, '题'],
                ['待复习', topic.performance.dueToday, '题'],
                ['薄弱题目', topic.performance.weakQuestionCount, '题'],
              ].map(([label, value, unit]) => (
                <div key={String(label)} className="bg-white border border-gray-200 rounded-lg p-4">
                  <div className="text-sm text-gray-500">{label}</div>
                  <div className="text-2xl font-bold text-gray-900 mt-1">{value}<span className="text-sm font-medium text-gray-500 ml-1">{unit}</span></div>
                </div>
              ))}
            </section>

            <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <Target className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-bold text-gray-900">学习目标</h3>
                </div>
                <ul className="space-y-3">
                  {topic.objectives.map((objective, index) => (
                    <li key={index} className="flex gap-3 text-gray-700 leading-6">
                      <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0 mt-0.5" />
                      {objective}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <div className="flex items-center gap-2 mb-4">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                  <h3 className="text-lg font-bold text-gray-900">核心知识全景</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {topic.coreSummary.map((item, index) => (
                    <div key={index} className="bg-blue-50 border border-blue-100 rounded-lg px-4 py-3 text-sm text-blue-950 leading-6">
                      <span className="font-bold text-blue-600 mr-2">{String(index + 1).padStart(2, '0')}</span>
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-4">
                <Layers3 className="h-5 w-5 text-blue-600" />
                <h3 className="text-xl font-bold text-gray-900">专题章节</h3>
              </div>
              <div className="space-y-5">
                {topic.chapters.map((chapter, index) => (
                  <article key={chapter.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                    <div className="grid grid-cols-1 lg:grid-cols-[90px_minmax(0,1fr)_300px]">
                      <div className="bg-blue-600 text-white flex lg:flex-col items-center justify-center gap-2 px-4 py-4">
                        <span className="text-xs font-semibold text-blue-100">CHAPTER</span>
                        <span className="text-3xl font-bold">{String(index + 1).padStart(2, '0')}</span>
                      </div>
                      <div className="p-6">
                        <h4 className="text-xl font-bold text-gray-900">{chapter.title}</h4>
                        <p className="text-blue-700 font-medium mt-2">{chapter.summary}</p>
                        <p className="text-gray-700 leading-8 mt-4 whitespace-pre-wrap">{chapter.explanation}</p>
                        {chapter.questionIds.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {chapter.questionIds.map(questionId => (
                              <span key={questionId} className="px-2.5 py-1 text-xs rounded-full bg-gray-100 text-gray-600">
                                关联题 #{questionId}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="bg-gray-50 border-l border-gray-200 p-6">
                        <div className="font-bold text-gray-900 mb-3">本章要点</div>
                        <ul className="space-y-3 text-sm text-gray-700 leading-6">
                          {chapter.keyPoints.map((point, pointIndex) => (
                            <li key={pointIndex} className="flex gap-2">
                              <span className="text-blue-600 font-bold">{pointIndex + 1}.</span>
                              {point}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  <h3 className="text-xl font-bold text-gray-900">重点与易错点</h3>
                </div>
                <div className="space-y-3">
                  {topic.pitfalls.map((pitfall, index) => (
                    <div key={index} className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                      <div className="font-bold text-amber-900">{pitfall.title}</div>
                      <p className="text-sm text-amber-950 leading-6 mt-2">{pitfall.explanation}</p>
                      {pitfall.questionIds.length > 0 && (
                        <div className="text-xs text-amber-700 mt-2">关联题：{pitfall.questionIds.map(id => `#${id}`).join('、')}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Flag className="h-5 w-5 text-green-600" />
                  <h3 className="text-xl font-bold text-gray-900">代表性题目</h3>
                </div>
                <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-200">
                  {topic.representativeQuestions.map((item, index) => (
                    <div key={item.questionId} className="p-4 flex gap-4">
                      <span className="h-8 min-w-8 px-2 rounded bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">
                        #{item.questionId}
                      </span>
                      <div>
                        <div className="text-sm font-semibold text-gray-900">代表题 {index + 1}</div>
                        <p className="text-sm text-gray-600 leading-6 mt-1">{item.reason}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section>
              <div className="flex items-center gap-2 mb-4">
                <RefreshCw className="h-5 w-5 text-blue-600" />
                <h3 className="text-xl font-bold text-gray-900">复习行动计划</h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {topic.studyPlan.map(item => (
                  <div key={item.step} className="bg-white border border-gray-200 rounded-lg p-5">
                    <div className="h-9 w-9 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                      {item.step}
                    </div>
                    <div className="font-bold text-gray-900 mt-4">{item.title}</div>
                    <p className="text-sm text-gray-600 leading-6 mt-2">{item.action}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="bg-green-50 border border-green-200 rounded-lg p-6">
              <div className="font-bold text-green-900 mb-2">本专题学习建议</div>
              <p className="text-green-950 leading-7">{topic.closingAdvice}</p>
            </section>
          </div>
        )}
      </div>
    </div>
  );
}
