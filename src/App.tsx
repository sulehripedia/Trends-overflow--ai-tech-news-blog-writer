import { useState, useEffect, useRef } from 'react';
import {
  Settings,
  Sparkles,
  Zap,
  Play,
  Eye,
  Upload,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Loader2,
  BarChart3,
  Target,
  Activity,
  Terminal as TerminalIcon,
  Layers,
  Info,
  Grid3X3,
  FileText,
  TrendingUp,
  ChevronUp,
  ChevronDown,
  Cpu,
  Maximize2,
  Minimize2
} from 'lucide-react';
import type { Topic, BlogPost, AppState, WordPressSettings, ContentSettings } from './types';
import { SettingsModal } from './components/SettingsModal';
import { ArticleView } from './components/ArticleView';
import { BlogsPage } from './components/BlogsPage';
import { AnalyticsPage } from './components/AnalyticsPage';
import { AutoPilotModal } from './components/AutoPilotModel';
import { ApiService } from './services/api';
import './App.css';

const LOCAL_STORAGE_KEY = 'trends-overflow-state-v2';
const MIN_TERMINAL_HEIGHT = 40;
const MAX_TERMINAL_HEIGHT = 500;
const DEFAULT_TERMINAL_HEIGHT = 180;

function App() {
  const [state, setState] = useState<AppState>(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          ...parsed,
          currentView: parsed.currentView || 'DASHBOARD',
          savedBlogs: parsed.savedBlogs || [],
          contentSettings: {
            targetWordCount: 1800,
            includeImages: false,
            publishTime: '09:00',
            primaryModel: 'gemini-2.0-flash',
            ...parsed.contentSettings,
            includeImages: false, // Always off
          }
        };
      } catch {}
    }
    return {
      apiKey: '',
      wordpress: { url: '', username: '', applicationPassword: '' },
      contentSettings: {
        targetWordCount: 1800,
        includeImages: false,
        publishTime: '09:00',
        primaryModel: 'gemini-2.0-flash'
      },
      topics: [],
      savedBlogs: [],
      isScanning: false,
      isAutoPilot: false,
      darkMode: false,
      logs: [],
      currentView: 'DASHBOARD'
    };
  });

  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [autoPilotOpen, setAutoPilotOpen] = useState(false);
  const [terminalHeight, setTerminalHeight] = useState(DEFAULT_TERMINAL_HEIGHT);
  const [terminalCollapsed, setTerminalCollapsed] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newH = window.innerHeight - e.clientY;
      setTerminalHeight(Math.max(MIN_TERMINAL_HEIGHT, Math.min(MAX_TERMINAL_HEIGHT, newH)));
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  const addLog = (message: string) => {
    setState(prev => ({
      ...prev,
      logs: [`[${new Date().toLocaleTimeString()}] ${message}`, ...prev.logs].slice(0, 150)
    }));
  };

  const updateTopic = (id: string, updates: Partial<Topic>) => {
    setState(prev => ({
      ...prev,
      topics: prev.topics.map(t => t.id === id ? { ...t, ...updates } : t)
    }));
  };

  const saveBlog = (blog: BlogPost) => {
    setState(prev => ({
      ...prev,
      savedBlogs: [blog, ...prev.savedBlogs.filter(b => b.slug !== blog.slug)].slice(0, 100)
    }));
  };

  const stats = {
    total: state.topics.length,
    pending: state.topics.filter(t => t.status === 'pending').length,
    generating: state.topics.filter(t => t.status === 'generating').length,
    completed: state.topics.filter(t => t.status === 'completed').length,
    failed: state.topics.filter(t => t.status === 'failed').length,
    avgScore: state.topics.length > 0
      ? Math.round(state.topics.reduce((s, t) => s + t.score, 0) / state.topics.length)
      : 0
  };

  const handleScanTopics = async () => {
    if (!state.apiKey) {
      addLog('ERROR: Gemini API key not configured. Open Settings.');
      setSettingsOpen(true);
      return;
    }
    setState(prev => ({ ...prev, isScanning: true }));
    addLog('Scanning for trending tech topics...');
    try {
      const api = new ApiService(state.apiKey);
      const topics = await api.scanForTopics();
      setState(prev => ({ ...prev, topics, isScanning: false }));
      addLog(`✅ Found ${topics.length} trending topics`);
    } catch (error: any) {
      addLog(`❌ Topic scan failed: ${error.message}`);
      setState(prev => ({ ...prev, isScanning: false }));
    }
  };

  const handleGenerateBlog = async (topic: Topic) => {
    if (!state.apiKey) {
      addLog('ERROR: Gemini API key not configured.');
      return;
    }
    updateTopic(topic.id, { status: 'generating' });
    addLog(`Generating blog: "${topic.title}"`);
    try {
      const api = new ApiService(state.apiKey);
      const blogPost = await api.generateBlogPost(topic.title, state.contentSettings.targetWordCount);
      blogPost.createdAt = new Date().toISOString();
      blogPost.topicId = topic.id;

      updateTopic(topic.id, {
        status: 'completed',
        blogPost,
        generatedAt: new Date().toISOString()
      });
      saveBlog(blogPost);
      addLog(`✅ Blog ready: "${blogPost.title}" (${blogPost.seo_report?.word_count_actual || '?'} words, SEO: ${blogPost.seo_report?.score || '?'})`);
    } catch (error: any) {
      updateTopic(topic.id, { status: 'failed' });
      addLog(`❌ Generation failed: ${error.message}`);
    }
  };

  const handlePublishToWordPress = async (topic: Topic, publishAs: 'draft' | 'publish' = 'draft') => {
    if (!topic.blogPost) { addLog('No blog post to publish'); return; }
    if (!state.wordpress.url || !state.wordpress.username || !state.wordpress.applicationPassword) {
      addLog('❌ WordPress credentials not configured. Open Settings.');
      setSettingsOpen(true);
      return;
    }
    addLog(`Publishing to WordPress: "${topic.blogPost.title}"`);
    try {
      const api = new ApiService(state.apiKey);
      const result = await api.publishToWordPress(topic.blogPost, state.wordpress, state.contentSettings.publishTime, { status: publishAs });
      addLog(`✅ Published! Post ID: ${result.postId} — ${result.url}`);
    } catch (error: any) {
      addLog(`❌ WordPress publish failed: ${error.message}`);
    }
  };

  const handleAutoPilotGenerate = async (topicIds: string[]) => {
    for (const id of topicIds) {
      const topic = state.topics.find(t => t.id === id);
      if (topic) await handleGenerateBlog(topic);
    }
  };

  const handleAutoPilotPublish = async (topicId: string) => {
    const topic = state.topics.find(t => t.id === topicId);
    if (topic) await handlePublishToWordPress(topic, 'draft');
  };

  const handleSaveSettings = (apiKey: string, wp: WordPressSettings, content: ContentSettings) => {
    setState(prev => ({
      ...prev,
      apiKey,
      wordpress: wp,
      contentSettings: { ...content, includeImages: false, targetWordCount: Math.max(content.targetWordCount, 1500) }
    }));
    setSettingsOpen(false);
    addLog('✅ Settings saved');
  };

  const getStatusBadge = (status: string) => {
    const map: Record<string, { text: string; bg: string; fg: string }> = {
      pending: { text: 'PENDING', bg: '#fbbf24', fg: '#000' },
      generating: { text: 'GENERATING', bg: '#3b82f6', fg: '#fff' },
      completed: { text: 'DONE', bg: '#22c55e', fg: '#fff' },
      failed: { text: 'FAILED', bg: '#ef4444', fg: '#fff' }
    };
    const b = map[status] || map.pending;
    return (
      <span className="neo-title text-[10px] px-2 py-0.5 border-2 border-black" style={{ backgroundColor: b.bg, color: b.fg }}>
        {b.text}
      </span>
    );
  };

  const getClusterIcon = (cluster: string) => {
    if (cluster?.includes('AI')) return <Sparkles className="w-5 h-5" />;
    if (cluster?.includes('Cyber')) return <AlertCircle className="w-5 h-5" />;
    if (cluster?.includes('Developer')) return <Layers className="w-5 h-5" />;
    return <TrendingUp className="w-5 h-5" />;
  };

  const navigateTo = (view: AppState['currentView']) => {
    setState(prev => ({ ...prev, currentView: view }));
    if (view === 'SETTINGS') setSettingsOpen(true);
  };

  const renderMainContent = () => {
    switch (state.currentView) {
      case 'BLOGS':
        return (
          <BlogsPage
            topics={state.topics}
            savedBlogs={state.savedBlogs}
            onViewBlog={setSelectedPost}
            onDeleteBlog={(topicId) => {
              setState(prev => ({
                ...prev,
                topics: prev.topics.filter(t => t.id !== topicId),
                savedBlogs: prev.savedBlogs.filter(b => b.topicId !== topicId)
              }));
              addLog(`Deleted blog for topic: ${topicId}`);
            }}
          />
        );
      case 'ANALYTICS':
        return <AnalyticsPage topics={state.topics} />;
      case 'DASHBOARD':
      default:
        return (
          <>
            {/* Dashboard Header */}
            <header className="h-16 flex-shrink-0 flex items-center justify-between px-6 bg-white border-b-[3px] border-black">
              <div className="flex items-center gap-4">
                <h2 className="neo-title text-xl uppercase">Trending Topics Feed</h2>
                <div className="neo-box-sm bg-[var(--neo-accent)] px-3 py-1 flex items-center gap-2">
                  <div className="w-2.5 h-2.5 bg-black animate-pulse" />
                  <span className="neo-title text-[10px]">LIVE</span>
                </div>
              </div>
              <div className="text-right hidden sm:block">
                <p className="neo-title text-xs">TRENDS OVERFLOW</p>
                <p className="text-[10px] neo-title text-gray-500">AI Content Engine</p>
              </div>
            </header>

            {/* Action Bar */}
            <div className="px-6 py-3 bg-white border-b-[3px] border-black flex-shrink-0">
              <div className="flex gap-3 max-w-4xl">
                <button
                  onClick={handleScanTopics}
                  disabled={state.isScanning || !state.apiKey}
                  className="flex-1 neo-btn bg-[var(--neo-accent)] px-5 py-2.5 text-xs flex items-center justify-center gap-2"
                >
                  {state.isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
                  {state.isScanning ? 'SCANNING...' : 'SCAN TRENDING TOPICS'}
                </button>
                <button
                  onClick={() => setAutoPilotOpen(true)}
                  disabled={!state.apiKey}
                  className="flex-1 neo-btn px-5 py-2.5 text-xs flex items-center justify-center gap-2"
                  style={{ backgroundColor: 'var(--neo-secondary)' }}
                >
                  <Play className="w-4 h-4" />
                  AUTO-PILOT
                </button>
              </div>
            </div>

            {/* Topics Grid */}
            <div className="flex-1 overflow-y-auto p-6">
              {state.topics.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center max-w-sm">
                    <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-20" />
                    <p className="neo-title text-lg mb-2">NO TOPICS YET</p>
                    <p className="text-sm text-gray-500 mb-4">Click "SCAN TRENDING TOPICS" to discover what's hot in tech right now.</p>
                    {!state.apiKey && (
                      <button onClick={() => setSettingsOpen(true)} className="neo-btn bg-[var(--neo-accent)] px-4 py-2 text-xs">
                        SET UP API KEY
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-4 max-w-4xl mx-auto">
                  {state.topics.map((topic) => (
                    <div key={topic.id} className="neo-box p-5 bg-white hover:bg-neutral-50 transition-colors">
                      <div className="flex gap-4">
                        <div className="w-12 h-12 flex-shrink-0 bg-black text-[var(--neo-accent)] flex items-center justify-center">
                          {getClusterIcon(topic.cluster)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="neo-title text-base uppercase leading-tight mb-1">{topic.title}</h3>
                              <span className="text-[10px] neo-title text-gray-500 bg-gray-100 border border-gray-200 px-2 py-0.5">
                                {topic.cluster}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {getStatusBadge(topic.status)}
                              <span className="neo-title text-sm bg-[var(--neo-accent)] border-2 border-black px-2 py-0.5">
                                {topic.score}
                              </span>
                            </div>
                          </div>

                          <p className="text-sm leading-relaxed mb-3 border-l-[3px] border-black pl-3 text-gray-700">
                            {topic.reasoning}
                          </p>

                          <div className="flex items-center justify-between gap-2 flex-wrap">
                            <div className="flex gap-2 flex-wrap">
                              {topic.status === 'pending' && (
                                <button
                                  onClick={() => handleGenerateBlog(topic)}
                                  className="neo-btn bg-[var(--neo-secondary)] px-4 py-2 text-xs flex items-center gap-1.5"
                                >
                                  <Zap className="w-3 h-3" />
                                  GENERATE BLOG
                                </button>
                              )}
                              {topic.status === 'completed' && topic.blogPost && (
                                <>
                                  <button
                                    onClick={() => setSelectedPost(topic.blogPost!)}
                                    className="neo-btn bg-white px-4 py-2 text-xs flex items-center gap-1.5"
                                  >
                                    <Eye className="w-3 h-3" />
                                    READ
                                  </button>
                                  <button
                                    onClick={() => handlePublishToWordPress(topic, 'draft')}
                                    className="neo-btn bg-[var(--neo-accent)] px-4 py-2 text-xs flex items-center gap-1.5"
                                  >
                                    <Upload className="w-3 h-3" />
                                    PUBLISH
                                  </button>
                                </>
                              )}
                              {topic.status === 'generating' && (
                                <div className="neo-box-sm px-4 py-2 text-xs flex items-center gap-2 bg-blue-50">
                                  <Loader2 className="w-3 h-3 animate-spin" />
                                  GENERATING...
                                </div>
                              )}
                              {topic.status === 'failed' && (
                                <button onClick={() => handleGenerateBlog(topic)} className="neo-btn bg-red-500 text-white px-4 py-2 text-xs">
                                  RETRY
                                </button>
                              )}
                            </div>
                            <button
                              onClick={() => setState(prev => ({ ...prev, topics: prev.topics.filter(t => t.id !== topic.id) }))}
                              className="p-2 border-2 border-black hover:bg-red-500 hover:text-white transition-colors"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="neo-box p-3 bg-black text-white text-center neo-title text-xs">
                    {stats.pending} PENDING · {stats.completed} DONE · {stats.failed} FAILED
                  </div>
                </div>
              )}
            </div>
          </>
        );
    }
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <div className="flex flex-1 overflow-hidden">

        {/* LEFT SIDEBAR */}
        <aside className="w-60 flex-shrink-0 bg-white border-r-[3px] border-black flex flex-col">
          <div className="p-5 border-b-[3px] border-black bg-[var(--neo-accent)]">
            <div className="flex items-center gap-2">
              <Sparkles className="w-7 h-7 text-black" />
              <h1 className="neo-title text-lg uppercase leading-none">
                Trends<br />Overflow
              </h1>
            </div>
          </div>

          <nav className="flex-1 px-3 py-6 space-y-1.5 overflow-y-auto">
            {([
              { view: 'DASHBOARD', icon: <Grid3X3 className="w-4 h-4" />, label: 'DASHBOARD' },
              { view: 'BLOGS', icon: <FileText className="w-4 h-4" />, label: 'BLOGS', badge: state.topics.filter(t => t.status === 'completed').length || undefined },
              { view: 'ANALYTICS', icon: <BarChart3 className="w-4 h-4" />, label: 'ANALYTICS' },
              { view: 'SETTINGS', icon: <Settings className="w-4 h-4" />, label: 'SETTINGS' },
            ] as const).map(({ view, icon, label, badge }) => (
              <button
                key={view}
                onClick={() => navigateTo(view as AppState['currentView'])}
                className={`w-full flex items-center gap-3 px-3 py-2.5 neo-title text-xs transition-all ${
                  state.currentView === view
                    ? 'neo-box-sm bg-[var(--neo-secondary)]'
                    : 'border-2 border-transparent hover:border-black'
                }`}
              >
                {icon}
                {label}
                {badge !== undefined && badge > 0 && (
                  <span className="ml-auto bg-black text-white text-[9px] px-1.5 py-0.5">{badge}</span>
                )}
              </button>
            ))}
          </nav>

          <div className="p-4 bg-black text-white border-t-[3px] border-black flex-shrink-0">
            <div className="flex items-center gap-2 mb-2">
              <Cpu className="w-3 h-3 text-[var(--neo-accent)]" />
              <span className="neo-title text-[9px] uppercase">Model</span>
            </div>
            <p className="neo-title text-[10px] text-[var(--neo-accent)]">{state.contentSettings.primaryModel}</p>
            <div className="mt-3 grid grid-cols-2 gap-1.5">
              <div className="border border-neutral-700 p-1.5 text-center">
                <p className="neo-title text-[9px] text-gray-400">DONE</p>
                <p className="neo-title text-sm text-[var(--neo-accent)]">{stats.completed}</p>
              </div>
              <div className="border border-neutral-700 p-1.5 text-center">
                <p className="neo-title text-[9px] text-gray-400">QUEUE</p>
                <p className="neo-title text-sm text-[var(--neo-accent)]">{stats.pending}</p>
              </div>
            </div>
          </div>
        </aside>

        {/* MAIN PANEL */}
        <main className="flex-1 flex flex-col min-w-0 bg-[var(--neo-bg)] overflow-hidden">
          {renderMainContent()}
        </main>

        {/* RIGHT SIDEBAR */}
        <aside className="w-72 flex-shrink-0 bg-white border-l-[3px] border-black flex flex-col">
          <div className="p-5 border-b-[3px] border-black">
            <h2 className="neo-title text-sm uppercase flex items-center gap-2">
              <Activity className="w-4 h-4" /> Config Panel
            </h2>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-6">
            {/* AI Section */}
            <section>
              <h3 className="neo-title text-[9px] uppercase bg-black text-white px-2 py-0.5 inline-block mb-3">AI_ENGINE</h3>
              <div className="space-y-2">
                <div>
                  <label className="neo-title text-[9px] text-gray-500 uppercase block mb-1">API KEY</label>
                  <div className="neo-input text-xs flex items-center justify-between">
                    <span>{state.apiKey ? '••••••••••••••' : 'Not set'}</span>
                    {state.apiKey ? <CheckCircle2 className="w-3 h-3 text-green-500" /> : <AlertCircle className="w-3 h-3 text-red-500" />}
                  </div>
                </div>
                <div>
                  <label className="neo-title text-[9px] text-gray-500 uppercase block mb-1">MODEL</label>
                  <div className="neo-input text-[10px]">{state.contentSettings.primaryModel}</div>
                </div>
              </div>
            </section>

            {/* WP Section */}
            <section>
              <h3 className="neo-title text-[9px] uppercase bg-black text-white px-2 py-0.5 inline-block mb-3">WORDPRESS</h3>
              <div className="space-y-2">
                <div>
                  <label className="neo-title text-[9px] text-gray-500 uppercase block mb-1">SITE URL</label>
                  <div className="neo-input text-[10px] truncate">{state.wordpress.url || 'Not configured'}</div>
                </div>
                <div className="flex items-center gap-1.5">
                  {state.wordpress.url ? (
                    <><CheckCircle2 className="w-3 h-3 text-green-500" /><span className="neo-title text-[9px] text-green-600">CONNECTED</span></>
                  ) : (
                    <><AlertCircle className="w-3 h-3 text-red-500" /><span className="neo-title text-[9px] text-red-500">NOT CONNECTED</span></>
                  )}
                </div>
              </div>
            </section>

            {/* Generation settings */}
            <section>
              <h3 className="neo-title text-[9px] uppercase bg-black text-white px-2 py-0.5 inline-block mb-3">GENERATION</h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="neo-title text-[9px] text-gray-500">TARGET WORDS</span>
                  <span className="neo-title text-xs">{state.contentSettings.targetWordCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="neo-title text-[9px] text-gray-500">PUBLISH TIME</span>
                  <span className="neo-title text-xs">{state.contentSettings.publishTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="neo-title text-[9px] text-gray-500">IMAGES</span>
                  <span className="neo-title text-xs text-gray-400">DISABLED</span>
                </div>
              </div>
            </section>

            {/* Stats */}
            <section className="grid grid-cols-2 gap-2">
              <div className="neo-box-sm p-2 bg-[var(--neo-accent)] text-center">
                <p className="neo-title text-[9px]">TOPICS</p>
                <p className="neo-title text-2xl">{stats.total}</p>
              </div>
              <div className="neo-box-sm p-2 text-center">
                <p className="neo-title text-[9px]">BLOGS</p>
                <p className="neo-title text-2xl">{stats.completed}</p>
              </div>
              <div className="neo-box-sm p-2 text-center">
                <p className="neo-title text-[9px]">QUEUE</p>
                <p className="neo-title text-2xl">{stats.pending}</p>
              </div>
              <div className="neo-box-sm p-2 text-center">
                <p className="neo-title text-[9px]">AVG</p>
                <p className="neo-title text-2xl">{stats.avgScore}</p>
              </div>
            </section>
          </div>

          <div className="p-4 bg-gray-50 border-t-[3px] border-black flex-shrink-0">
            <button
              onClick={() => setSettingsOpen(true)}
              className="w-full py-3 neo-btn bg-[var(--neo-accent)] text-black flex items-center justify-center gap-2"
            >
              <Settings className="w-4 h-4" />
              OPEN SETTINGS
            </button>
          </div>
        </aside>
      </div>

      {/* TERMINAL */}
      <div
        ref={terminalRef}
        className="flex-shrink-0 bg-black border-t-[3px] border-black flex flex-col z-10 relative"
        style={{ height: terminalCollapsed ? MIN_TERMINAL_HEIGHT : terminalHeight }}
      >
        {!terminalCollapsed && (
          <div
            className="absolute -top-2 left-0 right-0 h-4 cursor-ns-resize flex items-center justify-center hover:bg-white/10"
            onMouseDown={() => setIsResizing(true)}
          >
            <div className="w-10 h-1 bg-gray-600" />
          </div>
        )}
        <div className="flex items-center justify-between px-4 py-1.5 border-b-2 border-neutral-800 bg-neutral-900 flex-shrink-0">
          <div className="flex items-center gap-2">
            <TerminalIcon className="text-white w-3 h-3" />
            <span className="neo-title text-white text-[10px] tracking-widest">AGENT_LOGS</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setState(prev => ({ ...prev, logs: [] }))} className="neo-title text-[9px] bg-white text-black px-2 py-0.5 hover:bg-[var(--neo-accent)]">
              CLEAR
            </button>
            <button onClick={() => setTerminalCollapsed(!terminalCollapsed)} className="p-1 hover:bg-white/10">
              {terminalCollapsed ? <Maximize2 className="w-3 h-3 text-white" /> : <Minimize2 className="w-3 h-3 text-white" />}
            </button>
          </div>
        </div>
        {!terminalCollapsed && (
          <div className="flex-1 overflow-y-auto p-3 space-y-0.5 console">
            {state.logs.length === 0 && (
              <div className="terminal-text text-[11px] opacity-60">System ready. Waiting for commands...</div>
            )}
            {state.logs.map((log, i) => (
              <div key={i} className="terminal-text text-[11px]">
                <span className="opacity-50">{log.split(']')[0]}]</span>
                <span>{log.split(']').slice(1).join(']')}</span>
              </div>
            ))}
            <div className="terminal-text text-[11px] animate-pulse">_</div>
          </div>
        )}
      </div>

      {/* MODALS */}
      {settingsOpen && (
        <SettingsModal
          isOpen={settingsOpen}
          onSave={handleSaveSettings}
          currentApiKey={state.apiKey}
          currentWpSettings={state.wordpress}
          currentContentSettings={state.contentSettings}
          onClose={() => { setSettingsOpen(false); setState(prev => ({ ...prev, currentView: 'DASHBOARD' })); }}
        />
      )}

      {autoPilotOpen && (
        <AutoPilotModal
          isOpen={autoPilotOpen}
          onClose={() => setAutoPilotOpen(false)}
          topics={state.topics}
          apiKey={state.apiKey}
          wordpress={state.wordpress}
          contentSettings={state.contentSettings}
          onGenerate={handleAutoPilotGenerate}
          onPublish={handleAutoPilotPublish}
          onLog={addLog}
        />
      )}

      {selectedPost && (
        <ArticleView post={selectedPost} onClose={() => setSelectedPost(null)} />
      )}
    </div>
  );
}

export default App;