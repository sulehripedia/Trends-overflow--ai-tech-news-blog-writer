import express from 'express';
import GeminiService, { autoPilotScheduler } from '../Services/gemini.js';
import WordPressService from '../Services/wordpress.js';

const router = express.Router();

// POST /api/gemini/discover-topics
router.post('/discover-topics', async (req, res) => {
  try {
    const { apiKey } = req.body;
    if (!apiKey) return res.status(400).json({ success: false, message: 'API key required' });

    const gemini = new GeminiService(apiKey);
    const topics = await gemini.discoverTopics();

    res.json({ success: true, topics, count: topics.length });
  } catch (error) {
    console.error('Topic discovery error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/gemini/generate-post
router.post('/generate-post', async (req, res) => {
  try {
    const { apiKey, topicTitle, wordCount = 1800 } = req.body;
    if (!apiKey) return res.status(400).json({ success: false, message: 'API key required' });
    if (!topicTitle) return res.status(400).json({ success: false, message: 'Topic title required' });

    const gemini = new GeminiService(apiKey);
    const blogPost = await gemini.generateBlogPost(topicTitle, wordCount);

    res.json({ success: true, blogPost });
  } catch (error) {
    console.error('Blog generation error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/gemini/autopilot/start
router.post('/autopilot/start', async (req, res) => {
  try {
    const { apiKey, wpUrl, wpUsername, wpPassword, publishTime = '09:00', wordCount = 1800 } = req.body;

    if (!apiKey || !wpUrl || !wpUsername || !wpPassword) {
      return res.status(400).json({ success: false, message: 'API key and WordPress credentials required' });
    }

    const [hours, minutes] = publishTime.split(':');
    const cronSchedule = `${minutes || '0'} ${hours || '9'} * * *`;

    autoPilotScheduler.configure({ apiKey, wpUrl, wpUsername, wpPassword, wordCount }, async () => {
      console.log('🤖 AutoPilot daily batch starting...');
      const gemini = new GeminiService(apiKey);
      const wp = new WordPressService(wpUrl, wpUsername, wpPassword);

      // Discover topics
      const topics = await gemini.discoverTopics();
      const selected = topics.slice(0, 3);

      const results = [];
      for (const topic of selected) {
        try {
          console.log(`Generating: "${topic.title}"`);
          const blogPost = await gemini.generateBlogPost(topic.title, wordCount);
          blogPost.createdAt = new Date().toISOString();

          // Publish to WordPress
          const publishDate = new Date();
          publishDate.setDate(publishDate.getDate() + 1);
          const [h, m] = publishTime.split(':');
          publishDate.setHours(parseInt(h), parseInt(m), 0, 0);

          const postData = {
            title: blogPost.title,
            content: blogPost.content_html,
            status: 'future',
            date: publishDate.toISOString(),
            slug: blogPost.slug,
            excerpt: blogPost.meta?.meta_description || '',
          };

          const wpResult = await wp.publishPost(blogPost, publishTime, null);
          results.push({ topic: topic.title, postId: wpResult.postId, status: 'published' });
          console.log(`✅ Published: "${blogPost.title}"`);

          // Wait between posts
          await new Promise(r => setTimeout(r, 5000));
        } catch (err) {
          console.error(`Failed to process topic "${topic.title}":`, err.message);
          results.push({ topic: topic.title, status: 'failed', error: err.message });
        }
      }

      console.log('🤖 AutoPilot batch complete:', results);
    });

    const result = autoPilotScheduler.start(cronSchedule);
    res.json({ success: true, ...result, schedule: cronSchedule });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// POST /api/gemini/autopilot/stop
router.post('/autopilot/stop', async (req, res) => {
  autoPilotScheduler.stop();
  res.json({ success: true, message: 'AutoPilot stopped' });
});

// GET /api/gemini/autopilot/status
router.get('/autopilot/status', async (req, res) => {
  res.json({ success: true, isRunning: autoPilotScheduler.isRunning() });
});

export default router;