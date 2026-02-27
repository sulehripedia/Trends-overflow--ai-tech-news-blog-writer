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
  X
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

  // Combine topics with blog posts and saved blogs
  const allBlogs = React.useMemo(() => {
    const blogs: Array<{ 
      blog: BlogPost; 
      topic: Topic | null; 
      createdAt: string;
      source: 'topic' | 'saved';
    }> = [];

    // From topics
    topics.forEach(topic => {
      if (topic.blogPost) {
        blogs.push({
          blog: topic.blogPost,
          topic,
          createdAt: topic.generatedAt || new Date().toISOString(),
          source: 'topic'
        });
      }
    });

    // From saved blogs
    savedBlogs.forEach(blog => {
      blogs.push({
        blog,
        topic: null,
        createdAt: blog.createdAt,
        source: 'saved'
      });
    });

    return blogs;
  }, [topics, savedBlogs]);

  // Filter and sort blogs
  const filteredBlogs = React.useMemo(() => {
    let filtered = allBlogs;

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(item => 
        item.blog.title.toLowerCase().includes(query) ||
        item.blog.tags.some(tag => tag.toLowerCase().includes(query)) ||
        item.blog.meta.primary_keyword.toLowerCase().includes(query)
      );
    }

    // Cluster filter
    if (filterCluster !== 'all') {
      filtered = filtered.filter(item => 
        item.topic?.cluster.toLowerCase().includes(filterCluster.toLowerCase())
      );
    }

    // Sort
    filtered = [...filtered].sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      // Sort by SEO score
      return (b.blog.seo_report?.score || 0) - (a.blog.seo_report?.score || 0);
    });

    return filtered;
  }, [allBlogs, searchQuery, filterCluster, sortBy]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getClusterColor = (cluster?: string) => {
    if (cluster?.includes('Shopify')) return 'bg-purple-500';
    return 'bg-blue-500';
  };

  return (
    <div className="h-full flex flex-col bg-[var(--neo-bg)]">
      {/* Header */}
      <div className="p-6 border-b-[3px] border-black bg-white">
        <div className="flex items-center justify-between mb-4">
          <h2 className="neo-title text-2xl uppercase flex items-center gap-3">
            <FileText className="w-7 h-7" />
            Generated Blogs
          </h2>
          <div className="neo-box-sm px-4 py-2 bg-[var(--neo-accent)]">
            <span className="neo-title text-sm">{filteredBlogs.length} BLOGS</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex gap-4 flex-wrap">
          {/* Search */}
          <div className="flex-1 min-w-[250px] relative">
            <Search className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
            <input
              type="text"
              placeholder="Search blogs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="neo-input pl-10 w-full"
            />
            {searchQuery && (
              <button 
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-3"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            )}
          </div>

          {/* Cluster Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            <select
              value={filterCluster}
              onChange={(e) => setFilterCluster(e.target.value)}
              className="neo-input cursor-pointer"
            >
              <option value="all">All Clusters</option>
              <option value="shopify">Shopify Solutions</option>
              <option value="tech">Tech News</option>
            </select>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'date' | 'score')}
              className="neo-input cursor-pointer"
            >
              <option value="date">Sort by Date</option>
              <option value="score">Sort by SEO Score</option>
            </select>
          </div>
        </div>
      </div>

      {/* Blog List */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredBlogs.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <FileText className="w-20 h-20 mx-auto mb-6 opacity-30" />
              <p className="neo-title text-xl mb-2">NO BLOGS FOUND</p>
              <p className="text-sm text-gray-600">
                Generate your first blog from the Dashboard
              </p>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 max-w-5xl mx-auto">
            {filteredBlogs.map((item, index) => (
              <div 
                key={`${item.blog.slug}-${index}`}
                className="neo-box p-5 bg-white hover:bg-neutral-50 transition-colors"
              >
                <div className="flex gap-4">
                  {/* Featured Image Preview */}
                  <div className="w-24 h-24 flex-shrink-0 border-2 border-black bg-gray-100 overflow-hidden">
                    {item.blog.featured_image_base64 ? (
                      <img 
                        src={item.blog.featured_image_base64} 
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <FileText className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="neo-title text-lg uppercase mb-1 truncate">
                          {item.blog.title}
                        </h3>
                        
                        {/* Meta info */}
                        <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-4 h-4" />
                            {formatDate(item.createdAt)}
                          </span>
                          {item.topic && (
                            <span className={`px-2 py-0.5 text-white ${getClusterColor(item.topic.cluster)}`}>
                              {item.topic.cluster.split(' ')[0]}
                            </span>
                          )}
                          <span className="flex items-center gap-1">
                            <Tag className="w-4 h-4" />
                            {item.blog.tags.length} tags
                          </span>
                        </div>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-1 mb-3">
                          {item.blog.tags.slice(0, 5).map(tag => (
                            <span 
                              key={tag} 
                              className="text-[10px] neo-title px-2 py-0.5 border border-black"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>

                        {/* Keywords */}
                        <div className="text-xs text-gray-500">
                          <span className="neo-title">KEYWORDS:</span>{' '}
                          {item.blog.meta.primary_keyword}, {item.blog.meta.secondary_keywords.slice(0, 3).join(', ')}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => onViewBlog(item.blog)}
                          className="neo-btn bg-[var(--neo-secondary)] px-3 py-2 text-xs flex items-center gap-1"
                        >
                          <Eye className="w-4 h-4" />
                          VIEW
                        </button>
                        {item.topic && (
                          <button
                            onClick={() => onDeleteBlog(item.topic!.id)}
                            className="neo-btn bg-white px-3 py-2 text-xs flex items-center gap-1 hover:bg-red-500 hover:text-white"
                          >
                            <Trash2 className="w-4 h-4" />
                            DELETE
                          </button>
                        )}
                      </div>
                    </div>

                    {/* SEO Score Bar */}
                    <div className="mt-3 flex items-center gap-3">
                      <span className="neo-title text-[10px]">SEO SCORE</span>
                      <div className="flex-1 h-3 bg-gray-200 border border-black">
                        <div 
                          className="h-full bg-[var(--neo-accent)]"
                          style={{ width: `${item.blog.seo_report?.score || 0}%` }}
                        />
                      </div>
                      <span className="neo-title text-sm">{item.blog.seo_report?.score || 0}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};