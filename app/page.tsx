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
      { num: 1, label: '输入主题' },
      { num: 2, label: '分镜编辑' },
      { num: 3, label: '生成视频' },
    ];

    return (
      <div className="flex items-center justify-center gap-2 mb-8">
        {steps.map((s, idx) => (
          <div key={s.num} className="flex items-center">
            {idx > 0 && (
              <div
                className={`w-12 h-0.5 mr-2 ${
                  currentStep > s.num - 1
                    ? 'bg-blue-600'
                    : 'bg-gray-300'
                }`}
              />
            )}
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${
                currentStep === s.num
                  ? 'bg-blue-600 text-white'
                  : currentStep > s.num
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-300 text-gray-600'
              }`}
            >
              {currentStep > s.num ? '✓' : s.num}
            </div>
            <span
              className={`ml-2 text-sm hidden sm:inline ${
                currentStep === s.num
                  ? 'text-blue-600 font-medium'
                  : 'text-gray-500'
              }`}
            >
              {s.label}
            </span>
          </div>
        ))}
      </div>
    );
  };

  const renderStep1 = () => {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800">输入主题</h2>
          <p className="text-gray-500 mt-1">
            输入故事主题或文案，AI 将为您扩写并设计分镜
          </p>
        </div>

        <textarea
          value={step1State.originalText}
          onChange={(e) =>
            setStep1State((prev) => ({ ...prev, originalText: e.target.value }))
          }
          placeholder="输入主题或故事..."
          className="w-full h-40 p-4 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={isLoadingStep2}
        />

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => goToStep2('expand')}
            disabled={!canProceedToStep2}
            className="py-3 px-6 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoadingStep2 ? '✨ 创作中...' : '扩写并分镜'}
          </button>
          <button
            onClick={() => goToStep2('direct')}
            disabled={!canProceedToStep2}
            className="py-3 px-6 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoadingStep2 ? '✨ 创作中...' : '直接分镜'}
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
            className="text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1"
          >
            ← 上一步
          </button>
        </div>

        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800">分镜编辑</h2>
          <p className="text-gray-500 mt-1">
            {isLoading ? '🤖 AI 正在设计精彩分镜...' : '编辑每个分镜的场景和文字描述'}
          </p>
        </div>

        {step1State.mode === 'expand' && step2State.expandedText && !isLoading && (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="p-3 bg-gray-50">
              <span className="font-medium text-gray-700">扩写结果</span>
            </div>
            <div className="p-3 bg-white whitespace-pre-wrap text-sm text-gray-700">
              {step2State.expandedText}
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="p-8 border border-gray-200 rounded-lg bg-gray-50 text-center">
            <div className="animate-spin text-4xl mb-4">⏳</div>
            <p className="text-gray-500">
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
            className="w-full py-3 px-6 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            生成视频
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
          className="text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1"
        >
          ← 上一步
        </button>

        <div className="text-center">
          <h2 className="text-xl font-semibold text-gray-800">生成视频</h2>
          <p className="text-gray-500 mt-1">
            {isGenerating ? '视频生成中...' : videoUrl ? '生成完成' : '等待生成...'}
          </p>
        </div>

        {(isGenerating || p) && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 px-4 py-3 text-left text-sm text-gray-700 space-y-2">
            <p className="font-medium text-gray-800">{p?.label || '准备中...'}</p>
            {p?.percent != null ? (
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-600 transition-[width] duration-500 ease-out rounded-full"
                  style={{ width: `${Math.min(100, Math.max(0, p.percent))}%` }}
                />
              </div>
            ) : (
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden relative">
                <div className="absolute inset-y-0 left-0 w-1/3 bg-blue-400 rounded-full animate-pulse" />
              </div>
            )}
            {p?.percent != null ? (
              <p className="text-xs text-gray-500">进度 {p.percent}% · 已等待 {p?.elapsedSec || 0} 秒</p>
            ) : (
              <p className="text-xs text-gray-500">已等待 {p?.elapsedSec || 0} 秒</p>
            )}
          </div>
        )}

        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center min-h-[200px] flex items-center justify-center bg-gray-50">
          {isGenerating ? (
            <div className="text-gray-400">
              <div className="text-5xl mb-4 animate-pulse">🎬</div>
              <p>正在为您打造精彩视频，请稍候...</p>
            </div>
          ) : videoUrl ? (
            <video src={videoUrl} controls className="max-w-full rounded" />
          ) : (
            <div className="text-gray-400">
              <div className="text-4xl mb-2">🌟</div>
              <p>准备就绪...</p>
            </div>
          )}
        </div>

        {videoUrl && !isGenerating && (
          <div className="flex gap-3">
            <button
              onClick={handleRegenerate}
              className="flex-1 py-3 px-6 bg-gray-200 text-gray-700 font-medium rounded-lg hover:bg-gray-300 transition-colors"
            >
              重新生成
            </button>
            <a
              href={videoUrl}
              download={`video-${Date.now()}.mp4`}
              className="flex-1 py-3 px-6 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors text-center block"
            >
              下载
            </a>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-8 space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-gray-800 text-center">
          AI 视频生成器
        </h1>
        <p className="text-gray-600 text-center">输入主题，AI自动生成视频</p>
      </div>

      {renderStepIndicator()}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="text-red-500 text-xl">⚠️</span>
            <div className="flex-1">
              <p className="text-red-700 font-medium">出错了</p>
              <p className="text-red-600 text-sm mt-1">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-600"
            >
              ✕
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
        {currentStep === 1 && renderStep1()}
        {currentStep === 2 && renderStep2()}
        {currentStep === 3 && renderStep3()}
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
    <div className="space-y-3">
      <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <label className="text-sm text-blue-800 font-medium block mb-1">
          主题
        </label>
        <input
          type="text"
          value={storyboard.summary}
          onChange={(e) => handleSummaryChange(e.target.value)}
          className="w-full px-2 py-1 text-sm border border-blue-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400"
        />
      </div>

      <div className="space-y-2">
        {shots.map((shot) => (
          <div
            key={shot.id}
            className="p-3 border border-gray-200 rounded-lg bg-white"
          >
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 bg-gray-100 text-gray-600 text-sm font-medium rounded-full flex items-center justify-center">
                {shot.id}
              </span>
              <div className="flex-1 min-w-0 space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs text-gray-500">
                    场景描述
                  </label>
                  <button
                    onClick={() => handleDeleteShot(shot.id)}
                    className="text-xs text-red-500 hover:text-red-700 px-2 py-0.5"
                  >
                    删除
                  </button>
                </div>
                <textarea
                  value={shot.scene}
                  onChange={(e) =>
                    handleShotChange(shot.id, 'scene', e.target.value)
                  }
                  rows={2}
                  className="w-full px-2 py-1 text-sm border border-gray-200 rounded resize-none focus:outline-none focus:ring-1 focus:ring-gray-400"
                />
                <div>
                  <label className="text-xs text-gray-500 block mb-1">
                    显示文字
                  </label>
                  <textarea
                    value={shot.text}
                    onChange={(e) =>
                      handleShotChange(shot.id, 'text', e.target.value)
                    }
                    rows={2}
                    className="w-full px-2 py-1 text-sm border border-gray-200 rounded resize-none focus:outline-none focus:ring-1 focus:ring-gray-400"
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