import express from 'express';
import WordPressService from '../Services/wordpress.js';

const router = express.Router();

// POST /api/wordpress/test-connection
router.post('/test-connection', async (req, res) => {
  try {
    const { url, username, appPassword } = req.body;

    if (!url || !username || !appPassword) {
      return res.status(400).json({ 
        error: 'WordPress URL, username, and app password are required' 
      });
    }

    console.log('Testing WordPress connection:', { url, username });

    const wp = new WordPressService(url, username, appPassword);
    const result = await wp.testConnection();

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('WordPress connection test failed:', error.message);
    res.status(500).json({
      error: 'Connection test failed',
      message: error.message
    });
  }
});

// POST /api/wordpress/upload-image
router.post('/upload-image', async (req, res) => {
  try {
    const { url, username, appPassword, imageBase64, filename, altText } = req.body;

    if (!url || !username || !appPassword) {
      return res.status(400).json({ 
        error: 'WordPress credentials are required' 
      });
    }

    if (!imageBase64) {
      return res.status(400).json({ error: 'Image data is required' });
    }

    const wp = new WordPressService(url, username, appPassword);
    const result = await wp.uploadImage(
      imageBase64, 
      filename || `image-${Date.now()}.png`,
      altText || ''
    );

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('Image upload failed:', error.message);
    res.status(500).json({
      error: 'Image upload failed',
      message: error.message
    });
  }
});

// POST /api/wordpress/publish-post
router.post('/publish-post', async (req, res) => {
  try {
    const { 
      url, 
      username, 
      appPassword, 
      blogPost, 
      publishTime, 
      featuredImageBase64,
      status 
    } = req.body;

    if (!url || !username || !appPassword) {
      return res.status(400).json({ 
        error: 'WordPress credentials are required' 
      });
    }

    if (!blogPost) {
      return res.status(400).json({ error: 'Blog post data is required' });
    }

    console.log('Publishing post to WordPress:', { 
      url, 
      username, 
      title: blogPost.title,
      hasImage: !!featuredImageBase64 
    });

    const wp = new WordPressService(url, username, appPassword);

    let featuredImageId = null;

    // Upload featured image if provided
    if (featuredImageBase64) {
      try {
        console.log('Uploading featured image...');
        const imageResult = await wp.uploadImage(
          featuredImageBase64,
          `${blogPost.slug}-featured`,
          blogPost.title
        );
        featuredImageId = imageResult.id;
        console.log('Featured image uploaded:', featuredImageId);
      } catch (imageError) {
        console.error('Featured image upload failed:', imageError.message);
        // Continue without featured image - don't fail the whole operation
      }
    }

    // Publish the post
    const result = await wp.publishPost(blogPost, publishTime || '09:00', featuredImageId);

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    console.error('Post publishing failed:', error.message);
    res.status(500).json({
      error: 'Failed to publish post',
      message: error.message
    });
  }
});

// GET /api/wordpress/posts - Fixed: This was incorrectly mapped as POST
router.get('/posts', async (req, res) => {
  try {
    // Get credentials from query params or headers for GET requests
    const { url, username, appPassword, limit = 10 } = req.query;

    if (!url || !username || !appPassword) {
      return res.status(400).json({ 
        error: 'WordPress credentials are required. Provide url, username, and appPassword as query parameters.' 
      });
    }

    const wp = new WordPressService(url, username, appPassword);
    const posts = await wp.getRecentPosts(parseInt(limit) || 10);

    res.json({
      success: true,
      posts,
      count: posts.length
    });

  } catch (error) {
    console.error('Failed to fetch posts:', error.message);
    res.status(500).json({
      error: 'Failed to fetch posts',
      message: error.message
    });
  }
});

// Alternative: POST /api/wordpress/posts for when credentials are in body
router.post('/posts', async (req, res) => {
  try {
    const { url, username, appPassword, limit = 10 } = req.body;

    if (!url || !username || !appPassword) {
      return res.status(400).json({ 
        error: 'WordPress credentials are required' 
      });
    }

    const wp = new WordPressService(url, username, appPassword);
    const posts = await wp.getRecentPosts(parseInt(limit) || 10);

    res.json({
      success: true,
      posts,
      count: posts.length
    });

  } catch (error) {
    console.error('Failed to fetch posts:', error.message);
    res.status(500).json({
      error: 'Failed to fetch posts',
      message: error.message
    });
  }
});

// DELETE /api/wordpress/post/:id
router.delete('/post/:id', async (req, res) => {
  try {
    const { url, username, appPassword } = req.body;
    const { id } = req.params;

    if (!url || !username || !appPassword) {
      return res.status(400).json({ 
        error: 'WordPress credentials are required' 
      });
    }

    const wp = new WordPressService(url, username, appPassword);
    await wp.deletePost(id);

    res.json({
      success: true,
      message: 'Post deleted successfully'
    });

  } catch (error) {
    console.error('Failed to delete post:', error.message);
    res.status(500).json({
      error: 'Failed to delete post',
      message: error.message
    });
  }
});

export default router;