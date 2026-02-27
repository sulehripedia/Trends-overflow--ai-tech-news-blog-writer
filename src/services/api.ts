import type { Topic, BlogPost, WordPressSettings } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export class ApiService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async scanForTopics(): Promise<Topic[]> {
    const response = await fetch(`${API_BASE_URL}/gemini/discover-topics`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: this.apiKey }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to discover topics');
    }
    const data = await response.json();
    return data.topics;
  }

  async generateBlogPost(topicTitle: string, wordCount = 1800): Promise<BlogPost> {
    const response = await fetch(`${API_BASE_URL}/gemini/generate-post`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: this.apiKey, topicTitle, wordCount }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to generate blog post');
    }
    const data = await response.json();
    return data.blogPost;
  }

  async testWordPressConnection(wordpress: WordPressSettings): Promise<any> {
    const response = await fetch(`${API_BASE_URL}/wordpress/test-connection`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: wordpress.url,
        username: wordpress.username,
        appPassword: wordpress.applicationPassword,
      }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'WordPress connection failed');
    }
    return response.json();
  }

  async publishToWordPress(
    blogPost: BlogPost,
    wordpress: WordPressSettings,
    publishTime: string,
    options: { status?: 'publish' | 'draft' | 'future' } = {}
  ): Promise<{ postId: number; url: string; status: string }> {
    const cleanUrl = wordpress.url.replace(/\/$/, '');
    try { new URL(cleanUrl); } catch { throw new Error('Invalid WordPress URL format.'); }

    const response = await fetch(`${API_BASE_URL}/wordpress/publish-post`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        url: cleanUrl,
        username: wordpress.username,
        appPassword: wordpress.applicationPassword,
        blogPost,
        publishTime,
        status: options.status || 'draft',
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || 'Failed to publish to WordPress');
    }
    return { postId: data.postId || 0, url: data.url || '', status: data.status || 'unknown' };
  }

  async startAutoPilot(config: {
    wpUrl: string;
    wpUsername: string;
    wpPassword: string;
    publishTime: string;
    wordCount: number;
  }): Promise<{ success: boolean; message: string; schedule: string }> {
    const response = await fetch(`${API_BASE_URL}/gemini/autopilot/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey: this.apiKey, ...config }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to start AutoPilot');
    }
    return response.json();
  }

  async stopAutoPilot(): Promise<void> {
    await fetch(`${API_BASE_URL}/gemini/autopilot/stop`, { method: 'POST' });
  }

  async getAutoPilotStatus(): Promise<{ isRunning: boolean }> {
    const response = await fetch(`${API_BASE_URL}/gemini/autopilot/status`);
    return response.json();
  }
}