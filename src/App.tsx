/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import SetupForm from './components/SetupForm';
import VoiceSession from './components/VoiceSession';
import AnalysisReportView from './components/AnalysisReport';
import AudioUploadAnalysis from './components/AudioUploadAnalysis';
import { ScenarioConfig, AnalysisReport, PersonaType } from './types';
import { motion, AnimatePresence } from 'motion/react';
import { Shield } from 'lucide-react';

type AppState = 'setup' | 'session' | 'report' | 'upload_processing';

export default function App() {
  const [state, setState] = useState<AppState>('setup');
  const [config, setConfig] = useState<ScenarioConfig | null>(null);
  const [transcript, setTranscript] = useState<string>('');
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [finalReport, setFinalReport] = useState<AnalysisReport | null>(null);

  const handleStart = (newConfig: ScenarioConfig) => {
    setConfig(newConfig);
    setState('session');
  };

  const handleUpload = (file: File) => {
    setUploadFile(file);
    setState('upload_processing');
  };

  const handleUploadComplete = (report: AnalysisReport) => {
    setFinalReport(report);
    setState('report');
  };

  const handleComplete = (finalTranscript: string, audioUrl?: string) => {
    setTranscript(finalTranscript);
    if (audioUrl) {
      setFinalReport(prev => prev ? { ...prev, audioUrl } : { 
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        scenario: config?.context || 'Live Session',
        persona: config?.persona || 'Critic',
        grammar_score: 0,
        logic_score: 0,
        emotion_score: 0,
        fluency_score: 0,
        feedback: '',
        transcript: finalTranscript,
        audioUrl 
      });
    }
    setState('report');
  };

  const handleRestart = () => {
    setState('setup');
    setConfig(null);
    setTranscript('');
    setUploadFile(null);
    setFinalReport(null);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-color)]">
      {/* Navigation / Header */}
      <nav className="p-6 flex justify-between items-center">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tighter">
          <div className="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white">
            <Shield size={18} />
          </div>
          AI CRITIC COACH
        </div>
        <div className="flex gap-4">
          <div className="status-label px-3 py-1 bg-white rounded-full border border-black/5">Beta v1.0</div>
        </div>
      </nav>

      <main className="container mx-auto">
        <AnimatePresence mode="wait">
          {state === 'setup' && (
            <motion.div
              key="setup"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <SetupForm onStart={handleStart} onUpload={handleUpload} />
            </motion.div>
          )}

          {state === 'upload_processing' && uploadFile && (
            <motion.div
              key="upload"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <AudioUploadAnalysis file={uploadFile} onComplete={handleUploadComplete} />
            </motion.div>
          )}

          {state === 'session' && config && (
            <motion.div
              key="session"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
            >
              <VoiceSession config={config} onComplete={handleComplete} />
            </motion.div>
          )}

          {state === 'report' && (config || finalReport) && (
            <motion.div
              key="report"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <AnalysisReportView 
                transcript={transcript} 
                config={config || { persona: (finalReport?.persona as PersonaType) || PersonaType.STRICT_BOSS, context: finalReport?.scenario || 'Uploaded Audio', difficulty: 'Medium', language: 'English' }} 
                onRestart={handleRestart}
                initialReport={finalReport}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Background Decoration */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-black/5 blur-[120px] rounded-full" />
      </div>
    </div>
  );
}
