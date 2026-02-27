export interface BlogPostMeta {
  meta_title: string;
  meta_description: string;
  primary_keyword: string;
  secondary_keywords: string[];
}

export interface SeoReport {
  score: number;
  readability_level: string;
  keyword_density: string;
  word_count_actual: number;
  optimization_log: string[];
}

export interface BlogPost {
  title: string;
  slug: string;
  content_html: string;
  featured_image_prompt?: string;
  featured_image_base64?: string;
  inline_image_prompts?: string[];
  tags: string[];
  meta: BlogPostMeta;
  seo_report: SeoReport;
  schema_json_ld?: string;
  sources: string[];
  createdAt: string;
  topicId: string;
}

export interface Topic {
  id: string;
  title: string;
  score: number;
  reasoning: string;
  cluster: string;
  angle?: string;
  keywords?: string[];
  status: 'pending' | 'generating' | 'completed' | 'failed';
  blogPost?: BlogPost;
  generatedAt?: string;
}

export interface WordPressSettings {
  url: string;
  username: string;
  applicationPassword: string;
}

export interface ContentSettings {
  targetWordCount: number;
  includeImages: boolean;
  publishTime: string;
  primaryModel: string;
}

export interface AppState {
  apiKey: string;
  wordpress: WordPressSettings;
  contentSettings: ContentSettings;
  topics: Topic[];
  savedBlogs: BlogPost[];
  isScanning: boolean;
  isAutoPilot: boolean;
  darkMode: boolean;
  logs: string[];
  currentView: 'DASHBOARD' | 'BLOGS' | 'ANALYTICS' | 'SETTINGS';
}