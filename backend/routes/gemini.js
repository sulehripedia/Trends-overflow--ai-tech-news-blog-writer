import express from 'express';
import GeminiService from '../Services/gemini.js';

const router = express.Router();

/**
 * Discover trending topics
 * POST /api/gemini/discover-topics
 */
router.post('/discover-topics', async (req, res) => {
  try {
    const { apiKey } = req.body;

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        message: 'Gemini API key is required'
      });
    }

    console.log('🔍 Topic discovery request received');

    const gemini = new GeminiService(apiKey);
    const topics = await gemini.discoverTopics();

    console.log(`✅ Discovered ${topics.length} topics`);

    res.json({
      success: true,
      topics,
      count: topics.length
    });

  } catch (error) {
    console.error('❌ Topic discovery error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to discover topics',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * Generate blog post
 * POST /api/gemini/generate-post
 */
router.post('/generate-post', async (req, res) => {
  try {
    const { apiKey, topicTitle, wordCount = 1200 } = req.body;

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        message: 'Gemini API key is required'
      });
    }

    if (!topicTitle) {
      return res.status(400).json({
        success: false,
        message: 'Topic title is required'
      });
    }

    console.log('📝 Blog generation request received');
    console.log('Topic:', topicTitle);
    console.log('Target words:', wordCount);

    const gemini = new GeminiService(apiKey);
    const blogPost = await gemini.generateBlogPost(topicTitle, wordCount);

    console.log('✅ Blog post generated successfully');
    console.log('Title:', blogPost.title);
    console.log('Words:', blogPost.seo_report?.word_count_actual || 'unknown');

    res.json({
      success: true,
      blogPost
    });

  } catch (error) {
    console.error('❌ Blog generation error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate blog post',
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

/**
 * Generate image (placeholder endpoint)
 * POST /api/gemini/generate-image
 */
router.post('/generate-image', async (req, res) => {
  try {
    const { apiKey, prompt } = req.body;

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        message: 'Gemini API key is required'
      });
    }

    if (!prompt) {
      return res.status(400).json({
        success: false,
        message: 'Image prompt is required'
      });
    }

    console.log('🖼️  Image generation request received');

    const gemini = new GeminiService(apiKey);
    const imageResult = await gemini.generateImage(prompt);

    res.json({
      success: imageResult.success,
      imageData: imageResult.placeholder_url || null,
      message: imageResult.message
    });

  } catch (error) {
    console.error('❌ Image generation error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to generate image'
    });
  }
});

/**
 * Trend analysis (future endpoint)
 * POST /api/gemini/trend-analysis
 */
router.post('/trend-analysis', async (req, res) => {
  try {
    const { apiKey } = req.body;

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        message: 'Gemini API key is required'
      });
    }

    // Placeholder for future implementation
    res.json({
      success: true,
      message: 'Trend analysis coming soon',
      trends: []
    });

  } catch (error) {
    console.error('❌ Trend analysis error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to analyze trends'
    });
  }
});

/**
 * Cluster topics (future endpoint)
 * POST /api/gemini/cluster-topics
 */
router.post('/cluster-topics', async (req, res) => {
  try {
    const { apiKey, topics } = req.body;

    if (!apiKey) {
      return res.status(400).json({
        success: false,
        message: 'Gemini API key is required'
      });
    }

    if (!topics || !Array.isArray(topics)) {
      return res.status(400).json({
        success: false,
        message: 'Topics array is required'
      });
    }

    // Placeholder for future implementation
    res.json({
      success: true,
      message: 'Topic clustering coming soon',
      clusters: []
    });

  } catch (error) {
    console.error('❌ Topic clustering error:', error.message);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to cluster topics'
    });
  }
});

export default router;