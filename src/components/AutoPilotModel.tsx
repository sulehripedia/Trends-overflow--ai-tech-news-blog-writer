import React, { useState, useEffect } from 'react';
import { 
  X, 
  Play, 
  CheckCircle, 
  Loader2, 
  Zap,
  Image as ImageIcon,
  Layers,
  TrendingUp,
  AlertCircle
} from 'lucide-react';
import type { Topic } from '../types';

interface AutoPilotModalProps {
  isOpen: boolean;
  onClose: () => void;
  topics: Topic[];
  apiKey: string;
  onGenerate: (topicIds: string[]) => Promise<void>;
  onPublish: (topicId: string) => Promise<void>;
}

export const AutoPilotModal: React.FC<AutoPilotModalProps> = ({
  isOpen,
  onClose,
  topics,
  onGenerate,
  onPublish
}) => {
  const [step, setStep] = useState<'select' | 'generating' | 'review' | 'publishing'>('select');
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [generatingProgress, setGeneratingProgress] = useState(0);
  const [publishStatus, setPublishStatus] = useState<Map<string, 'pending' | 'publishing' | 'published' | 'failed'>>(new Map());
  const [includeImages, setIncludeImages] = useState(true);
  const [clusterInfo, setClusterInfo] = useState<{ shopify: number; tech: number }>({ shopify: 0, tech: 0 });

  useEffect(() => {
    if (isOpen && step === 'select') {
      // Auto-select best 3 topics with clustering
      const pendingTopics = topics.filter(t => t.status === 'pending').sort((a, b) => b.score - a.score);
      
      // Try to get a mix of clusters
      const shopifyTopics = pendingTopics.filter(t => t.cluster?.includes('Shopify')).slice(0, 2);
      const techTopics = pendingTopics.filter(t => !t.cluster?.includes('Shopify')).slice(0, 1);
      
      const selected = [...shopifyTopics, ...techTopics].slice(0, 3);
      setSelectedTopics(selected.map(t => t.id));
      
      setClusterInfo({
        shopify: shopifyTopics.length,
        tech: techTopics.length
      });
    }
  }, [isOpen, topics, step]);

  if (!isOpen) return null;

  const pendingTopics = topics.filter(t => t.status === 'pending').sort((a, b) => b.score - a.score);

  const toggleTopic = (topicId: string) => {
    setSelectedTopics(prev => 
      prev.includes(topicId) 
        ? prev.filter(id => id !== topicId)
        : [...prev, topicId].slice(0, 3)
    );
  };

  const handleStartGeneration = async () => {
    if (selectedTopics.length === 0) return;
    
    setStep('generating');
    setGeneratingProgress(0);

    for (let i = 0; i < selectedTopics.length; i++) {
      const topicId = selectedTopics[i];
      await onGenerate([topicId]);
      setGeneratingProgress(((i + 1) / selectedTopics.length) * 100);
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
      } catch (error) {
        setPublishStatus(prev => new Map(prev).set(topicId, 'failed'));
      }
    }

    // Close after a delay
    setTimeout(() => {
      onClose();
      setStep('select');
      setSelectedTopics([]);
      setGeneratingProgress(0);
      setPublishStatus(new Map());
    }, 2000);
  };

  const getTopicById = (id: string) => topics.find(t => t.id === id);

  return (
    <div className="modal-overlay">
      <div className="w-full max-w-2xl neo-box flex flex-col max-h-[90vh] bg-white">
        {/* Header */}
        <div className="p-4 border-b-[3px] border-black flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 border-2 border-black bg-[var(--neo-accent)]">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h2 className="neo-title text-xl uppercase">Auto-Pilot Batch</h2>
              <p className="text-xs text-gray-500">
                {step === 'select' && 'Select up to 3 topics to generate'}
                {step === 'generating' && 'Generating blog posts...'}
                {step === 'review' && 'Review before publishing'}
                {step === 'publishing' && 'Publishing to WordPress...'}
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-2 border-2 border-black hover:bg-red-500 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Select Topics */}
          {step === 'select' && (
            <div className="space-y-4">
              {/* Cluster Info */}
              <div className="neo-box-sm p-3 bg-[var(--neo-bg)]">
                <p className="neo-title text-xs mb-2">RECOMMENDED MIX:</p>
                <div className="flex gap-4">
                  <span className="flex items-center gap-1 text-sm">
                    <Layers className="w-4 h-4 text-purple-500" />
                    {clusterInfo.shopify} Shopify
                  </span>
                  <span className="flex items-center gap-1 text-sm">
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                    {clusterInfo.tech} Tech
                  </span>
                </div>
              </div>

              {/* Image Option */}
              <div className="flex items-center gap-3 p-3 border-2 border-black">
                <input
                  type="checkbox"
                  id="includeImages"
                  checked={includeImages}
                  onChange={(e) => setIncludeImages(e.target.checked)}
                  className="w-5 h-5"
                />
                <label htmlFor="includeImages" className="flex items-center gap-2 cursor-pointer">
                  <ImageIcon className="w-5 h-5" />
                  <span className="neo-title text-sm">Generate featured images</span>
                </label>
              </div>

              {/* Topic List */}
              <div className="space-y-2">
                <p className="neo-title text-xs text-gray-500">SELECT TOPICS (max 3):</p>
                {pendingTopics.map(topic => (
                  <div
                    key={topic.id}
                    onClick={() => toggleTopic(topic.id)}
                    className={`p-3 border-2 cursor-pointer transition-colors ${
                      selectedTopics.includes(topic.id)
                        ? 'border-black bg-[var(--neo-accent)]'
                        : 'border-gray-300 hover:border-black'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-5 h-5 border-2 border-black flex items-center justify-center ${
                          selectedTopics.includes(topic.id) ? 'bg-black' : 'bg-white'
                        }`}>
                          {selectedTopics.includes(topic.id) && <CheckCircle className="w-3 h-3 text-white" />}
                        </div>
                        <div>
                          <p className="neo-title text-sm">{topic.title}</p>
                          <p className="text-xs text-gray-500">{topic.cluster}</p>
                        </div>
                      </div>
                      <span className="neo-title text-lg">{topic.score}</span>
                    </div>
                  </div>
                ))}

                {pendingTopics.length === 0 && (
                  <div className="text-center p-8 border-2 border-dashed border-gray-300">
                    <AlertCircle className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                    <p className="neo-title text-sm text-gray-500">No pending topics</p>
                    <p className="text-xs text-gray-400">Scan for topics first</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 2: Generating */}
          {step === 'generating' && (
            <div className="text-center py-12">
              <Loader2 className="w-16 h-16 animate-spin mx-auto mb-6" />
              <p className="neo-title text-xl mb-4">GENERATING BLOGS...</p>
              <div className="max-w-md mx-auto">
                <div className="h-4 bg-gray-200 border-2 border-black">
                  <div 
                    className="h-full bg-[var(--neo-accent)] transition-all"
                    style={{ width: `${generatingProgress}%` }}
                  />
                </div>
                <p className="neo-title text-sm mt-2">{Math.round(generatingProgress)}% COMPLETE</p>
              </div>
              <div className="mt-6 space-y-2">
                {selectedTopics.map((topicId, idx) => {
                  const topic = getTopicById(topicId);
                  const isDone = generatingProgress >= ((idx + 1) / selectedTopics.length) * 100;
                  return (
                    <div key={topicId} className="flex items-center gap-2 justify-center">
                      {isDone ? (
                        <CheckCircle className="w-4 h-4 text-green-500" />
                      ) : (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      )}
                      <span className="text-sm">{topic?.title}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 3: Review */}
          {step === 'review' && (
            <div className="space-y-4">
              <div className="neo-box-sm p-3 bg-green-100 border-green-500">
                <p className="neo-title text-sm flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-600" />
                  All blogs generated successfully!
                </p>
              </div>

              <div className="space-y-3">
                {selectedTopics.map(topicId => {
                  const topic = getTopicById(topicId);
                  return (
                    <div key={topicId} className="neo-box-sm p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="neo-title text-sm">{topic?.blogPost?.title || topic?.title}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            SEO Score: {topic?.blogPost?.seo_report?.score || 'N/A'} | 
                            Words: ~{topic?.blogPost?.content_html?.length || 0}
                          </p>
                          {topic?.blogPost?.featured_image_base64 && (
                            <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                              <ImageIcon className="w-3 h-3" /> Image generated
                            </p>
                          )}
                        </div>
                        <span className={`px-2 py-0.5 text-[10px] neo-title ${
                          topic?.cluster?.includes('Shopify') ? 'bg-purple-500 text-white' : 'bg-blue-500 text-white'
                        }`}>
                          {topic?.cluster?.split(' ')[0]}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="neo-box-sm p-3 bg-[var(--neo-bg)]">
                <p className="neo-title text-xs mb-2">PUBLISH OPTIONS:</p>
                <p className="text-sm text-gray-600">
                  Blogs will be saved as drafts in WordPress. You can review and publish them from your WordPress dashboard.
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Publishing */}
          {step === 'publishing' && (
            <div className="space-y-4">
              {selectedTopics.map(topicId => {
                const topic = getTopicById(topicId);
                const status = publishStatus.get(topicId);
                return (
                  <div key={topicId} className="neo-box-sm p-4 flex items-center justify-between">
                    <span className="neo-title text-sm truncate flex-1">{topic?.blogPost?.title}</span>
                    <span className={`flex items-center gap-1 text-sm ${
                      status === 'published' ? 'text-green-600' : 
                      status === 'failed' ? 'text-red-600' : 
                      'text-blue-600'
                    }`}>
                      {status === 'published' && <CheckCircle className="w-4 h-4" />}
                      {status === 'failed' && <AlertCircle className="w-4 h-4" />}
                      {status === 'publishing' && <Loader2 className="w-4 h-4 animate-spin" />}
                      {!status && <span className="text-gray-400">Pending</span>}
                      {status?.toUpperCase()}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t-[3px] border-black bg-gray-50">
          {step === 'select' && (
            <button
              onClick={handleStartGeneration}
              disabled={selectedTopics.length === 0}
              className="w-full neo-btn bg-[var(--neo-accent)] py-3 neo-title disabled:opacity-50"
            >
              <Play className="w-4 h-4 inline mr-2" />
              GENERATE {selectedTopics.length} BLOG{selectedTopics.length !== 1 ? 'S' : ''}
            </button>
          )}

          {step === 'review' && (
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 neo-btn bg-white py-3 neo-title"
              >
                SAVE DRAFTS ONLY
              </button>
              <button
                onClick={handlePublishAll}
                className="flex-1 neo-btn bg-[var(--neo-secondary)] py-3 neo-title"
              >
                <Upload className="w-4 h-4 inline mr-2" />
                PUBLISH ALL
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Need to import Upload
import { Upload } from 'lucide-react';