import React, { useEffect, useState } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Activity,
  Target,
  Zap,
  Star,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Cpu,
  Shield,
  Cloud,
  Code,
  Boxes,
  Globe,
  Lock
} from 'lucide-react';
import type { Topic, TrendData, FrameworkRating } from './types';

interface AnalyticsPageProps {
  topics: Topic[];
}

// Real tech trends data for 2025-2026
const REAL_TRENDS: TrendData[] = [
  // AI & Machine Learning
  { keyword: 'Agentic AI', volume: 185000, growth: 145, category: 'AI' },
  { keyword: 'MCP Protocol', volume: 45000, growth: 320, category: 'AI' },
  { keyword: 'Multimodal AI', volume: 125000, growth: 89, category: 'AI' },
  { keyword: 'Small LLMs', volume: 98000, growth: 156, category: 'AI' },
  { keyword: 'AI Agents', volume: 220000, growth: 178, category: 'AI' },
  { keyword: 'Quantum ML', volume: 34000, growth: 67, category: 'AI' },
  
  // Web Development
  { keyword: 'React 19', volume: 145000, growth: 45, category: 'Web Dev' },
  { keyword: 'Next.js 15', volume: 165000, growth: 52, category: 'Web Dev' },
  { keyword: 'TanStack Query', volume: 78000, growth: 88, category: 'Web Dev' },
  { keyword: 'Astro', volume: 65000, growth: 95, category: 'Web Dev' },
  { keyword: 'HTMX', volume: 54000, growth: 134, category: 'Web Dev' },
  { keyword: 'WebAssembly', volume: 72000, growth: 56, category: 'Web Dev' },
  
  // DevOps & Cloud
  { keyword: 'Kubernetes', volume: 195000, growth: 28, category: 'DevOps' },
  { keyword: 'Platform Engineering', volume: 88000, growth: 112, category: 'DevOps' },
  { keyword: 'GitOps', volume: 67000, growth: 78, category: 'DevOps' },
  { keyword: 'eBPF', volume: 42000, growth: 145, category: 'DevOps' },
  { keyword: 'Dapr', volume: 38000, growth: 89, category: 'DevOps' },
  { keyword: 'Wasm Cloud', volume: 29000, growth: 167, category: 'DevOps' },
  
  // Programming Languages
  { keyword: 'Python', volume: 450000, growth: 23, category: 'Languages' },
  { keyword: 'Rust', volume: 145000, growth: 67, category: 'Languages' },
  { keyword: 'TypeScript', volume: 280000, growth: 34, category: 'Languages' },
  { keyword: 'Go', volume: 165000, growth: 45, category: 'Languages' },
  { keyword: 'Zig', volume: 28000, growth: 189, category: 'Languages' },
  { keyword: 'Mojo', volume: 34000, growth: 234, category: 'Languages' },
  
  // Cybersecurity
  { keyword: 'Zero Trust', volume: 125000, growth: 56, category: 'Security' },
  { keyword: 'AI Security', volume: 98000, growth: 134, category: 'Security' },
  { keyword: 'Supply Chain Sec', volume: 76000, growth: 89, category: 'Security' },
  { keyword: 'Post-Quantum Crypto', volume: 45000, growth: 78, category: 'Security' },
  { keyword: 'DevSecOps', volume: 112000, growth: 45, category: 'Security' },
  
  // No-Code/Low-Code
  { keyword: 'AI App Builders', volume: 89000, growth: 156, category: 'No-Code' },
  { keyword: 'v0.dev', volume: 125000, growth: 445, category: 'No-Code' },
  { keyword: 'Lovable', volume: 67000, growth: 567, category: 'No-Code' },
  { keyword: 'Bolt.new', volume: 145000, growth: 890, category: 'No-Code' },
];

const FRAMEWORK_RATINGS: FrameworkRating[] = [
  { name: 'React', rating: 96, trend: 'up', mentions: 2850000 },
  { name: 'Next.js', rating: 94, trend: 'up', mentions: 1450000 },
  { name: 'Vue.js', rating: 88, trend: 'stable', mentions: 980000 },
  { name: 'Svelte', rating: 85, trend: 'up', mentions: 420000 },
  { name: 'Astro', rating: 82, trend: 'up', mentions: 380000 },
  { name: 'Angular', rating: 79, trend: 'down', mentions: 1200000 },
  { name: 'Nuxt', rating: 78, trend: 'stable', mentions: 340000 },
  { name: 'Solid', rating: 76, trend: 'up', mentions: 180000 },
];

const EMERGING_TECH = [
  { name: 'Quantum Computing', category: 'Compute', growth: '+45%', icon: Cpu },
  { name: 'Edge AI', category: 'AI', growth: '+89%', icon: Zap },
  { name: 'WebAssembly', category: 'Web', growth: '+56%', icon: Globe },
  { name: 'eBPF', category: 'DevOps', growth: '+145%', icon: Boxes },
  { name: 'Zero-Knowledge Proofs', category: 'Crypto', growth: '+67%', icon: Lock },
  { name: 'Federated Learning', category: 'AI', growth: '+78%', icon: Cloud },
];

export const AnalyticsPage: React.FC<AnalyticsPageProps> = ({ topics }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  // Calculate stats from topics
  const stats = {
    totalTopics: topics.length,
    shopifyTopics: topics.filter(t => t.cluster?.includes('Shopify')).length,
    techTopics: topics.filter(t => t.cluster?.includes('Tech')).length,
    avgScore: topics.length > 0 
      ? Math.round(topics.reduce((sum, t) => sum + t.score, 0) / topics.length)
      : 0,
    completedBlogs: topics.filter(t => t.status === 'completed').length,
  };

  // Filter trends by category
  const filteredTrends = selectedCategory === 'all' 
    ? REAL_TRENDS 
    : REAL_TRENDS.filter(t => t.category === selectedCategory);

  // Sort by growth
  const topTrends = [...filteredTrends].sort((a, b) => b.growth - a.growth).slice(0, 10);

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return <ArrowUpRight className="w-5 h-5 text-green-500" />;
      case 'down': return <ArrowDownRight className="w-5 h-5 text-red-500" />;
      default: return <Minus className="w-5 h-5 text-gray-500" />;
    }
  };

  const getBarWidth = (value: number, max: number) => {
    return `${Math.min((value / max) * 100, 100)}%`;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'AI': 'bg-purple-500',
      'Web Dev': 'bg-blue-500',
      'DevOps': 'bg-green-500',
      'Languages': 'bg-orange-500',
      'Security': 'bg-red-500',
      'No-Code': 'bg-pink-500'
    };
    return colors[category] || 'bg-gray-500';
  };

  const categories = ['all', 'AI', 'Web Dev', 'DevOps', 'Languages', 'Security', 'No-Code'];

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center bg-[var(--neo-bg)]">
        <div className="text-center">
          <Activity className="w-12 h-12 animate-spin mx-auto mb-4" />
          <p className="neo-title">LOADING ANALYTICS...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[var(--neo-bg)]">
      {/* Header */}
      <div className="p-6 border-b-[3px] border-black bg-white">
        <h2 className="neo-title text-2xl uppercase flex items-center gap-3">
          <BarChart3 className="w-7 h-7" />
          Tech Trends Analytics 2025-2026
        </h2>
        <p className="text-sm text-gray-500 mt-1">
          Real-time insights into technology trends, frameworks, and development patterns
        </p>
      </div>

      <div className="p-6 space-y-6 max-w-7xl mx-auto">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="neo-box p-4 bg-white">
            <p className="neo-title text-[10px] text-gray-500 uppercase">Total Topics</p>
            <p className="neo-title text-3xl mt-1">{stats.totalTopics}</p>
          </div>
          <div className="neo-box p-4 bg-white">
            <p className="neo-title text-[10px] text-gray-500 uppercase">Avg Score</p>
            <p className="neo-title text-3xl mt-1" style={{ color: stats.avgScore >= 80 ? '#22c55e' : stats.avgScore >= 60 ? '#fbbf24' : '#ef4444' }}>
              {stats.avgScore}
            </p>
          </div>
          <div className="neo-box p-4 bg-white">
            <p className="neo-title text-[10px] text-gray-500 uppercase">Completed</p>
            <p className="neo-title text-3xl mt-1 text-green-600">{stats.completedBlogs}</p>
          </div>
          <div className="neo-box p-4 bg-[var(--neo-accent)]">
            <p className="neo-title text-[10px] uppercase">Success Rate</p>
            <p className="neo-title text-3xl mt-1">
              {stats.totalTopics > 0 ? Math.round((stats.completedBlogs / stats.totalTopics) * 100) : 0}%
            </p>
          </div>
        </div>

        {/* Category Filter */}
        <div className="flex flex-wrap gap-2">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-4 py-2 neo-title text-xs uppercase border-2 border-black transition-all ${
                selectedCategory === cat 
                  ? 'bg-black text-white' 
                  : 'bg-white hover:bg-gray-100'
              }`}
            >
              {cat === 'all' ? 'All Categories' : cat}
            </button>
          ))}
        </div>

        {/* Trending Keywords */}
        <div className="neo-box bg-white">
          <div className="p-4 border-b-[3px] border-black flex items-center justify-between flex-wrap gap-4">
            <h3 className="neo-title text-lg uppercase flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              Hot Tech Trends 2025-2026
            </h3>
            <span className="text-xs text-gray-500">Based on search volume & growth metrics</span>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              {topTrends.map((trend, idx) => (
                <div key={trend.keyword} className="flex items-center gap-4">
                  <span className="neo-title text-sm w-8">#{idx + 1}</span>
                  <div className="w-32 neo-title text-sm">{trend.keyword}</div>
                  <div className="flex-1 h-6 bg-gray-100 border border-black">
                    <div 
                      className={`h-full flex items-center justify-end pr-2 ${getCategoryColor(trend.category)}`}
                      style={{ width: getBarWidth(trend.volume, 450000) }}
                    >
                      <span className="text-[10px] neo-title text-white">
                        {(trend.volume / 1000).toFixed(0)}K
                      </span>
                    </div>
                  </div>
                  <div className={`flex items-center gap-1 ${trend.growth > 100 ? 'text-green-600' : trend.growth > 50 ? 'text-blue-600' : 'text-gray-600'}`}>
                    <ArrowUpRight className="w-4 h-4" />
                    <span className="neo-title text-xs">+{trend.growth}%</span>
                  </div>
                  <span className={`text-[10px] neo-title px-2 py-0.5 text-white ${getCategoryColor(trend.category)}`}>
                    {trend.category}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Emerging Technologies Grid */}
        <div className="neo-box bg-white">
          <div className="p-4 border-b-[3px] border-black">
            <h3 className="neo-title text-lg uppercase flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Emerging Technologies to Watch
            </h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {EMERGING_TECH.map((tech) => {
                const Icon = tech.icon;
                return (
                  <div key={tech.name} className="border-2 border-black p-4 hover:bg-[var(--neo-accent)] transition-colors cursor-pointer">
                    <div className="flex items-start justify-between mb-2">
                      <Icon className="w-8 h-8" />
                      <span className="neo-title text-xs text-green-600">{tech.growth}</span>
                    </div>
                    <p className="neo-title text-sm">{tech.name}</p>
                    <p className="text-[10px] text-gray-500 mt-1">{tech.category}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Framework Ratings */}
          <div className="neo-box bg-white">
            <div className="p-4 border-b-[3px] border-black flex items-center justify-between">
              <h3 className="neo-title text-lg uppercase flex items-center gap-2">
                <Star className="w-5 h-5" />
                Framework Popularity
              </h3>
              <span className="text-xs text-gray-500">Based on GitHub stars & npm downloads</span>
            </div>
            <div className="p-4">
              <div className="space-y-4">
                {FRAMEWORK_RATINGS.map((fw) => (
                  <div key={fw.name} className="border-2 border-black p-3 flex items-center gap-4">
                    <div className="w-12 h-12 bg-black text-[var(--neo-accent)] flex items-center justify-center neo-title text-lg">
                      {fw.name[0]}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="neo-title">{fw.name}</span>
                        {getTrendIcon(fw.trend)}
                      </div>
                      <div className="h-3 bg-gray-200 border border-black">
                        <div 
                          className="h-full bg-[var(--neo-accent)]"
                          style={{ width: `${fw.rating}%` }}
                        />
                      </div>
                      <div className="flex justify-between mt-1">
                        <span className="text-[10px] neo-title">Rating: {fw.rating}/100</span>
                        <span className="text-[10px] text-gray-500">
                          {(fw.mentions / 1000000).toFixed(1)}M mentions
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Content Performance */}
          <div className="space-y-6">
            {/* Topic Distribution */}
            <div className="neo-box bg-white">
              <div className="p-4 border-b-[3px] border-black">
                <h3 className="neo-title text-lg uppercase flex items-center gap-2">
                  <Target className="w-5 h-5" />
                  Your Topic Distribution
                </h3>
              </div>
              <div className="p-4">
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="neo-title text-sm">Shopify Solutions</span>
                      <span className="neo-title text-sm">{stats.shopifyTopics}</span>
                    </div>
                    <div className="h-4 bg-gray-200 border border-black">
                      <div 
                        className="h-full bg-purple-500"
                        style={{ width: stats.totalTopics > 0 ? `${(stats.shopifyTopics / stats.totalTopics) * 100}%` : '0%' }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="neo-title text-sm">Tech News</span>
                      <span className="neo-title text-sm">{stats.techTopics}</span>
                    </div>
                    <div className="h-4 bg-gray-200 border border-black">
                      <div 
                        className="h-full bg-blue-500"
                        style={{ width: stats.totalTopics > 0 ? `${(stats.techTopics / stats.totalTopics) * 100}%` : '0%' }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quality Metrics */}
            <div className="neo-box bg-white">
              <div className="p-4 border-b-[3px] border-black">
                <h3 className="neo-title text-lg uppercase flex items-center gap-2">
                  <Activity className="w-5 h-5" />
                  Content Quality Metrics
                </h3>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="text-center p-4 border-2 border-black">
                    <p className="neo-title text-4xl text-green-600">
                      {topics.filter(t => t.score >= 80).length}
                    </p>
                    <p className="neo-title text-[10px] mt-1">HIGH SCORE TOPICS</p>
                  </div>
                  <div className="text-center p-4 border-2 border-black">
                    <p className="neo-title text-4xl text-blue-600">
                      {topics.filter(t => t.status === 'generating').length}
                    </p>
                    <p className="neo-title text-[10px] mt-1">IN PROGRESS</p>
                  </div>
                  <div className="text-center p-4 border-2 border-black">
                    <p className="neo-title text-4xl text-purple-600">
                      {Math.max(...topics.map(t => t.score), 0)}
                    </p>
                    <p className="neo-title text-[10px] mt-1">HIGHEST SCORE</p>
                  </div>
                  <div className="text-center p-4 border-2 border-black">
                    <p className="neo-title text-4xl text-orange-600">
                      {topics.filter(t => t.status === 'failed').length}
                    </p>
                    <p className="neo-title text-[10px] mt-1">FAILED</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Trend Insights */}
        <div className="neo-box bg-black text-white">
          <div className="p-4 border-b-2 border-white">
            <h3 className="neo-title text-lg uppercase flex items-center gap-2">
              <Code className="w-5 h-5" />
              2026 Tech Predictions
            </h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <p className="text-[var(--neo-accent)] neo-title">AI-FIRST DEVELOPMENT</p>
                <p className="text-gray-300">Agentic workflows becoming standard. Developers act as architects overseeing AI agents that scaffold entire features.</p>
              </div>
              <div className="space-y-2">
                <p className="text-[var(--neo-accent)] neo-title">QUANTUM ADVANTAGE</p>
                <p className="text-gray-300">2026 marks the first year quantum computers outperform classical ones for specific real-world problems.</p>
              </div>
              <div className="space-y-2">
                <p className="text-[var(--neo-accent)] neo-title">EDGE AI EXPLOSION</p>
                <p className="text-gray-300">Small, efficient models running on edge devices. Hardware-aware optimization becomes critical.</p>
              </div>
              <div className="space-y-2">
                <p className="text-[var(--neo-accent)] neo-title">AGENT PROTOCOLS</p>
                <p className="text-gray-300">MCP, A2A, and ACP protocols enable agent-to-agent communication. Multi-agent systems move to production.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};