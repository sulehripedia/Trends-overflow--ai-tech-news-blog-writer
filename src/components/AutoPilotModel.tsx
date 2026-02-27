import React, { useState, useEffect } from 'react';
import {
  X,
  Play,
  Square,
  CheckCircle,
  Loader2,
  Zap,
  Layers,
  TrendingUp,
  AlertCircle,
  Clock,
  Globe,
  Upload,
  Calendar,
  RefreshCw
} from 'lucide-react';
import type { Topic, WordPressSettings, ContentSettings } from '../types';
import { ApiService } from '../services/api';

interface AutoPilotModalProps {
  isOpen: boolean;
  onClose: () => void;
  topics: Topic[];
  apiKey: string;
  wordpress: WordPressSettings;
  contentSettings: ContentSettings;
  onGenerate: (topicIds: string[]) => Promise<void>;
  onPublish: (topicId: string) => Promise<void>;
  onLog: (msg: string) => void;
}

export const AutoPilotModal: React.FC<AutoPilotModalProps> = ({
  isOpen,
  onClose,
  topics,
  apiKey,
  wordpress,
  contentSettings,
  onGenerate,
  onPublish,
  onLog
}) => {
  const [mode, setMode] = useState<'manual' | 'scheduled'>('manual');
  const [step, setStep] = useState<'config' | 'generating' | 'review' | 'publishing' | 'done'>('config');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [progress, setProgress] = useState(0);
  const [publishStatus, setPublishStatus] = useState<Map<string, 'pending' | 'publishing' | 'published' | 'failed'>>(new Map());
  const [schedulerRunning, setSchedulerRunning] = useState(false);
  const [scheduleTime, setScheduleTime] = useState(contentSettings.publishTime || '09:00');
  const [schedulerLoading, setSchedulerLoading] = useState(false);
  const [schedulerMessage, setSchedulerMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && step === 'config') {
      // Auto-select top 3 pending topics
      const pending = topics.filter(t => t.status === 'pending').sort((a, b) => b.score - a.score);
      setSelectedTopics(pending.slice(0, 3).map(t => t.id));
      checkSchedulerStatus();
    }
  }, [isOpen]);

  const checkSchedulerStatus = async () => {
    try {
      const api = new ApiService(apiKey);
      const status = await api.getAutoPilotStatus();
      setSchedulerRunning(status.isRunning);
    } catch {}
  };

  if (!isOpen) return null;

  const pendingTopics = topics.filter(t => t.status === 'pending').sort((a, b) => b.score - a.score);
  const getTopicById = (id: string) => topics.find(t => t.id === id);

  const toggleTopic = (id: string) => {
    setSelectedTopics(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id].slice(0, 3)
    );
  };

  // MANUAL: Generate then publish
  const handleStartManual = async () => {
    if (selectedTopics.length === 0) return;
    setError('');
    setStep('generating');
    setProgress(0);

    for (let i = 0; i < selectedTopics.length; i++) {
      try {
        await onGenerate([selectedTopics[i]]);
      } catch (e: any) {
        onLog(`Failed to generate: ${e.message}`);
      }
      setProgress(((i + 1) / selectedTopics.length) * 100);
    }

    setStep('review');
  };

  const handlePublishAll = async () => {
    setStep('publishing');
    for (const topicId of selectedTopics) {
      setPublishStatus(prev => new Map(prev).set(topicId, 'publishing'));
      try {
        await onPublish(topicId);
        setPublishStatus(prev => new Map(prev).set(topicId, 'published'));
        onLog(`Published: ${getTopicById(topicId)?.blogPost?.title || topicId}`);
      } catch (e: any) {
        setPublishStatus(prev => new Map(prev).set(topicId, 'failed'));
        onLog(`Publish failed: ${e.message}`);
      }
    }
    setStep('done');
  };

  // SCHEDULER
  const handleStartScheduler = async () => {
    if (!wordpress.url || !wordpress.username || !wordpress.applicationPassword) {
      setSchedulerMessage('⚠️ WordPress credentials required to use AutoPilot scheduler');
      return;
    }
    setSchedulerLoading(true);
    setSchedulerMessage('');
    try {
      const api = new ApiService(apiKey);
      const result = await api.startAutoPilot({
        wpUrl: wordpress.url,
        wpUsername: wordpress.username,
        wpPassword: wordpress.applicationPassword,
        publishTime: scheduleTime,
        wordCount: contentSettings.targetWordCount || 1800
      });
      setSchedulerRunning(true);
      setSchedulerMessage(`✅ ${result.message}`);
      onLog(`AutoPilot scheduled: daily at ${scheduleTime}`);
    } catch (e: any) {
      setSchedulerMessage(`❌ ${e.message}`);
    } finally {
      setSchedulerLoading(false);
    }
  };

  const handleStopScheduler = async () => {
    setSchedulerLoading(true);
    try {
      const api = new ApiService(apiKey);
      await api.stopAutoPilot();
      setSchedulerRunning(false);
      setSchedulerMessage('AutoPilot stopped.');
      onLog('AutoPilot scheduler stopped');
    } catch (e: any) {
      setSchedulerMessage(`Error: ${e.message}`);
    } finally {
      setSchedulerLoading(false);
    }
  };

  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setStep('config');
      setSelectedTopics([]);
      setProgress(0);
      setPublishStatus(new Map());
      setError('');
      setSchedulerMessage('');
    }, 300);
  };

  return (
    <div className="modal-overlay">
      <div className="w-full max-w-2xl neo-box flex flex-col max-h-[90vh] bg-white">
        {/* Header */}
        <div className="p-4 border-b-[3px] border-black flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 border-2 border-black bg-[var(--neo-accent)]">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="neo-title text-lg uppercase">Auto-Pilot</h2>
              <p className="text-xs text-gray-500">Generate & publish 3 blogs automatically</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 border-2 border-black hover:bg-red-500 hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Tabs */}
        {step === 'config' && (
          <div className="flex border-b-[3px] border-black flex-shrink-0">
            <button
              onClick={() => setMode('manual')}
              className={`flex-1 py-3 text-xs neo-title uppercase border-r-2 border-black transition-colors ${mode === 'manual' ? 'bg-black text-white' : 'bg-white hover:bg-gray-100'}`}
            >
              <Play className="w-3 h-3 inline mr-1" />
              Manual Batch
            </button>
            <button
              onClick={() => setMode('scheduled')}
              className={`flex-1 py-3 text-xs neo-title uppercase transition-colors ${mode === 'scheduled' ? 'bg-black text-white' : 'bg-white hover:bg-gray-100'}`}
            >
              <Calendar className="w-3 h-3 inline mr-1" />
              Daily Scheduler
            </button>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5">

          {/* ── CONFIG: MANUAL ── */}
          {step === 'config' && mode === 'manual' && (
            <div className="space-y-4">
              <div className="neo-box-sm p-3 bg-[var(--neo-bg)]">
                <p className="neo-title text-xs">SELECT UP TO 3 TOPICS TO GENERATE & PUBLISH:</p>
              </div>

              {pendingTopics.length === 0 ? (
                <div className="text-center p-8 border-2 border-dashed border-gray-300">
                  <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                  <p className="neo-title text-sm text-gray-500">No pending topics</p>
                  <p className="text-xs text-gray-400 mt-1">Scan for topics on the Dashboard first</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {pendingTopics.map(topic => (
                    <div
                      key={topic.id}
                      onClick={() => toggleTopic(topic.id)}
                      className={`p-3 border-2 cursor-pointer transition-all ${
                        selectedTopics.includes(topic.id)
                          ? 'border-black bg-[var(--neo-accent)]'
                          : 'border-gray-200 hover:border-black hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 border-2 border-black flex items-center justify-center flex-shrink-0 ${selectedTopics.includes(topic.id) ? 'bg-black' : 'bg-white'}`}>
                          {selectedTopics.includes(topic.id) && <CheckCircle className="w-3 h-3 text-white" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="neo-title text-xs truncate">{topic.title}</p>
                          <p className="text-[10px] text-gray-500 mt-0.5">{topic.cluster}</p>
                        </div>
                        <span className="neo-title text-sm flex-shrink-0">{topic.score}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {error && (
                <div className="p-3 border-2 border-red-500 bg-red-50 text-xs text-red-600 neo-title">
                  {error}
                </div>
              )}
            </div>
          )}

          {/* ── CONFIG: SCHEDULER ── */}
          {step === 'config' && mode === 'scheduled' && (
            <div className="space-y-4">
              <div className={`p-4 border-2 ${schedulerRunning ? 'border-green-500 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                <div className="flex items-center gap-2 mb-2">
                  <div className={`w-3 h-3 border-2 border-black ${schedulerRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
                  <span className="neo-title text-xs">
                    {schedulerRunning ? 'AUTOPILOT ACTIVE' : 'AUTOPILOT INACTIVE'}
                  </span>
                </div>
                <p className="text-xs text-gray-600">
                  {schedulerRunning
                    ? `Running daily at ${scheduleTime} — will auto-discover 10 topics, generate 3 best blogs, and publish to WordPress.`
                    : 'Configure and start the daily scheduler to automate your entire content pipeline.'}
                </p>
              </div>

              <div>
                <label className="neo-title text-[10px] uppercase block mb-2">Daily Publish Time</label>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" />
                  <input
                    type="time"
                    value={scheduleTime}
                    onChange={(e) => setScheduleTime(e.target.value)}
                    className="neo-input flex-1"
                    disabled={schedulerRunning}
                  />
                </div>
              </div>

              <div className="neo-box-sm p-3 bg-[var(--neo-bg)]">
                <p className="neo-title text-[10px] mb-2 uppercase">What AutoPilot Does Daily:</p>
                <ol className="text-xs text-gray-600 space-y-1">
                  <li>1. Discovers 10 trending tech topics using Gemini AI</li>
                  <li>2. Picks the top 3 by trending score</li>
                  <li>3. Generates 1,500-2,000 word SEO articles with tables & FAQs</li>
                  <li>4. Schedules them to publish in WordPress at your set time</li>
                </ol>
              </div>

              {/* WP Status */}
              <div className="flex items-center gap-2 p-3 border-2 border-black bg-white">
                <Globe className="w-4 h-4" />
                <div className="flex-1">
                  <p className="neo-title text-[10px] uppercase">WordPress</p>
                  <p className="text-xs text-gray-600 truncate">{wordpress.url || 'Not configured'}</p>
                </div>
                {wordpress.url ? (
                  <CheckCircle className="w-4 h-4 text-green-500" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-500" />
                )}
              </div>

              {schedulerMessage && (
                <div className={`p-3 border-2 text-xs neo-title ${schedulerMessage.startsWith('✅') ? 'border-green-500 bg-green-50 text-green-700' : schedulerMessage.startsWith('❌') ? 'border-red-500 bg-red-50 text-red-700' : 'border-gray-300 bg-gray-50 text-gray-600'}`}>
                  {schedulerMessage}
                </div>
              )}
            </div>
          )}

          {/* ── GENERATING ── */}
          {step === 'generating' && (
            <div className="text-center py-10">
              <RefreshCw className="w-14 h-14 animate-spin mx-auto mb-5" />
              <p className="neo-title text-xl mb-4">GENERATING BLOGS...</p>
              <div className="max-w-sm mx-auto mb-4">
                <div className="h-4 bg-gray-200 border-2 border-black">
                  <div className="h-full bg-[var(--neo-accent)] transition-all duration-500" style={{ width: `${progress}%` }} />
                </div>
                <p className="neo-title text-xs mt-2">{Math.round(progress)}% COMPLETE</p>
              </div>
              <div className="space-y-2">
                {selectedTopics.map((id, idx) => {
                  const topic = getTopicById(id);
                  const done = progress >= ((idx + 1) / selectedTopics.length) * 100;
                  return (
                    <div key={id} className="flex items-center gap-2 justify-center text-sm">
                      {done ? <CheckCircle className="w-4 h-4 text-green-500" /> : <Loader2 className="w-4 h-4 animate-spin text-blue-500" />}
                      <span className="truncate max-w-xs">{topic?.title}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── REVIEW ── */}
          {step === 'review' && (
            <div className="space-y-4">
              <div className="p-3 border-2 border-green-500 bg-green-50">
                <p className="neo-title text-sm text-green-700 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  {selectedTopics.length} blog{selectedTopics.length !== 1 ? 's' : ''} generated! Ready to publish.
                </p>
              </div>
              {selectedTopics.map(id => {
                const topic = getTopicById(id);
                return (
                  <div key={id} className="neo-box-sm p-4">
                    <p className="neo-title text-sm">{topic?.blogPost?.title || topic?.title}</p>
                    <div className="flex gap-4 mt-2 text-xs text-gray-500">
                      <span>SEO: {topic?.blogPost?.seo_report?.score || 'N/A'}</span>
                      <span className={`neo-title ${topic?.blogPost ? 'text-green-600' : 'text-red-500'}`}>
                        {topic?.blogPost ? '✓ Ready' : '✗ Failed'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── PUBLISHING ── */}
          {step === 'publishing' && (
            <div className="space-y-3 py-4">
              <p className="neo-title text-sm text-center mb-4">PUBLISHING TO WORDPRESS...</p>
              {selectedTopics.map(id => {
                const topic = getTopicById(id);
                const status = publishStatus.get(id);
                return (
                  <div key={id} className="neo-box-sm p-4 flex items-center justify-between">
                    <span className="neo-title text-xs truncate flex-1 mr-3">{topic?.blogPost?.title}</span>
                    <span className={`flex items-center gap-1 text-xs neo-title ${status === 'published' ? 'text-green-600' : status === 'failed' ? 'text-red-600' : 'text-blue-600'}`}>
                      {status === 'published' && <CheckCircle className="w-3 h-3" />}
                      {status === 'failed' && <AlertCircle className="w-3 h-3" />}
                      {status === 'publishing' && <Loader2 className="w-3 h-3 animate-spin" />}
                      {(!status || status === 'pending') && <span className="text-gray-400">Pending</span>}
                      {status?.toUpperCase()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── DONE ── */}
          {step === 'done' && (
            <div className="text-center py-10">
              <CheckCircle className="w-16 h-16 mx-auto mb-4 text-green-500" />
              <p className="neo-title text-xl mb-2">BATCH COMPLETE!</p>
              <p className="text-sm text-gray-600">
                {Array.from(publishStatus.values()).filter(s => s === 'published').length} of {selectedTopics.length} posts published to WordPress.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t-[3px] border-black flex-shrink-0 bg-gray-50">
          {step === 'config' && mode === 'manual' && (
            <button
              onClick={handleStartManual}
              disabled={selectedTopics.length === 0}
              className="w-full neo-btn bg-[var(--neo-accent)] py-3 neo-title disabled:opacity-40"
            >
              <Play className="w-4 h-4 inline mr-2" />
              GENERATE {selectedTopics.length} BLOG{selectedTopics.length !== 1 ? 'S' : ''}
            </button>
          )}

          {step === 'config' && mode === 'scheduled' && (
            <div className="flex gap-3">
              {!schedulerRunning ? (
                <button
                  onClick={handleStartScheduler}
                  disabled={schedulerLoading}
                  className="flex-1 neo-btn bg-[var(--neo-accent)] py-3 neo-title disabled:opacity-40"
                >
                  {schedulerLoading ? <Loader2 className="w-4 h-4 inline mr-2 animate-spin" /> : <Play className="w-4 h-4 inline mr-2" />}
                  START AUTOPILOT
                </button>
              ) : (
                <button
                  onClick={handleStopScheduler}
                  disabled={schedulerLoading}
                  className="flex-1 neo-btn bg-red-500 text-white py-3 neo-title disabled:opacity-40"
                >
                  {schedulerLoading ? <Loader2 className="w-4 h-4 inline mr-2 animate-spin" /> : <Square className="w-4 h-4 inline mr-2" />}
                  STOP AUTOPILOT
                </button>
              )}
              <button onClick={handleClose} className="neo-btn bg-white px-6 py-3 neo-title text-xs">
                CLOSE
              </button>
            </div>
          )}

          {step === 'review' && (
            <div className="flex gap-3">
              <button onClick={handleClose} className="flex-1 neo-btn bg-white py-3 neo-title text-xs">
                SAVE DRAFTS ONLY
              </button>
              <button onClick={handlePublishAll} className="flex-1 neo-btn py-3 neo-title" style={{ backgroundColor: 'var(--neo-secondary)' }}>
                <Upload className="w-4 h-4 inline mr-2" />
                PUBLISH ALL
              </button>
            </div>
          )}

          {(step === 'done' || step === 'publishing') && step !== 'publishing' && (
            <button onClick={handleClose} className="w-full neo-btn bg-[var(--neo-accent)] py-3 neo-title">
              CLOSE
            </button>
          )}
        </div>
      </div>
    </div>
  );
};