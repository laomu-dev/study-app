import { useEffect, useMemo, useState } from 'react';
import {
  Background,
  Controls,
  MiniMap,
  ReactFlow,
  type Edge,
  type Node,
  type NodeMouseHandler,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { BookOpen, GitBranch, Loader2, Network, RefreshCw, Route, Sparkles } from 'lucide-react';
import { Category } from '../../shared/types';
import { api } from '../lib/api';

type MapNodeType = 'concept' | 'subtopic' | 'mistake' | 'question';
type MapEdgeType = 'prerequisite' | 'contains' | 'confuses' | 'tests';

type KnowledgeMapNode = {
  id: string;
  label: string;
  type: MapNodeType;
  summary: string;
  details: string;
  questionIds: number[];
};

type KnowledgeMapEdge = {
  id: string;
  source: string;
  target: string;
  label: string;
  type: MapEdgeType;
};

type KnowledgeMapResult = {
  title: string;
  overview: string;
  studyPath: string[];
  nodes: KnowledgeMapNode[];
  edges: KnowledgeMapEdge[];
};

const typeMeta: Record<MapNodeType, { label: string; color: string; bg: string; border: string }> = {
  concept: { label: '核心概念', color: '#1D4ED8', bg: '#EFF6FF', border: '#60A5FA' },
  subtopic: { label: '子知识点', color: '#047857', bg: '#ECFDF5', border: '#6EE7B7' },
  mistake: { label: '易错点', color: '#B45309', bg: '#FFFBEB', border: '#FBBF24' },
  question: { label: '关联题目', color: '#7C3AED', bg: '#F5F3FF', border: '#C4B5FD' },
};

const edgeMeta: Record<MapEdgeType, { label: string; color: string }> = {
  prerequisite: { label: '先修', color: '#2563EB' },
  contains: { label: '包含', color: '#059669' },
  confuses: { label: '易混', color: '#D97706' },
  tests: { label: '考查', color: '#7C3AED' },
};

function layoutNodes(mapNodes: KnowledgeMapNode[]): Node[] {
  const order: MapNodeType[] = ['concept', 'subtopic', 'mistake', 'question'];
  const columns = new Map<MapNodeType, KnowledgeMapNode[]>();
  for (const type of order) columns.set(type, []);
  for (const node of mapNodes) {
    columns.get(node.type)?.push(node);
  }

  return order.flatMap((type, columnIndex) => {
    const nodes = columns.get(type) || [];
    return nodes.map((node, rowIndex) => ({
      id: node.id,
      type: 'default',
      position: {
        x: columnIndex * 270,
        y: rowIndex * 128 + (columnIndex % 2) * 34,
      },
      data: {
        label: (
          <div className="min-w-[190px] max-w-[220px]">
            <div className="text-xs font-semibold mb-1" style={{ color: typeMeta[node.type].color }}>
              {typeMeta[node.type].label}
            </div>
            <div className="font-bold text-gray-900 leading-snug">{node.label}</div>
            <div className="text-xs text-gray-600 mt-2 line-clamp-2">{node.summary}</div>
          </div>
        ),
      },
      style: {
        background: typeMeta[node.type].bg,
        border: `1px solid ${typeMeta[node.type].border}`,
        borderRadius: 8,
        padding: 12,
        boxShadow: '0 8px 18px rgba(15, 23, 42, 0.08)',
      },
    }));
  });
}

function layoutEdges(mapEdges: KnowledgeMapEdge[]): Edge[] {
  return mapEdges.map(edge => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    label: edge.label || edgeMeta[edge.type]?.label || '',
    animated: edge.type === 'prerequisite',
    style: {
      stroke: edgeMeta[edge.type]?.color || '#64748B',
      strokeWidth: 2,
    },
    labelStyle: {
      fill: '#334155',
      fontSize: 12,
      fontWeight: 600,
    },
  }));
}

export function KnowledgeMap() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<number | ''>('');
  const [map, setMap] = useState<KnowledgeMapResult | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    api.questions.getCategories()
      .then((result: any) => setCategories(result.categories || []))
      .catch(() => setError('题库列表加载失败'));
  }, []);

  const nodes = useMemo(() => layoutNodes(map?.nodes || []), [map]);
  const edges = useMemo(() => layoutEdges(map?.edges || []), [map]);
  const selectedNode = map?.nodes.find(node => node.id === selectedNodeId) || map?.nodes[0] || null;

  const generateMap = async () => {
    try {
      setIsLoading(true);
      setError('');
      setSelectedNodeId(null);
      const result: any = await api.knowledgeMap.generate(selectedCategory || undefined);
      setMap(result);
      setSelectedNodeId(result.nodes?.[0]?.id || null);
    } catch (requestError: any) {
      setError(requestError.message || '知识脉络生成失败，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNodeClick: NodeMouseHandler = (_event, node) => {
    setSelectedNodeId(node.id);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-6">
          <div>
            <div className="flex items-center gap-3">
              <Network className="h-7 w-7 text-blue-600" />
              <h1 className="text-2xl font-bold text-gray-900">知识点脉络</h1>
            </div>
            <p className="text-gray-600 mt-2">从题目抽取知识点、关系线和复习路径</p>
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
              onClick={generateMap}
              disabled={isLoading}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold rounded-lg"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {map ? '重新生成' : '生成脉络图'}
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-lg bg-red-50 border border-red-200 text-red-700">
            {error}
          </div>
        )}

        {!map ? (
          <section className="bg-white border border-gray-200 rounded-lg min-h-[620px] flex items-center justify-center p-8">
            <div className="max-w-xl text-center">
              <GitBranch className="h-16 w-16 text-blue-600 mx-auto mb-5" />
              <h2 className="text-xl font-bold text-gray-900 mb-3">把题库变成可学习的知识网络</h2>
              <p className="text-gray-600 leading-7 mb-6">
                系统会从题目、答案和解析中抽取核心概念、子知识点、易错点和关联题目，形成可点击的复习路径。
              </p>
              <button
                onClick={generateMap}
                disabled={isLoading}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-semibold rounded-lg"
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                {isLoading ? '生成中...' : '开始生成'}
              </button>
            </div>
          </section>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_340px] gap-5">
            <section className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-900">{map.title}</h2>
                <p className="text-sm text-gray-600 mt-1">{map.overview}</p>
              </div>
              <div className="h-[680px]">
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodeClick={handleNodeClick}
                  fitView
                  fitViewOptions={{ padding: 0.18 }}
                  nodesDraggable
                >
                  <MiniMap
                    nodeColor={node => {
                      const source = map.nodes.find(item => item.id === node.id);
                      return source ? typeMeta[source.type].color : '#64748B';
                    }}
                  />
                  <Controls />
                  <Background color="#CBD5E1" gap={22} />
                </ReactFlow>
              </div>
            </section>

            <aside className="space-y-5">
              <section className="bg-white border border-gray-200 rounded-lg p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Route className="h-5 w-5 text-blue-600" />
                  <h3 className="font-bold text-gray-900">推荐学习路径</h3>
                </div>
                <ol className="space-y-3">
                  {map.studyPath.map((step, index) => (
                    <li key={`${step}-${index}`} className="flex gap-3 text-sm text-gray-700">
                      <span className="h-6 w-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold shrink-0">
                        {index + 1}
                      </span>
                      <span className="leading-6">{step}</span>
                    </li>
                  ))}
                </ol>
              </section>

              <section className="bg-white border border-gray-200 rounded-lg p-5">
                <div className="flex items-center justify-between gap-3 mb-4">
                  <h3 className="font-bold text-gray-900">节点详情</h3>
                  {selectedNode && (
                    <span
                      className="text-xs font-semibold px-2 py-1 rounded-full"
                      style={{
                        color: typeMeta[selectedNode.type].color,
                        backgroundColor: typeMeta[selectedNode.type].bg,
                      }}
                    >
                      {typeMeta[selectedNode.type].label}
                    </span>
                  )}
                </div>

                {selectedNode ? (
                  <div>
                    <h4 className="text-lg font-bold text-gray-900 mb-2">{selectedNode.label}</h4>
                    <p className="text-sm text-gray-600 leading-6 mb-4">{selectedNode.summary}</p>
                    <div className="text-sm text-gray-800 leading-7 whitespace-pre-wrap bg-gray-50 border border-gray-200 rounded-lg p-3">
                      {selectedNode.details}
                    </div>

                    {selectedNode.questionIds.length > 0 && (
                      <div className="mt-4">
                        <div className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-2">
                          <BookOpen className="h-4 w-4 text-blue-600" />
                          关联题目
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {selectedNode.questionIds.map(questionId => (
                            <span key={questionId} className="px-2.5 py-1 rounded-full text-xs bg-blue-50 text-blue-700 border border-blue-100">
                              #{questionId}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-gray-600">点击图谱节点查看详情。</p>
                )}
              </section>

              <section className="bg-white border border-gray-200 rounded-lg p-5">
                <div className="flex items-center gap-2 mb-3">
                  <RefreshCw className="h-4 w-4 text-gray-500" />
                  <h3 className="font-bold text-gray-900">图例</h3>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {(Object.keys(typeMeta) as MapNodeType[]).map(type => (
                    <div key={type} className="text-xs px-3 py-2 rounded-lg border" style={{ color: typeMeta[type].color, background: typeMeta[type].bg, borderColor: typeMeta[type].border }}>
                      {typeMeta[type].label}
                    </div>
                  ))}
                </div>
              </section>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
}
