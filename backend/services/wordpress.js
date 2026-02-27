import axios from 'axios';
import FormData from 'form-data';

class WordPressService {
  constructor(siteUrl, username, appPassword) {
    // Ensure URL is properly formatted
    this.siteUrl = siteUrl.replace(/\/$/, '').trim();
    this.username = username.trim();
    this.appPassword = appPassword.trim();
    
    // Create base64 auth token - ensure proper encoding
    const credentials = `${this.username}:${this.appPassword}`;
    this.authToken = Buffer.from(credentials).toString('base64');
    
    this.apiBase = `${this.siteUrl}/wp-json/wp/v2`;
    
    console.log('WordPress Service initialized:', {
      siteUrl: this.siteUrl,
      username: this.username,
      apiBase: this.apiBase,
      authTokenLength: this.authToken.length
    });
  }

  // Get headers for WordPress API
  getHeaders(contentType = 'application/json') {
    const headers = {
      'Authorization': `Basic ${this.authToken}`,
      'Accept': 'application/json'
    };
    
    if (contentType) {
      headers['Content-Type'] = contentType;
    }
    
    return headers;
  }

  // Test WordPress connection
  async testConnection() {
    try {
      console.log('Testing connection to:', `${this.apiBase}/users/me`);
      
      const response = await axios.get(`${this.apiBase}/users/me`, {
        headers: this.getHeaders(),
        timeout: 10000
      });

      console.log('Connection test successful:', response.data);

      return {
        success: true,
        user: response.data.name,
        id: response.data.id,
        slug: response.data.slug
      };
    } catch (error) {
      console.error('WordPress connection test failed:', error.response?.data || error.message);
      
      // Provide specific error messages for common issues
      if (error.response?.status === 401) {
        throw new Error('Authentication failed: Invalid username or application password. Make sure you are using an Application Password from WordPress (Users > Profile > Application Passwords), not your regular login password.');
      }
      if (error.response?.status === 403) {
        throw new Error('Access forbidden: The user does not have permission to access the REST API. Ensure the user has Administrator or Editor role.');
      }
      if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
        throw new Error(`Cannot connect to WordPress site at ${this.siteUrl}. Please check the URL and ensure your site is accessible.`);
      }
      if (error.response?.data?.code === 'rest_authentication_error') {
        throw new Error('REST API authentication error. This may be caused by security plugins (like Wordfence) blocking API access. Please whitelist your server IP or temporarily disable security plugins to test.');
      }
      
      throw new Error(`WordPress connection failed: ${error.response?.data?.message || error.message}`);
    }
  }

  // Upload image to WordPress media library
  async uploadImage(imageBase64, filename, altText = '') {
    try {
      // Handle different base64 formats
      let base64Data = imageBase64;
      let contentType = 'image/png';
      
      if (imageBase64.includes(',')) {
        const parts = imageBase64.split(',');
        const header = parts[0];
        base64Data = parts[1];
        
        // Extract content type from header
        const match = header.match(/data:image\/(\w+);/);
        if (match) {
          contentType = `image/${match[1]}`;
        }
      }

      // Convert base64 to buffer
      const buffer = Buffer.from(base64Data, 'base64');
      
      // Ensure filename has proper extension
      let finalFilename = filename;
      if (!finalFilename.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
        const ext = contentType.split('/')[1] || 'png';
        finalFilename = `${finalFilename}.${ext}`;
      }
      
      console.log('Uploading image:', { filename: finalFilename, size: buffer.length, contentType });

      const form = new FormData();
      form.append('file', buffer, {
        filename: finalFilename,
        contentType: contentType,
        knownLength: buffer.length
      });

      // Upload to media endpoint
      const uploadUrl = `${this.apiBase}/media`;
      console.log('Uploading to:', uploadUrl);

      const response = await axios.post(uploadUrl, form, {
        headers: {
          ...this.getHeaders(),
          ...form.getHeaders()
        },
        maxBodyLength: 50 * 1024 * 1024, // 50MB
        maxContentLength: 50 * 1024 * 1024,
        timeout: 30000
      });

      console.log('Image upload successful:', response.data.id);

      // Update alt text if provided
      if (altText && response.data.id) {
        try {
          await axios.post(
            `${this.apiBase}/media/${response.data.id}`,
            { alt_text: altText },
            { headers: this.getHeaders() }
          );
        } catch (altError) {
          console.warn('Failed to update alt text:', altError.message);
        }
      }

      return {
        id: response.data.id,
        url: response.data.source_url,
        title: response.data.title?.rendered || finalFilename
      };
    } catch (error) {
      console.error('Image upload error:', error.response?.data || error.message);
      
      if (error.response?.status === 401) {
        throw new Error('Image upload failed: Authentication error. Check your Application Password.');
      }
      if (error.response?.status === 413) {
        throw new Error('Image upload failed: File too large. Maximum upload size exceeded.');
      }
      if (error.response?.data?.code === 'rest_upload_unknown_error') {
        throw new Error('Image upload failed: WordPress could not process the image. Ensure your WordPress installation supports the image format.');
      }
      
      throw new Error(`Image upload failed: ${error.response?.data?.message || error.message}`);
    }
  }

  // Create or update a post
  async publishPost(blogPost, publishTime = '09:00', featuredImageId = null) {
    try {
      // Calculate publish date (tomorrow at specified time)
      const publishDate = new Date();
      publishDate.setDate(publishDate.getDate() + 1);
      const [hours, minutes] = publishTime.split(':');
      publishDate.setHours(parseInt(hours), parseInt(minutes), 0, 0);

      // Prepare post data
      const postData = {
        title: blogPost.title,
        content: blogPost.content_html,
        status: 'future', // Schedule for future
        date: publishDate.toISOString(),
        slug: blogPost.slug,
        excerpt: blogPost.meta?.meta_description || '',
        meta: {},
        tags: [],
        categories: []
      };

      // Add Yoast SEO meta if available
      if (blogPost.meta) {
        postData.meta = {
          _yoast_wpseo_title: blogPost.meta.meta_title || blogPost.title,
          _yoast_wpseo_metadesc: blogPost.meta.meta_description || '',
          _yoast_wpseo_focuskw: blogPost.meta.primary_keyword || ''
        };
      }

      // Add featured image if provided
      if (featuredImageId) {
        postData.featured_media = featuredImageId;
      }

      console.log('Publishing post:', { title: postData.title, slug: postData.slug, date: postData.date });

      // Create the post
      const response = await axios.post(
        `${this.apiBase}/posts`,
        postData,
        {
          headers: this.getHeaders(),
          timeout: 30000
        }
      );

      console.log('Post published successfully:', response.data.id);

      // Create tags if they don't exist and assign them
      if (blogPost.tags && blogPost.tags.length > 0) {
        try {
          const tagIds = await this.createTags(blogPost.tags);
          
          // Update post with tags
          if (tagIds.length > 0) {
            await axios.post(
              `${this.apiBase}/posts/${response.data.id}`,
              { tags: tagIds },
              { headers: this.getHeaders() }
            );
          }
        } catch (tagError) {
          console.warn('Failed to create tags:', tagError.message);
          // Continue without tags - post is already created
        }
      }

      return {
        success: true,
        postId: response.data.id,
        url: response.data.link,
        status: response.data.status,
        publishDate: response.data.date,
        title: response.data.title?.rendered || blogPost.title
      };

    } catch (error) {
      console.error('WordPress publish error:', error.response?.data || error.message);
      
      // Handle specific WordPress errors
      if (error.response?.status === 401) {
        const code = error.response?.data?.code;
        if (code === 'rest_cannot_create') {
          throw new Error('Permission denied: You are not allowed to create posts. Ensure your WordPress user has Administrator or Editor role and that Application Passwords are not blocked by security plugins.');
        }
        throw new Error('Authentication failed: Invalid credentials or insufficient permissions.');
      }
      if (error.response?.status === 403) {
        throw new Error('Access forbidden: REST API may be disabled or blocked by a security plugin (Wordfence, Sucuri, etc.). Check your .htaccess file or contact your hosting provider.');
      }
      if (error.response?.data?.code === 'rest_invalid_param') {
        throw new Error(`Invalid post data: ${error.response?.data?.message || 'Check your content format'}`);
      }
      
      throw new Error(`Failed to publish post: ${error.response?.data?.message || error.message}`);
    }
  }

  // Create tags and return their IDs
  async createTags(tagNames) {
    const tagIds = [];

    for (const tagName of tagNames.slice(0, 10)) { // Limit to 10 tags
      try {
        // Check if tag exists
        const searchResponse = await axios.get(
          `${this.apiBase}/tags?search=${encodeURIComponent(tagName)}&per_page=1`,
          { headers: this.getHeaders() }
        );

        if (searchResponse.data.length > 0) {
          // Tag exists
          tagIds.push(searchResponse.data[0].id);
        } else {
          // Create new tag
          const createResponse = await axios.post(
            `${this.apiBase}/tags`,
            { name: tagName },
            { headers: this.getHeaders() }
          );
          tagIds.push(createResponse.data.id);
        }
      } catch (error) {
        console.error(`Error creating tag "${tagName}":`, error.message);
        // Continue with other tags
      }
    }

    return tagIds;
  }

  // Get recent posts
  async getRecentPosts(limit = 10) {
    try {
      const response = await axios.get(
        `${this.apiBase}/posts?per_page=${limit}&_embed`,
        { headers: this.getHeaders() }
      );

      return response.data.map(post => ({
        id: post.id,
        title: post.title?.rendered || 'Untitled',
        url: post.link,
        date: post.date,
        status: post.status,
        featuredImage: post._embedded?.['wp:featuredmedia']?.[0]?.source_url || null
      }));
    } catch (error) {
      throw new Error(`Failed to fetch posts: ${error.response?.data?.message || error.message}`);
    }
  }

  // Delete a post
  async deletePost(postId) {
    try {
      await axios.delete(
        `${this.apiBase}/posts/${postId}?force=true`,
        { headers: this.getHeaders() }
      );

      return { success: true };
    } catch (error) {
      throw new Error(`Failed to delete post: ${error.response?.data?.message || error.message}`);
    }
  }
}

export default WordPressService;