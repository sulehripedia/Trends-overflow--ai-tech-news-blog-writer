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

const LOCAL_STORAGE_KEY = 'trends-overflow-state';
const MIN_TERMINAL_HEIGHT = 40;
const MAX_TERMINAL_HEIGHT = 500;
const DEFAULT_TERMINAL_HEIGHT = 200;

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
            ...parsed.contentSettings,
            primaryModel: parsed.contentSettings?.primaryModel || 'gemini-2.0-flash'
          }
        };
      } catch (e) {
        console.error('Failed to parse saved state');
      }
    }
    return {
      apiKey: '',
      wordpress: { url: '', username: '', applicationPassword: '' },
      contentSettings: { 
        targetWordCount: 1200, 
        includeImages: true, 
        publishTime: '09:00',
        primaryModel: 'gemini-2.0-flash'
      },
      topics: [],
      savedBlogs: [],
      isScanning: false,
      isAutoPilot: false,
      darkMode: true,
      logs: [],
      currentView: 'DASHBOARD'
    };
  });

  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [autoPilotOpen, setAutoPilotOpen] = useState(false);
  
  // Terminal state
  const [terminalHeight, setTerminalHeight] = useState(DEFAULT_TERMINAL_HEIGHT);
  const [terminalCollapsed, setTerminalCollapsed] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  // Terminal resize handlers
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      const newHeight = window.innerHeight - e.clientY;
      setTerminalHeight(Math.max(MIN_TERMINAL_HEIGHT, Math.min(MAX_TERMINAL_HEIGHT, newHeight)));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

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
      logs: [`[${new Date().toLocaleTimeString()}] ${message}`, ...prev.logs].slice(0, 100)
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
      savedBlogs: [blog, ...prev.savedBlogs].slice(0, 50)
    }));
  };

  const stats = {
    total: state.topics.length,
    pending: state.topics.filter(t => t.status === 'pending').length,
    generating: state.topics.filter(t => t.status === 'generating').length,
    completed: state.topics.filter(t => t.status === 'completed').length,
    failed: state.topics.filter(t => t.status === 'failed').length,
    avgScore: state.topics.length > 0 
      ? Math.round(state.topics.reduce((sum, t) => sum + t.score, 0) / state.topics.length)
      : 0
  };

  const handleScanTopics = async () => {
    if (!state.apiKey) {
      addLog('ERROR: Gemini API key not configured');
      alert('Please configure your Gemini API key in settings');
      return;
    }

    setState(prev => ({ ...prev, isScanning: true }));
    addLog('Scanning for trending topics...');

    try {
      const api = new ApiService(state.apiKey);
      const topics = await api.scanForTopics();
      
      setState(prev => ({ ...prev, topics, isScanning: false }));
      addLog(`Found ${topics.length} trending topics`);
    } catch (error: any) {
      addLog(`Topic scan failed: ${error.message}`);
      setState(prev => ({ ...prev, isScanning: false }));
    }
  };

  const handleGenerateBlog = async (topic: Topic, includeImages: boolean = true) => {
    if (!state.apiKey) {
      addLog('ERROR: Gemini API key not configured');
      return;
    }

    updateTopic(topic.id, { status: 'generating' });
    addLog(`Generating blog post: "${topic.title}"`);

    try {
      const api = new ApiService(state.apiKey);
      const blogPost = await api.generateBlogPost(topic.title, state.contentSettings.targetWordCount);
      
      // Add metadata
      blogPost.createdAt = new Date().toISOString();
      blogPost.topicId = topic.id;
      
      // Generate images if enabled
      if (includeImages && blogPost.featured_image_prompt) {
        addLog(`Generating featured image...`);
        try {
          const imageData = await api.generateImage(blogPost.featured_image_prompt);
          if (imageData) {
            blogPost.featured_image_base64 = imageData;
            addLog(`Featured image generated successfully`);
          }
        } catch (imageError: any) {
          addLog(`Image generation failed: ${imageError.message}`);
        }

        // Generate inline images if prompts exist
        if (blogPost.inline_image_prompts && blogPost.inline_image_prompts.length > 0) {
          addLog(`Generating ${blogPost.inline_image_prompts.length} inline images...`);
          try {
            const inlineImages = await api.generateInlineImages(blogPost.inline_image_prompts.slice(0, 2));
            addLog(`${inlineImages.length} inline images generated`);
          } catch (e) {
            addLog('Some inline images failed to generate');
          }
        }
      }

      updateTopic(topic.id, { 
        status: 'completed', 
        blogPost,
        generatedAt: new Date().toISOString()
      });
      
      saveBlog(blogPost);
      addLog(`Blog post generated: "${blogPost.title}"`);

    } catch (error: any) {
      updateTopic(topic.id, { status: 'failed' });
      addLog(`Generation failed: ${error.message}`);
    }
  };

  const handlePublishToWordPress = async (topic: Topic, publishAs: 'draft' | 'publish' = 'draft') => {
    if (!topic.blogPost) {
      addLog('No blog post to publish');
      return;
    }

    if (!state.wordpress.url || !state.wordpress.username || !state.wordpress.applicationPassword) {
      addLog('WordPress credentials not configured');
      alert('Please configure WordPress settings');
      return;
    }

    addLog(`Publishing to WordPress: "${topic.blogPost.title}"`);

    try {
      const api = new ApiService(state.apiKey);
      const result = await api.publishToWordPress(
        topic.blogPost,
        state.wordpress,
        state.contentSettings.publishTime,
        { status: publishAs }
      );

      if (result.postId && result.postId > 0) {
        addLog(`Published! Post ID: ${result.postId}`);
        addLog(`View: ${result.url}`);
      } else {
        addLog('Published to WordPress (ID not returned)');
      }

    } catch (error: any) {
      addLog(`WordPress publish failed: ${error.message}`);
    }
  };

  const handleAutoPilotGenerate = async (topicIds: string[]) => {
    for (const topicId of topicIds) {
      const topic = state.topics.find(t => t.id === topicId);
      if (topic) {
        await handleGenerateBlog(topic, state.contentSettings.includeImages);
      }
    }
  };

  const handleAutoPilotPublish = async (topicId: string) => {
    const topic = state.topics.find(t => t.id === topicId);
    if (topic) {
      await handlePublishToWordPress(topic, 'draft');
    }
  };

  const handleSaveSettings = (apiKey: string, wp: WordPressSettings, content: ContentSettings) => {
    setState(prev => ({ ...prev, apiKey, wordpress: wp, contentSettings: content }));
    setSettingsOpen(false);
    addLog('Settings saved');
  };

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { text: string; bg: string }> = {
      pending: { text: 'PENDING', bg: '#fbbf24' },
      generating: { text: 'GENERATING', bg: '#3b82f6' },
      completed: { text: 'COMPLETED', bg: '#22c55e' },
      failed: { text: 'FAILED', bg: '#ef4444' }
    };
    const badge = badges[status] || badges.pending;
    return (
      <span 
        className="neo-title text-[10px] px-2 py-0.5 border-2 border-black"
        style={{ backgroundColor: badge.bg, color: status === 'pending' ? '#000' : '#fff' }}
      >
        {badge.text}
      </span>
    );
  };

  const getClusterIcon = (cluster: string) => {
    if (cluster.includes('Shopify')) {
      return <TrendingUp className="w-6 h-6" />;
    }
    return <Zap className="w-6 h-6" />;
  };

  const navigateTo = (view: 'DASHBOARD' | 'BLOGS' | 'ANALYTICS' | 'SETTINGS') => {
    setState(prev => ({ ...prev, currentView: view }));
    if (view === 'SETTINGS') {
      setSettingsOpen(true);
    }
  };

  // Render main content based on current view
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
                topics: prev.topics.filter(t => t.id !== topicId)
              }));
            }}
          />
        );
      case 'ANALYTICS':
        return <AnalyticsPage topics={state.topics} />;
      case 'DASHBOARD':
      default:
        return (
          <>
            {/* Header */}
            <header className="h-20 flex-shrink-0 flex items-center justify-between px-8 bg-white border-b-[3px] border-black">
              <div className="flex items-center gap-6">
                <h2 className="neo-title text-2xl uppercase">Active Trends Feed</h2>
                <div className="neo-box-sm bg-[var(--neo-accent)] px-3 py-1 flex items-center gap-2">
                  <div className="w-3 h-3 bg-black animate-pulse"></div>
                  <span className="neo-title text-xs">AGENT_ONLINE</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right hidden sm:block">
                  <p className="neo-title text-sm">ADMIN_CONSOLE</p>
                  <p className="text-[10px] font-bold uppercase text-gray-500">Standard_Plan_v2</p>
                </div>
                <div className="neo-box-sm overflow-hidden w-12 h-12 bg-gray-200 flex items-center justify-center">
                  <span className="neo-title text-lg">A</span>
                </div>
              </div>
            </header>

            {/* Action Buttons */}
            <div className="px-8 py-4 bg-white border-b-[3px] border-black">
              <div className="flex gap-4 max-w-4xl mx-auto">
                <button
                  onClick={handleScanTopics}
                  disabled={state.isScanning || !state.apiKey}
                  className="flex-1 neo-btn bg-[var(--neo-accent)] px-6 py-3 text-sm flex items-center justify-center gap-2"
                >
                  {state.isScanning ? <Loader2 className="w-4 h-4 animate-spin" /> : <Target className="w-4 h-4" />}
                  {state.isScanning ? 'SCANNING...' : 'SCAN TOPICS'}
                </button>

                <button
                  onClick={() => setAutoPilotOpen(true)}
                  disabled={!state.apiKey || state.topics.filter(t => t.status === 'pending').length === 0}
                  className="flex-1 neo-btn px-6 py-3 text-sm flex items-center justify-center gap-2"
                  style={{ backgroundColor: 'var(--neo-secondary)' }}
                >
                  <Play className="w-4 h-4" />
                  AUTO-PILOT BATCH
                </button>
              </div>
            </div>

            {/* Topics List */}
            <div className="flex-1 overflow-y-auto p-8">
              {state.topics.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center max-w-md">
                    <Sparkles className="w-20 h-20 mx-auto mb-6 opacity-30" />
                    <p className="neo-title text-xl mb-2">NO TOPICS FOUND</p>
                    <p className="text-sm text-gray-600">
                      Click SCAN TOPICS to discover content
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 max-w-4xl mx-auto">
                  {state.topics.map((topic) => (
                    <div 
                      key={topic.id}
                      className="neo-box p-6 bg-white flex flex-col md:flex-row gap-6 hover:bg-neutral-50 transition-colors"
                    >
                      {/* Icon */}
                      <div className="w-16 h-16 flex-shrink-0 bg-black text-[var(--neo-accent)] flex items-center justify-center">
                        {getClusterIcon(topic.cluster)}
                      </div>

                      {/* Content */}
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                          <h3 className="neo-title text-lg uppercase">{topic.title}</h3>
                          {getStatusBadge(topic.status)}
                        </div>
                        <p className="text-sm font-medium leading-relaxed mb-4 border-l-4 border-black pl-4 py-1 text-gray-700">
                          {topic.reasoning}
                        </p>

                        {/* Actions */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex gap-2">
                            {topic.status === 'pending' && (
                              <button
                                onClick={() => handleGenerateBlog(topic)}
                                className="neo-btn bg-[var(--neo-secondary)] px-4 py-2 text-xs flex items-center gap-2"
                              >
                                <Zap className="w-4 h-4" />
                                GENERATE BLOG
                              </button>
                            )}

                            {topic.status === 'completed' && topic.blogPost && (
                              <>
                                <button
                                  onClick={() => setSelectedPost(topic.blogPost!)}
                                  className="neo-btn bg-white px-4 py-2 text-xs flex items-center gap-2"
                                >
                                  <Eye className="w-4 h-4" />
                                  VIEW
                                </button>
                                <button
                                  onClick={() => handlePublishToWordPress(topic, 'draft')}
                                  className="neo-btn bg-[var(--neo-accent)] px-4 py-2 text-xs flex items-center gap-2"
                                >
                                  <Upload className="w-4 h-4" />
                                  PUBLISH
                                </button>
                              </>
                            )}

                            {topic.status === 'generating' && (
                              <div className="neo-box-sm px-4 py-2 text-xs flex items-center gap-2 bg-gray-100">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                GENERATING...
                              </div>
                            )}

                            {topic.status === 'failed' && (
                              <button
                                onClick={() => handleGenerateBlog(topic)}
                                className="neo-btn bg-red-500 text-white px-4 py-2 text-xs"
                              >
                                RETRY
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="neo-title text-[10px] text-gray-500">
                              SCORE: {topic.score}
                            </span>
                            <button
                              onClick={() => setState(prev => ({ ...prev, topics: prev.topics.filter(t => t.id !== topic.id) }))}
                              className="p-2 border-2 border-black hover:bg-red-500 hover:text-white transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}

                  <div className="neo-box p-4 bg-black text-white text-center neo-title text-sm border-dashed border-white border-2">
                    --- END OF CURRENT FEED - {stats.pending} TRENDS REMAINING ---
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
      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* LEFT SIDEBAR - Navigation */}
        <aside className="w-64 flex-shrink-0 bg-white border-r-[3px] border-black flex flex-col">
          {/* Logo */}
          <div className="p-6 border-b-[3px] border-black bg-[var(--neo-accent)]">
            <div className="flex items-center gap-2">
              <Sparkles className="w-8 h-8 text-black" />
              <h1 className="neo-title text-xl uppercase leading-none">
                Trends<br/>Overflow
              </h1>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-8 space-y-2 overflow-y-auto">
            <button 
              onClick={() => navigateTo('DASHBOARD')}
              className={`w-full flex items-center gap-3 px-4 py-3 neo-title text-sm transition-all ${
                state.currentView === 'DASHBOARD' 
                  ? 'neo-box-sm bg-[var(--neo-secondary)]' 
                  : 'border-2 border-transparent hover:border-black'
              }`}
            >
              <Grid3X3 className="w-5 h-5" />
              DASHBOARD
            </button>
            <button 
              onClick={() => navigateTo('BLOGS')}
              className={`w-full flex items-center gap-3 px-4 py-3 neo-title text-sm transition-all ${
                state.currentView === 'BLOGS' 
                  ? 'neo-box-sm bg-[var(--neo-secondary)]' 
                  : 'border-2 border-transparent hover:border-black'
              }`}
            >
              <FileText className="w-5 h-5" />
              BLOGS
              {state.savedBlogs.length > 0 && (
                <span className="ml-auto bg-black text-white text-[10px] px-2 py-0.5">
                  {state.savedBlogs.length}
                </span>
              )}
            </button>
            <button 
              onClick={() => navigateTo('ANALYTICS')}
              className={`w-full flex items-center gap-3 px-4 py-3 neo-title text-sm transition-all ${
                state.currentView === 'ANALYTICS' 
                  ? 'neo-box-sm bg-[var(--neo-secondary)]' 
                  : 'border-2 border-transparent hover:border-black'
              }`}
            >
              <BarChart3 className="w-5 h-5" />
              ANALYTICS
            </button>
            <button 
              onClick={() => navigateTo('SETTINGS')}
              className={`w-full flex items-center gap-3 px-4 py-3 neo-title text-sm transition-all ${
                state.currentView === 'SETTINGS' 
                  ? 'neo-box-sm bg-[var(--neo-secondary)]' 
                  : 'border-2 border-transparent hover:border-black'
              }`}
            >
              <Settings className="w-5 h-5" />
              SETTINGS
            </button>
          </nav>

          {/* Model Info */}
          <div className="p-4 bg-black text-white border-t-[3px] border-black">
            <div className="flex items-center gap-2 mb-2">
              <Cpu className="w-4 h-4 text-[var(--neo-accent)]" />
              <span className="neo-title text-[10px] uppercase">ACTIVE MODEL</span>
            </div>
            <p className="neo-title text-xs text-[var(--neo-accent)]">
              {state.contentSettings.primaryModel}
            </p>
            <div className="mt-3">
              <div className="flex justify-between neo-title text-[10px] mb-1">
                <span>TOKENS</span>
                <span>72%</span>
              </div>
              <div className="w-full bg-neutral-800 border border-white h-3 p-0.5">
                <div className="bg-[var(--neo-accent)] h-full" style={{ width: '72%' }}></div>
              </div>
            </div>
          </div>
        </aside>

        {/* CENTER PANEL */}
        <main className="flex-1 flex flex-col min-w-0 bg-[var(--neo-bg)]">
          {renderMainContent()}
        </main>

        {/* RIGHT SIDEBAR - Config Panel */}
        <aside className="w-80 flex-shrink-0 bg-white border-l-[3px] border-black flex flex-col">
          {/* Header */}
          <div className="p-6 border-b-[3px] border-black bg-white flex-shrink-0">
            <h2 className="neo-title text-lg uppercase flex items-center gap-2">
              <Activity className="w-5 h-5" />
              CONFIG_PANEL
            </h2>
          </div>

          {/* AI Providers Section */}
          <div className="flex-1 overflow-y-auto p-6 space-y-8">
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5" />
                <h3 className="neo-title text-xs uppercase bg-black text-white px-2 py-0.5">
                  AI_PROVIDERS
                </h3>
              </div>
              
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="neo-title text-[10px] uppercase">GEMINI_API_KEY</label>
                  <div className="neo-input text-xs flex items-center justify-between">
                    <span>{state.apiKey ? '•••••••••••••••' : 'Not configured'}</span>
                    {state.apiKey ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="neo-title text-[10px] uppercase">MODEL</label>
                  <div className="neo-input text-xs">
                    {state.contentSettings.primaryModel}
                  </div>
                </div>
              </div>
            </section>

            {/* WP Integration Section */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Layers className="w-5 h-5" />
                <h3 className="neo-title text-xs uppercase bg-black text-white px-2 py-0.5">
                  WP_INTEGRATION
                </h3>
              </div>
              
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="neo-title text-[10px] uppercase">SITE_URL</label>
                  <div className="neo-input text-xs truncate">
                    {state.wordpress.url || 'Not configured'}
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 neo-title text-[10px] text-green-600">
                    {state.wordpress.url ? (
                      <><CheckCircle2 className="w-4 h-4" /> CONNECTED</>
                    ) : (
                      <><AlertCircle className="w-4 h-4 text-red-500" /> NOT CONNECTED</>
                    )}
                  </div>
                </div>
              </div>
            </section>

            {/* Generation Settings */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Info className="w-5 h-5" />
                <h3 className="neo-title text-xs uppercase bg-black text-white px-2 py-0.5">
                  GENERATION
                </h3>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="neo-title text-[10px] uppercase text-gray-500">Words</span>
                  <span className="neo-title text-sm">{state.contentSettings.targetWordCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="neo-title text-[10px] uppercase text-gray-500">Images</span>
                  <span className="neo-title text-sm">{state.contentSettings.includeImages ? 'ON' : 'OFF'}</span>
                </div>
              </div>
            </section>

            {/* Stats Grid */}
            <section className="grid grid-cols-2 gap-3">
              <div className="neo-box-sm p-3 bg-[var(--neo-accent)]">
                <p className="neo-title text-[9px] uppercase">TOTAL</p>
                <p className="neo-title text-2xl">{stats.total}</p>
              </div>
              <div className="neo-box-sm p-3 bg-white">
                <p className="neo-title text-[9px] uppercase">DONE</p>
                <p className="neo-title text-2xl">{stats.completed}</p>
              </div>
              <div className="neo-box-sm p-3 bg-white">
                <p className="neo-title text-[9px] uppercase">QUEUE</p>
                <p className="neo-title text-2xl">{stats.pending}</p>
              </div>
              <div className="neo-box-sm p-3 bg-white">
                <p className="neo-title text-[9px] uppercase">AVG</p>
                <p className="neo-title text-2xl">{stats.avgScore}</p>
              </div>
            </section>
          </div>

          {/* Save Button */}
          <div className="p-6 bg-neutral-100 border-t-[3px] border-black flex-shrink-0">
            <button
              onClick={() => setSettingsOpen(true)}
              className="w-full py-4 neo-btn bg-[var(--neo-accent)] text-black flex items-center justify-center gap-2"
            >
              <Settings className="w-5 h-5" />
              OPEN SETTINGS
            </button>
          </div>
        </aside>
      </div>

      {/* FOOTER - Collapsible/Resizable Terminal */}
      <div 
        ref={terminalRef}
        className="flex-shrink-0 bg-black border-t-[3px] border-black flex flex-col z-10 relative"
        style={{ height: terminalCollapsed ? MIN_TERMINAL_HEIGHT : terminalHeight }}
      >
        {/* Resize Handle */}
        {!terminalCollapsed && (
          <div 
            className="absolute -top-2 left-0 right-0 h-4 cursor-ns-resize flex items-center justify-center hover:bg-white/10 transition-colors"
            onMouseDown={() => setIsResizing(true)}
          >
            <div className="w-12 h-1 bg-gray-600 rounded-full"></div>
          </div>
        )}

        {/* Terminal Header */}
        <div className="flex items-center justify-between px-4 py-2 border-b-2 border-neutral-800 bg-neutral-900">
          <div className="flex items-center gap-2">
            <TerminalIcon className="text-white text-sm w-4 h-4" />
            <span className="neo-title text-white text-[11px] tracking-widest">AGENT_LOGS.EXE</span>
          </div>
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setState(prev => ({ ...prev, logs: [] }))}
              className="neo-title text-[10px] bg-white text-black px-3 py-0.5 hover:bg-[var(--neo-accent)] transition-colors"
            >
              CLEAR
            </button>
            <button
              onClick={() => setTerminalCollapsed(!terminalCollapsed)}
              className="p-1 hover:bg-white/10 transition-colors"
            >
              {terminalCollapsed ? (
                <Maximize2 className="w-4 h-4 text-white" />
              ) : (
                <Minimize2 className="w-4 h-4 text-white" />
              )}
            </button>
            <button
              onClick={() => setTerminalCollapsed(!terminalCollapsed)}
              className="p-1 hover:bg-white/10 transition-colors"
            >
              {terminalCollapsed ? <ChevronUp className="w-4 h-4 text-white" /> : <ChevronDown className="w-4 h-4 text-white" />}
            </button>
          </div>
        </div>

        {/* Terminal Content */}
        {!terminalCollapsed && (
          <div className="flex-1 overflow-y-auto p-4 space-y-1 console">
            {state.logs.map((log, i) => (
              <div key={i} className="terminal-text text-[12px]">
                <span className="opacity-50">{log.split(']')[0]}]</span>
                <span>{log.split(']').slice(1).join(']')}</span>
              </div>
            ))}
            {state.logs.length === 0 && (
              <div className="terminal-text text-[12px]">
                <span className="opacity-50">[{new Date().toLocaleTimeString()}]</span>
                <span> System ready. Waiting for commands...</span>
              </div>
            )}
            <div className="terminal-text text-[12px] animate-pulse">_</div>
          </div>
        )}
      </div>

      {/* Modals */}
      {settingsOpen && (
        <SettingsModal
          isOpen={settingsOpen}
          onSave={handleSaveSettings}
          currentApiKey={state.apiKey}
          currentWpSettings={state.wordpress}
          currentContentSettings={state.contentSettings}
          onClose={() => {
            setSettingsOpen(false);
            setState(prev => ({ ...prev, currentView: 'DASHBOARD' }));
          }}
        />
      )}

      {autoPilotOpen && (
        <AutoPilotModal
          isOpen={autoPilotOpen}
          onClose={() => setAutoPilotOpen(false)}
          topics={state.topics}
          apiKey={state.apiKey}
          onGenerate={handleAutoPilotGenerate}
          onPublish={handleAutoPilotPublish}
        />
      )}

      {selectedPost && (
        <ArticleView
          post={selectedPost}
          onClose={() => setSelectedPost(null)}
        />
      )}
    </div>
  );
}

export default App;