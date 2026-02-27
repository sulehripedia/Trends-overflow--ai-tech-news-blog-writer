import React, { useState } from 'react';
import {
  Search,
  Calendar,
  Eye,
  Trash2,
  Filter,
  Tag,
  TrendingUp,
  FileText,
  X,
  BarChart3,
  Clock
} from 'lucide-react';
import type { BlogPost, Topic } from '../types';

interface BlogsPageProps {
  topics: Topic[];
  savedBlogs: BlogPost[];
  onViewBlog: (blog: BlogPost) => void;
  onDeleteBlog: (topicId: string) => void;
}

export const BlogsPage: React.FC<BlogsPageProps> = ({
  topics,
  savedBlogs,
  onViewBlog,
  onDeleteBlog
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCluster, setFilterCluster] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'score'>('date');

  // Collect all blogs from topics (primary source) + standalone savedBlogs
  const allBlogs = React.useMemo(() => {
    const seen = new Set<string>();
    const result: Array<{
      blog: BlogPost;
      topic: Topic | null;
      createdAt: string;
    }> = [];

    // From topics with completed blog posts
    for (const topic of topics) {
      if (topic.blogPost && topic.status === 'completed') {
        const key = topic.blogPost.slug || topic.id;
        if (!seen.has(key)) {
          seen.add(key);
          result.push({
            blog: topic.blogPost,
            topic,
            createdAt: topic.generatedAt || topic.blogPost.createdAt || new Date().toISOString()
          });
        }
      }
    }

    // From savedBlogs that aren't already represented
    for (const blog of savedBlogs) {
      const key = blog.slug || blog.topicId;
      if (key && !seen.has(key)) {
        seen.add(key);
        result.push({ blog, topic: null, createdAt: blog.createdAt || new Date().toISOString() });
      }
    }

    return result;
  }, [topics, savedBlogs]);

  const filteredBlogs = React.useMemo(() => {
    let filtered = [...allBlogs];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.blog.title?.toLowerCase().includes(q) ||
        item.blog.tags?.some(t => t.toLowerCase().includes(q)) ||
        item.blog.meta?.primary_keyword?.toLowerCase().includes(q)
      );
    }

    if (filterCluster !== 'all') {
      filtered = filtered.filter(item =>
        item.topic?.cluster?.toLowerCase().includes(filterCluster.toLowerCase())
      );
    }

    filtered.sort((a, b) => {
      if (sortBy === 'score') {
        return (b.blog.seo_report?.score || 0) - (a.blog.seo_report?.score || 0);
      }
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });

    return filtered;
  }, [allBlogs, searchQuery, filterCluster, sortBy]);

  const formatDate = (d: string) => {
    try {
      return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    } catch { return 'Unknown date'; }
  };

  const getClusterColor = (cluster?: string) => {
    if (!cluster) return 'bg-gray-500';
    if (cluster.includes('AI')) return 'bg-purple-600';
    if (cluster.includes('Cyber')) return 'bg-red-600';
    if (cluster.includes('Developer')) return 'bg-blue-600';
    if (cluster.includes('Consumer')) return 'bg-orange-500';
    return 'bg-gray-700';
  };

  const estimateWordCount = (html: string) => {
    if (!html) return 0;
    return Math.round(html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().split(' ').length);
  };

  const estimateReadTime = (html: string) => {
    return Math.ceil(estimateWordCount(html) / 220);
  };

  return (
    <div className="h-full flex flex-col bg-[var(--neo-bg)]">
      {/* Header */}
      <div className="p-6 border-b-[3px] border-black bg-white flex-shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h2 className="neo-title text-2xl uppercase flex items-center gap-3">
            <FileText className="w-7 h-7" />
            Generated Blogs
          </h2>
          <div className="neo-box-sm px-4 py-2 bg-[var(--neo-accent)]">
            <span className="neo-title text-sm">{allBlogs.length} TOTAL</span>
          </div>
        </div>

        <div className="flex gap-3 flex-wrap">
          <div className="flex-1 min-w-[220px] relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              placeholder="Search blogs, keywords, tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="neo-input pl-9"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-4 h-4 text-gray-500" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4" />
            <select
              value={filterCluster}
              onChange={(e) => setFilterCluster(e.target.value)}
              className="neo-input"
            >
              <option value="all">All Topics</option>
              <option value="AI">AI & Machine Learning</option>
              <option value="Big Tech">Big Tech News</option>
              <option value="Cyber">Cybersecurity</option>
              <option value="Developer">Developer Tech</option>
              <option value="Consumer">Consumer Tech</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'score')}
              className="neo-input"
            >
              <option value="date">Newest First</option>
              <option value="score">Best SEO Score</option>
            </select>
          </div>
        </div>
      </div>

      {/* Blog List */}
      <div className="flex-1 overflow-y-auto p-6">
        {allBlogs.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center max-w-sm">
              <FileText className="w-20 h-20 mx-auto mb-6 opacity-20" />
              <p className="neo-title text-xl mb-3">NO BLOGS GENERATED YET</p>
              <p className="text-sm text-gray-500 leading-relaxed">
                Go to Dashboard → Scan Topics → Generate Blog to create your first post.
              </p>
            </div>
          </div>
        ) : filteredBlogs.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-20" />
              <p className="neo-title text-lg mb-2">NO RESULTS FOUND</p>
              <button onClick={() => { setSearchQuery(''); setFilterCluster('all'); }} className="neo-btn bg-[var(--neo-accent)] px-4 py-2 text-xs">
                CLEAR FILTERS
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 max-w-5xl mx-auto">
            {filteredBlogs.map((item, index) => (
              <div
                key={`${item.blog.slug}-${index}`}
                className="neo-box p-5 bg-white hover:bg-neutral-50 transition-colors"
              >
                <div className="flex gap-4">
                  {/* Left: Score circle */}
                  <div className="flex-shrink-0 flex flex-col items-center gap-2">
                    <div
                      className={`w-16 h-16 border-[3px] border-black flex items-center justify-center text-xl neo-title ${
                        (item.blog.seo_report?.score || 0) >= 90
                          ? 'bg-[var(--neo-accent)]'
                          : (item.blog.seo_report?.score || 0) >= 75
                          ? 'bg-yellow-300'
                          : 'bg-red-200'
                      }`}
                    >
                      {item.blog.seo_report?.score || '?'}
                    </div>
                    <span className="neo-title text-[9px] text-gray-500">SEO</span>
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <h3 className="neo-title text-base uppercase leading-tight flex-1">
                        {item.blog.title || 'Untitled Blog'}
                      </h3>
                      {item.topic && (
                        <span className={`flex-shrink-0 text-white text-[10px] neo-title px-2 py-1 ${getClusterColor(item.topic.cluster)}`}>
                          {item.topic.cluster?.split(' ')[0]}
                        </span>
                      )}
                    </div>

                    {/* Meta row */}
                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-500 mb-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(item.createdAt)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {estimateReadTime(item.blog.content_html)} min read
                      </span>
                      <span className="flex items-center gap-1">
                        <BarChart3 className="w-3 h-3" />
                        {estimateWordCount(item.blog.content_html).toLocaleString()} words
                      </span>
                      <span className="flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        {item.blog.tags?.length || 0} tags
                      </span>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1 mb-3">
                      {item.blog.tags?.slice(0, 6).map(tag => (
                        <span key={tag} className="text-[10px] neo-title px-2 py-0.5 border border-black bg-gray-50">
                          #{tag}
                        </span>
                      ))}
                    </div>

                    {/* Meta description preview */}
                    {item.blog.meta?.meta_description && (
                      <p className="text-xs text-gray-600 leading-relaxed mb-3 border-l-2 border-gray-300 pl-2 italic">
                        {item.blog.meta.meta_description}
                      </p>
                    )}

                    {/* SEO Score Bar */}
                    <div className="flex items-center gap-3 mb-3">
                      <span className="neo-title text-[9px] text-gray-500">SEO SCORE</span>
                      <div className="flex-1 h-2 bg-gray-200 border border-black">
                        <div
                          className={`h-full transition-all ${
                            (item.blog.seo_report?.score || 0) >= 90 ? 'bg-green-500' :
                            (item.blog.seo_report?.score || 0) >= 75 ? 'bg-yellow-400' : 'bg-red-400'
                          }`}
                          style={{ width: `${item.blog.seo_report?.score || 0}%` }}
                        />
                      </div>
                      <span className="neo-title text-xs">{item.blog.seo_report?.score || 0}/100</span>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => onViewBlog(item.blog)}
                        className="neo-btn bg-[var(--neo-secondary)] px-4 py-2 text-xs flex items-center gap-1"
                      >
                        <Eye className="w-3 h-3" />
                        READ ARTICLE
                      </button>
                      {item.topic && (
                        <button
                          onClick={() => onDeleteBlog(item.topic!.id)}
                          className="neo-btn bg-white px-3 py-2 text-xs flex items-center gap-1 hover:bg-red-500 hover:text-white transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                          DELETE
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <div className="neo-box p-3 bg-black text-white text-center neo-title text-xs">
              --- SHOWING {filteredBlogs.length} OF {allBlogs.length} BLOGS ---
            </div>
          </div>
        )}
      </div>
    </div>
  );
};