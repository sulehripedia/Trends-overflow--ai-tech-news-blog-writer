import type { Topic, BlogPost, WordPressSettings } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export class ApiService {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /* ------------------------- TOPIC DISCOVERY ------------------------- */

  async scanForTopics(): Promise<Topic[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/gemini/discover-topics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey: this.apiKey }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to discover topics');
      }

      const data = await response.json();
      return data.topics;
    } catch (error) {
      console.error('Topic discovery error:', error);
      throw error;
    }
  }

  /* ------------------------- BLOG GENERATION ------------------------- */

  async generateBlogPost(topicTitle: string, wordCount = 1200): Promise<BlogPost> {
    try {
      const response = await fetch(`${API_BASE_URL}/gemini/generate-post`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: this.apiKey,
          topicTitle,
          wordCount,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate blog post');
      }

      const data = await response.json();
      return data.blogPost;
    } catch (error) {
      console.error('Blog generation error:', error);
      throw error;
    }
  }

  /* ------------------------- IMAGE GENERATION ------------------------- */

  async generateImage(prompt: string): Promise<string | null> {
    try {
      const response = await fetch(`${API_BASE_URL}/gemini/generate-image`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: this.apiKey,
          prompt,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to generate image');
      }

      const data = await response.json();
      return data.imageData || null;
    } catch (error) {
      console.error('Image generation error:', error);
      return null;
    }
  }

  async generateInlineImages(prompts: string[]): Promise<string[]> {
    const images: string[] = [];
    for (const prompt of prompts) {
      try {
        const imageData = await this.generateImage(prompt);
        if (imageData) {
          images.push(imageData);
        }
      } catch (error) {
        console.error('Failed to generate inline image:', error);
      }
    }
    return images;
  }

  /* ------------------------- WORDPRESS OPERATIONS ------------------------- */

  async testWordPressConnection(wordpress: WordPressSettings): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/wordpress/test-connection`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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

      return await response.json();
    } catch (error) {
      console.error('WordPress connection test error:', error);
      throw error;
    }
  }

 async publishToWordPress(
  blogPost: BlogPost,
  wordpress: WordPressSettings,
  publishTime: string,
  options: { status?: 'publish' | 'draft' | 'future' } = {}
): Promise<{ postId: number; url: string; status: string }> {
  try {
    // Validate WordPress settings
    if (!wordpress.url || !wordpress.username || !wordpress.applicationPassword) {
      throw new Error('WordPress credentials are incomplete. Please check URL, username, and application password.');
    }

    // Clean up URL
    const cleanUrl = wordpress.url.replace(/\/$/, '');
    
    // Validate URL format
    try {
      new URL(cleanUrl);
    } catch {
      throw new Error('Invalid WordPress URL format. Please use format: https://yoursite.com');
    }

    console.log('Publishing to WordPress:', {
      url: cleanUrl,
      username: wordpress.username,
      title: blogPost.title,
      hasImage: !!blogPost.featured_image_base64
    });

    const response = await fetch(`${API_BASE_URL}/wordpress/publish-post`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: cleanUrl,
        username: wordpress.username,
        appPassword: wordpress.applicationPassword,
        blogPost,
        publishTime,
        featuredImageBase64: blogPost.featured_image_base64,
        status: options.status || 'draft',
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      // Provide user-friendly error messages
      let errorMessage = data.message || 'Failed to publish to WordPress';
      
      if (data.message?.includes('rest_cannot_create')) {
        errorMessage = 'Permission denied: Your WordPress user does not have permission to create posts. Ensure your account has Administrator or Editor role.';
      } else if (data.message?.includes('authentication')) {
        errorMessage = 'Authentication failed: Please verify your Application Password. Go to WordPress > Users > Profile > Application Passwords to generate one.';
      } else if (data.message?.includes('rest_authentication_error')) {
        errorMessage = 'REST API blocked: A security plugin (Wordfence, Sucuri, etc.) may be blocking API access. Please whitelist your server IP or check security plugin settings.';
      } else if (data.message?.includes('ECONNREFUSED') || data.message?.includes('ENOTFOUND')) {
        errorMessage = `Cannot connect to ${cleanUrl}. Please check your WordPress URL and ensure your site is online.`;
      }
      
      throw new Error(errorMessage);
    }

    return {
      postId: data.postId || 0,
      url: data.url || `${cleanUrl}/wp-admin/post.php?post=${data.postId}&action=edit`,
      status: data.status || 'unknown'
    };
  } catch (error: any) {
    console.error('WordPress publish error:', error);
    throw error;
  }
}
  async getWordPressPosts(wordpress: WordPressSettings, limit = 10): Promise<any[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/wordpress/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: wordpress.url,
          username: wordpress.username,
          appPassword: wordpress.applicationPassword,
          limit,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to fetch WordPress posts');
      }

      const data = await response.json();
      return data.posts;
    } catch (error) {
      console.error('WordPress posts fetch error:', error);
      throw error;
    }
  }

  /* ------------------------- TREND ANALYSIS ------------------------- */

  async getTrendAnalysis(): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/gemini/trend-analysis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ apiKey: this.apiKey }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to get trend analysis');
      }

      return await response.json();
    } catch (error) {
      console.error('Trend analysis error:', error);
      throw error;
    }
  }

  /* ------------------------- CLUSTERING ------------------------- */

  async clusterTopics(topics: Topic[]): Promise<any> {
    try {
      const response = await fetch(`${API_BASE_URL}/gemini/cluster-topics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          apiKey: this.apiKey,
          topics 
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to cluster topics');
      }

      return await response.json();
    } catch (error) {
      console.error('Topic clustering error:', error);
      throw error;
    }
  }
}