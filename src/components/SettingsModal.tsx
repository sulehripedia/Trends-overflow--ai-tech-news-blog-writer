import React, { useState, useEffect } from 'react';
import { Key, Globe, Type, Sliders, Layout, Lock, Clock, X, Cpu, TestTube } from 'lucide-react';
import type { WordPressSettings, ContentSettings } from '../types';
import { ApiService } from '../services/api';

interface SettingsModalProps {
  isOpen: boolean;
  onSave: (apiKey: string, wp: WordPressSettings, content: ContentSettings) => void;
  onClose: () => void;
  currentApiKey: string;
  currentWpSettings: WordPressSettings;
  currentContentSettings: ContentSettings;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onSave, 
  onClose,
  currentApiKey, 
  currentWpSettings,
  currentContentSettings
}) => {
  const [activeTab, setActiveTab] = useState<'api' | 'wordpress' | 'content'>('api');
  
  const [apiKey, setApiKey] = useState(currentApiKey);
  
  const [wpUrl, setWpUrl] = useState(currentWpSettings?.url || '');
  const [wpUser, setWpUser] = useState(currentWpSettings?.username || '');
  const [wpPass, setWpPass] = useState(currentWpSettings?.applicationPassword || '');
  
  const [wordCount, setWordCount] = useState(currentContentSettings?.targetWordCount || 1200);
  const [publishTime, setPublishTime] = useState(currentContentSettings?.publishTime || '09:00');
  const [includeImages, setIncludeImages] = useState(currentContentSettings?.includeImages ?? true);
  const [primaryModel, setPrimaryModel] = useState(currentContentSettings?.primaryModel || 'gemini-2.0-flash');
  
  const [wpTestStatus, setWpTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [wpTestMessage, setWpTestMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setApiKey(currentApiKey);
      setWpUrl(currentWpSettings?.url || '');
      setWpUser(currentWpSettings?.username || '');
      setWpPass(currentWpSettings?.applicationPassword || '');
      setWordCount(currentContentSettings?.targetWordCount || 1200);
      setPublishTime(currentContentSettings?.publishTime || '09:00');
      setIncludeImages(currentContentSettings?.includeImages ?? true);
      setPrimaryModel(currentContentSettings?.primaryModel || 'gemini-2.0-flash');
      setWpTestStatus('idle');
    }
  }, [isOpen, currentApiKey, currentWpSettings, currentContentSettings]);

  if (!isOpen) return null;

  const handleSave = () => {
    const cleanUrl = wpUrl.replace(/\/$/, '');
    onSave(
      apiKey,
      { url: cleanUrl, username: wpUser, applicationPassword: wpPass },
      { 
        targetWordCount: wordCount, 
        includeImages, 
        publishTime,
        primaryModel
      }
    );
  };

  const handleTestWordPress = async () => {
    if (!wpUrl || !wpUser || !wpPass) {
      setWpTestStatus('error');
      setWpTestMessage('Please fill in all WordPress fields');
      return;
    }

    setWpTestStatus('testing');
    setWpTestMessage('Testing connection...');

    try {
      const api = new ApiService(apiKey);
      await api.testWordPressConnection({
        url: wpUrl,
        username: wpUser,
        applicationPassword: wpPass
      });
      setWpTestStatus('success');
      setWpTestMessage('Connection successful!');
    } catch (error: any) {
      setWpTestStatus('error');
      setWpTestMessage(error.message || 'Connection failed');
    }
  };

  return (
    <div className="modal-overlay">
      <div className="w-full max-w-lg neo-box flex flex-col max-h-[90vh] bg-white">
        {/* Header */}
        <div className="p-4 border-b-[3px] border-black flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 border-2 border-black">
              <Sliders className="w-5 h-5" />
            </div>
            <h2 className="neo-title text-xl uppercase">System Config</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-2 border-2 border-black hover:bg-red-500 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b-[3px] border-black">
          <button
            onClick={() => setActiveTab('api')}
            className={`flex-1 py-3 text-sm neo-title uppercase border-r-2 border-black transition-colors ${
              activeTab === 'api' 
                ? 'bg-black text-white' 
                : 'bg-white text-black hover:bg-gray-100'
            }`}
          >
            <Cpu className="w-4 h-4 inline mr-2" />
            API Core
          </button>
          <button
            onClick={() => setActiveTab('wordpress')}
            className={`flex-1 py-3 text-sm neo-title uppercase border-r-2 border-black transition-colors ${
              activeTab === 'wordpress' 
                ? 'bg-black text-white' 
                : 'bg-white text-black hover:bg-gray-100'
            }`}
          >
            <Globe className="w-4 h-4 inline mr-2" />
            WordPress
          </button>
          <button
            onClick={() => setActiveTab('content')}
            className={`flex-1 py-3 text-sm neo-title uppercase transition-colors ${
              activeTab === 'content' 
                ? 'bg-black text-white' 
                : 'bg-white text-black hover:bg-gray-100'
            }`}
          >
            <Type className="w-4 h-4 inline mr-2" />
            Content
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6 overflow-y-auto bg-[var(--neo-bg)]">
          {activeTab === 'api' && (
            <div className="space-y-4">
              <div>
                <label className="block neo-title text-xs uppercase mb-2">
                  Google Gemini API Key
                </label>
                <div className="relative">
                  <Key className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                  <input
                    type="password"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="ENTER_API_KEY"
                    className="neo-input pl-10"
                  />
                </div>
                <p className="text-xs neo-title text-gray-500 mt-2">
                  {'>'} Required for Gemini 2.0 Flash & Imagen models.
                </p>
              </div>

              <div>
                <label className="block neo-title text-xs uppercase mb-2">
                  Primary Model
                </label>
                <div className="relative">
                  <Cpu className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                  <select
                    value={primaryModel}
                    onChange={(e) => setPrimaryModel(e.target.value)}
                    className="neo-input pl-10 cursor-pointer"
                  >
                    <option value="gemini-2.0-flash">Gemini 2.0 Flash (Recommended)</option>
                    <option value="gemini-2.0-flash-lite">Gemini 2.0 Flash-Lite (Faster)</option>
                    <option value="gemini-1.5-pro">Gemini 1.5 Pro (Higher Quality)</option>
                  </select>
                </div>
                <p className="text-xs neo-title text-gray-500 mt-2">
                  {'>'} Select the AI model for content generation.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'wordpress' && (
            <div className="space-y-4">
              <div>
                <label className="block neo-title text-xs uppercase mb-2">Site URL</label>
                <div className="relative">
                  <Globe className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    value={wpUrl}
                    onChange={(e) => setWpUrl(e.target.value)}
                    placeholder="https://mysite.com"
                    className="neo-input pl-10"
                  />
                </div>
              </div>
              <div>
                <label className="block neo-title text-xs uppercase mb-2">Username</label>
                <div className="relative">
                  <Layout className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                  <input
                    type="text"
                    value={wpUser}
                    onChange={(e) => setWpUser(e.target.value)}
                    placeholder="admin"
                    className="neo-input pl-10"
                  />
                </div>
              </div>
              <div>
                <label className="block neo-title text-xs uppercase mb-2">App Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                  <input
                    type="password"
                    value={wpPass}
                    onChange={(e) => setWpPass(e.target.value)}
                    placeholder="xxxx xxxx xxxx xxxx"
                    className="neo-input pl-10"
                  />
                </div>
                <p className="text-xs neo-title text-gray-500 mt-2">
                  {'>'} Create in Users {'>'} Profile {'>'} App Passwords
                </p>
              </div>

              {/* Test Connection */}
              <div className="border-2 border-black p-3 bg-white">
                <button
                  onClick={handleTestWordPress}
                  disabled={wpTestStatus === 'testing'}
                  className="w-full neo-btn bg-white py-2 text-xs flex items-center justify-center gap-2"
                >
                  <TestTube className="w-4 h-4" />
                  {wpTestStatus === 'testing' ? 'TESTING...' : 'TEST CONNECTION'}
                </button>
                {wpTestStatus !== 'idle' && (
                  <p className={`text-xs neo-title mt-2 text-center ${
                    wpTestStatus === 'success' ? 'text-green-600' : 
                    wpTestStatus === 'error' ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {wpTestMessage}
                  </p>
                )}
              </div>

              {/* WordPress Setup Guide */}
              <div className="neo-box-sm p-3 bg-yellow-50 border-yellow-400">
                <p className="neo-title text-xs mb-2">WORDPRESS SETUP GUIDE:</p>
                <ol className="text-xs space-y-1 text-gray-600 list-decimal list-inside">
                  <li>Go to your WordPress admin</li>
                  <li>Users {'>'} Profile</li>
                  <li>Scroll to "Application Passwords"</li>
                  <li>Enter "Trends Overflow" and click "Add New"</li>
                  <li>Copy the generated password (format: XXXX XXXX XXXX XXXX)</li>
                </ol>
              </div>
            </div>
          )}

          {activeTab === 'content' && (
            <div className="space-y-6">
              <div>
                <label className="block neo-title text-xs uppercase mb-2">
                  Target Word Count
                </label>
                <div className="relative">
                  <Type className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                  <input
                    type="number"
                    value={wordCount}
                    onChange={(e) => setWordCount(parseInt(e.target.value) || 0)}
                    min={500}
                    max={5000}
                    className="neo-input pl-10"
                  />
                </div>
                <p className="text-xs neo-title text-gray-500 mt-2">
                  {'>'} Recommended: 1200-2000 words for SEO
                </p>
              </div>

              <div>
                <label className="block neo-title text-xs uppercase mb-2">
                  Daily Publish Time
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                  <input
                    type="time"
                    value={publishTime}
                    onChange={(e) => setPublishTime(e.target.value)}
                    className="neo-input pl-10"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 border-2 border-black bg-white">
                <input
                  type="checkbox"
                  id="includeImages"
                  checked={includeImages}
                  onChange={(e) => setIncludeImages(e.target.checked)}
                  className="w-5 h-5"
                />
                <label htmlFor="includeImages" className="neo-title text-sm cursor-pointer">
                  Generate featured images for blog posts
                </label>
              </div>

              <div className="neo-box-sm p-4 border-dashed border-2">
                <h4 className="neo-title text-xs uppercase mb-3 flex items-center gap-2">
                  <Clock className="w-4 h-4" /> Content Strategy: 2/1 Mix
                </h4>
                <ul className="text-xs neo-title space-y-1 text-gray-600">
                  <li>[x] 2x Tech News Articles</li>
                  <li>[x] 1x Shopify Solution/Comparison</li>
                  <li>[x] SEO-optimized meta titles & descriptions</li>
                  <li>[x] Auto-generated featured images</li>
                  <li>[x] Internal linking suggestions</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t-[3px] border-black bg-white">
          <button
            onClick={handleSave}
            className="w-full neo-btn bg-[var(--neo-accent)] py-3 neo-title"
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
};