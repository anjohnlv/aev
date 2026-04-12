'use client';

import { useState, useEffect } from 'react';
import {
  type Storyboard,
  type Shot,
  saveStoryboard,
} from '@/components/StoryboardView';
import {
  type VideoGenerateProgress,
} from '@/components/VideoPreview';
import { saveRecord } from '@/lib/storage';

type Step = 1 | 2 | 3;
type Mode = 'expand' | 'direct';

interface Step1State {
  mode: Mode;
  originalText: string;
}

interface Step2State {
  expandedText?: string;
  storyboard: Storyboard | null;
}

interface Step3State {
  videoUrl: string | null;
  taskId: string | null;
}

export default function Home() {
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [step1State, setStep1State] = useState<Step1State>({
    mode: 'expand',
    originalText: '',
  });
  const [step2State, setStep2State] = useState<Step2State>({
    expandedText: undefined,
    storyboard: null,
  });
  const [step3State, setStep3State] = useState<Step3State>({
    videoUrl: null,
    taskId: null,
  });
  const [isLoadingStep2, setIsLoadingStep2] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<VideoGenerateProgress | null>(
    null
  );
  const [error, setError] = useState<string | null>(null);

  const goToStep2 = async (mode: 'expand' | 'direct') => {
    if (!step1State.originalText.trim()) return;

    setCurrentStep(2);
    setIsLoadingStep2(true);
    setStep2State((prev) => ({ ...prev, expandedText: undefined, storyboard: null }));

    try {
      if (mode === 'expand') {
        const expandRes = await fetch('/api/expand', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: step1State.originalText }),
        });
        const expandData = await expandRes.json();

        if (expandData.success) {
          setStep2State((prev) => ({ ...prev, expandedText: expandData.expandedText }));
          await designStoryboard(expandData.expandedText);
        } else {
          setError(expandData.error || '扩写失败，请重试');
        }
      } else {
        await designStoryboard(step1State.originalText);
      }
    } catch (error) {
      console.error('处理失败:', error);
      setError('网络错误，请检查连接后重试');
    } finally {
      setIsLoadingStep2(false);
    }
  };

  const designStoryboard = async (text: string) => {
    try {
      const res = await fetch('/api/storyboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      const data = await res.json();
      if (data.success) {
        setStep2State((prev) => ({ ...prev, storyboard: data.storyboard }));
      } else {
        setError(data.error || '分镜设计失败，请重试');
      }
    } catch (error) {
      console.error('分镜设计失败:', error);
      setError('分镜设计失败，请检查网络后重试');
    }
  };

  const handleStoryboardChange = (newStoryboard: Storyboard) => {
    setStep2State((prev) => ({ ...prev, storyboard: newStoryboard }));
  };

  const goToStep3 = async () => {
    if (!step2State.storyboard) return;

    setCurrentStep(3);
    setIsGenerating(true);
    setProgress({
      label: '🚀 正在启动视频生成引擎...',
      percent: null,
      elapsedSec: 0,
    });

    try {
      const scriptForVideo =
        step2State.expandedText?.trim() || step1State.originalText;

      const res = await fetch('/api/video', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: scriptForVideo,
          storyboard: step2State.storyboard,
        }),
      });
      const data = await res.json();

      if (data.success && data.taskId) {
        setStep3State((prev) => ({ ...prev, taskId: data.taskId }));
        const videoUrl = await pollVideoStatus(data.taskId);

        if (videoUrl) {
          saveRecord({
            id: Date.now().toString(),
            originalText: step1State.originalText,
            expandedText: step2State.expandedText || '',
            storyboard: step2State.storyboard,
            videoUrl,
            createdAt: new Date().toISOString(),
          });

          setStep3State((prev) => ({ ...prev, videoUrl }));
        }
      }
    } catch (error) {
      console.error('生成视频失败:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const pollVideoStatus = async (
    taskId: string
  ): Promise<string | null> => {
    const pollStart = Date.now();

    for (let i = 0; i < 120; i++) {
      if (i > 0) {
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      try {
        const res = await fetch(`/api/video?taskId=${encodeURIComponent(taskId)}`);
        const data = await res.json();

        const clientElapsed = Math.floor((Date.now() - pollStart) / 1000);
        const serverElapsed =
          typeof data.elapsedSec === 'number' ? data.elapsedSec : clientElapsed;
        const elapsedSec = Math.max(clientElapsed, serverElapsed);

        const prog = data.progress;
        const label =
          (typeof prog?.label === 'string' && prog.label) ||
          (typeof data.message === 'string' && data.message) ||
          '⏳ 渲染中…';
        const percent =
          typeof prog?.percent === 'number' ? prog.percent : null;

        if (data.success && data.videoUrl) {
          setProgress({ label: '🎉 视频生成完成!', percent: 100, elapsedSec });
          return data.videoUrl;
        }
        if (data.status === 'FAILED') {
          console.error('视频生成失败:', data.error);
          setProgress({
            label: typeof data.error === 'string' ? `❌ ${data.error}` : '❌ 生成失败',
            percent: null,
            elapsedSec,
          });
          return null;
        }
        if (!res.ok && data.status !== 'PENDING') {
          console.error('视频状态请求失败:', data.error || res.status);
          return null;
        }
        if (!data.status || data.status === 'PENDING') {
          setProgress({ label, percent, elapsedSec });
          continue;
        }
      } catch (e) {
        console.error('轮询失败:', e);
      }
    }
    return null;
  };

  const handleRegenerate = async () => {
    if (!step2State.storyboard) return;

    setStep3State((prev) => ({ ...prev, videoUrl: null, taskId: null }));
    await goToStep3();
  };

  const canProceedToStep2 = step1State.originalText.trim() && !isLoadingStep2;
  const canProceedToStep3 = step2State.storyboard && !isGenerating;

  const handleBack = (targetStep: Step) => {
    if (targetStep === 1) {
      const msg =
        currentStep === 3
          ? '返回将丢失当前生成进度，是否继续？'
          : '返回将丢失当前内容，是否继续？';
      if (window.confirm(msg)) {
        setCurrentStep(1);
        setStep2State({ expandedText: undefined, storyboard: null });
        setStep3State({ videoUrl: null, taskId: null });
      }
    } else if (targetStep === 2) {
      if (currentStep === 3 && step3State.videoUrl) {
        if (!window.confirm('返回将丢失当前生成进度，是否继续？')) {
          return;
        }
      }
      setCurrentStep(2);
      setStep3State({ videoUrl: null, taskId: null });
    }
  };

  const renderStepIndicator = () => {
    const steps = [
      { num: 1, label: '输入' },
      { num: 2, label: '分镜' },
      { num: 3, label: '视频' },
    ];

    return (
      <div className="flex items-center justify-center gap-3 mb-8">
        {steps.map((s, idx) => (
          <div key={s.num} className="flex items-center">
            {idx > 0 && (
              <div
                className={`w-8 sm:w-16 h-px transition-colors duration-300 ${
                  currentStep > s.num - 1
                    ? 'bg-[var(--accent-primary)]'
                    : 'bg-[var(--border-subtle)]'
                }`}
              />
            )}
            <div className="flex flex-col items-center gap-2">
              <div
                className={`w-3 h-3 rounded-full transition-all duration-300 ${
                  currentStep === s.num
                    ? 'bg-[var(--accent-primary)] animate-pulse-glow scale-110'
                    : currentStep > s.num
                    ? 'bg-[var(--accent-primary)]'
                    : 'bg-[var(--border-subtle)]'
                }`}
              />
              <span
                className={`text-xs hidden sm:block transition-colors duration-300 ${
                  currentStep === s.num
                    ? 'text-[var(--accent-primary)] font-medium'
                    : 'text-[var(--text-muted)]'
                }`}
              >
                {s.label}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderStep1 = () => {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-xl sm:text-2xl font-semibold text-gradient font-[var(--font-display)]">
            输入主题
          </h2>
          <p className="text-[var(--text-secondary)] mt-2 text-sm sm:text-base">
            输入故事主题或文案，AI 将为您扩写并设计分镜
          </p>
        </div>

        <div className="relative">
          <textarea
            value={step1State.originalText}
            onChange={(e) =>
              setStep1State((prev) => ({ ...prev, originalText: e.target.value }))
            }
            placeholder="在这里输入你的故事主题..."
            className="input-field w-full h-48 resize-none text-base"
            disabled={isLoadingStep2}
            rows={6}
          />
          <div className="absolute bottom-3 right-3 text-xs text-[var(--text-muted)]">
            {step1State.originalText.length}/500
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => goToStep2('expand')}
            disabled={!canProceedToStep2}
            className="btn-accent w-full flex items-center justify-center gap-2"
          >
            {isLoadingStep2 ? (
              <>
                <span className="animate-spin">◐</span>
                <span>创作中...</span>
              </>
            ) : (
              <>
                ✨ <span>扩写并分镜</span>
              </>
            )}
          </button>
          <button
            onClick={() => goToStep2('direct')}
            disabled={!canProceedToStep2}
            className="btn-secondary w-full flex items-center justify-center gap-2"
          >
            🎬 <span>直接分镜</span>
          </button>
        </div>
      </div>
    );
  };

  const renderStep2 = () => {
    const storyboard = step2State.storyboard;
    const isLoading = isLoadingStep2;

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => handleBack(1)}
            className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-2 py-2"
          >
            ← <span className="hidden sm:inline">上一步</span>
          </button>
        </div>

        <div className="text-center">
          <h2 className="text-xl sm:text-2xl font-semibold text-gradient font-[var(--font-display)]">
            分镜编辑
          </h2>
          <p className="text-[var(--text-secondary)] mt-2 text-sm sm:text-base">
            {isLoading ? '🤖 AI 正在设计精彩分镜...' : '编辑每个分镜的场景和文字描述'}
          </p>
        </div>

        {step1State.mode === 'expand' && step2State.expandedText && !isLoading && (
          <div className="glass-card">
            <div className="px-4 py-3 border-b border-[var(--border-subtle)]">
              <span className="font-medium text-[var(--text-primary)]">扩写结果</span>
            </div>
            <div className="p-4 whitespace-pre-wrap text-sm text-[var(--text-secondary)]">
              {step2State.expandedText}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="glass-card p-12 text-center">
            <div className="text-5xl mb-4 animate-pulse-glow inline-block">🎬</div>
            <p className="text-[var(--text-secondary)]">
              {step1State.mode === 'expand' ? '扩写并设计分镜中...' : '设计分镜中...'}
            </p>
          </div>
        ) : storyboard ? (
          <EditableStoryboardView
            storyboard={storyboard}
            onChange={handleStoryboardChange}
          />
        ) : null}

        {!isLoading && (
          <button
            onClick={goToStep3}
            disabled={!storyboard}
            className="btn-accent w-full flex items-center justify-center gap-2"
          >
            🎥 <span>生成视频</span>
          </button>
        )}
      </div>
    );
  };

  const renderStep3 = () => {
    const { videoUrl } = step3State;
    const p = progress;

    return (
      <div className="space-y-6">
        <button
          onClick={() => handleBack(2)}
          className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors flex items-center gap-2 py-2"
        >
          ← <span className="hidden sm:inline">上一步</span>
        </button>

        <div className="text-center">
          <h2 className="text-xl sm:text-2xl font-semibold text-gradient font-[var(--font-display)]">
            生成视频
          </h2>
          <p className="text-[var(--text-secondary)] mt-2 text-sm sm:text-base">
            {isGenerating ? '视频生成中...' : videoUrl ? '生成完成' : '等待生成...'}
          </p>
        </div>

        {(isGenerating || p) && (
          <div className="glass-card px-4 py-4 space-y-3">
            <p className="font-medium text-[var(--text-primary)]">{p?.label || '准备中...'}</p>
            {p?.percent != null ? (
              <div className="progress-bar">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${Math.min(100, Math.max(0, p.percent))}%` }}
                />
              </div>
            ) : (
              <div className="progress-bar relative">
                <div className="absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-[var(--accent-primary)] to-transparent rounded-full animate-pulse" />
              </div>
            )}
            <p className="text-xs text-[var(--text-muted)]">
              {p?.percent != null
                ? `进度 ${p.percent}% · 已等待 ${p?.elapsedSec || 0} 秒`
                : `已等待 ${p?.elapsedSec || 0} 秒`}
            </p>
          </div>
        )}

        <div className="glass-card aspect-video flex items-center justify-center min-h-[280px]">
          {isGenerating ? (
            <div className="text-center">
              <div className="text-6xl mb-4 animate-pulse-glow">🎬</div>
              <p className="text-[var(--text-secondary)]">正在为您打造精彩视频，请稍候...</p>
            </div>
          ) : videoUrl ? (
            <video
              src={videoUrl}
              controls
              className="w-full max-w-full rounded-lg"
              playsInline
            />
          ) : (
            <div className="text-center text-[var(--text-muted)]">
              <div className="text-5xl mb-3">🌟</div>
              <p>准备就绪...</p>
            </div>
          )}
        </div>

        {videoUrl && !isGenerating && (
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={handleRegenerate}
              className="btn-secondary flex items-center justify-center gap-2"
            >
              🔄 <span>重新生成</span>
            </button>
            <a
              href={videoUrl}
              download={`video-${Date.now()}.mp4`}
              className="btn-accent flex items-center justify-center gap-2 text-center"
            >
              ⬇️ <span>下载</span>
            </a>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <div className="space-y-2 text-center mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold font-[var(--font-display)]">
          <span className="text-gradient">AI 视频生成器</span>
        </h1>
        <p className="text-[var(--text-secondary)] text-sm sm:text-base">
          输入主题，AI自动生成视频
        </p>
      </div>

      {renderStepIndicator()}

      {error && (
        <div className="alert-error">
          <div className="flex items-start gap-3">
            <span className="text-xl">⚠️</span>
            <div className="flex-1">
              <p className="font-medium">出错了</p>
              <p className="text-sm mt-1 opacity-80">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="p-1 hover:opacity-80"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="glass-card p-5 sm:p-8">
        <div className="animate-fade-in">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
        </div>
      </div>
    </div>
  );
}

interface EditableStoryboardViewProps {
  storyboard: Storyboard;
  onChange: (storyboard: Storyboard) => void;
}

function EditableStoryboardView({
  storyboard,
  onChange,
}: EditableStoryboardViewProps) {
  const [shots, setShots] = useState<Shot[]>(storyboard.shots);

  useEffect(() => {
    setShots(storyboard.shots);
  }, [storyboard.shots]);

  const handleShotChange = (
    shotId: number,
    field: 'scene' | 'text',
    value: string
  ) => {
    const newShots = shots.map((shot) =>
      shot.id === shotId ? { ...shot, [field]: value } : shot
    );
    setShots(newShots);
    saveStoryboard({ ...storyboard, shots: newShots }, onChange);
  };

  const handleSummaryChange = (value: string) => {
    saveStoryboard({ ...storyboard, summary: value }, onChange);
  };

  const handleDeleteShot = (shotId: number) => {
    const newShots = shots
      .filter((shot) => shot.id !== shotId)
      .map((shot, index) => ({ ...shot, id: index + 1 }));
    setShots(newShots);
    saveStoryboard({ ...storyboard, shots: newShots }, onChange);
  };

  return (
    <div className="space-y-4">
      <div className="shot-card">
        <label className="text-sm text-[var(--accent-primary)] font-medium block mb-2">
          主题
        </label>
        <input
          type="text"
          value={storyboard.summary}
          onChange={(e) => handleSummaryChange(e.target.value)}
          className="input-field w-full"
        />
      </div>

      <div className="space-y-3">
        {shots.map((shot) => (
          <div key={shot.id} className="shot-card">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-8 h-8 bg-[var(--bg-tertiary)] text-[var(--accent-primary)] text-sm font-medium rounded-full flex items-center justify-center">
                {shot.id}
              </span>
              <div className="flex-1 min-w-0 space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs text-[var(--text-muted)]">
                    场景描述
                  </label>
                  <button
                    onClick={() => handleDeleteShot(shot.id)}
                    className="text-xs text-red-400 hover:text-red-300 px-2 py-1 min-h-[36px]"
                  >
                    🗑️ 删除
                  </button>
                </div>
                <textarea
                  value={shot.scene}
                  onChange={(e) =>
                    handleShotChange(shot.id, 'scene', e.target.value)
                  }
                  rows={2}
                  className="input-field w-full text-sm"
                />
                <div>
                  <label className="text-xs text-[var(--text-muted)] block mb-2">
                    显示文字
                  </label>
                  <textarea
                    value={shot.text}
                    onChange={(e) =>
                      handleShotChange(shot.id, 'text', e.target.value)
                    }
                    rows={2}
                    className="input-field w-full text-sm"
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}