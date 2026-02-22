import React, { useEffect, useState, useRef } from 'react';
import { AnalysisReport, ScenarioConfig, PersonaType } from '../types';
import { getAI } from '../services/gemini';
import { Type } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { motion } from 'motion/react';
import { TrendingUp, Brain, Heart, Zap, ChevronRight, RotateCcw, Play, Pause } from 'lucide-react';

interface Props {
  transcript: string;
  config: ScenarioConfig;
  onRestart: () => void;
  initialReport?: AnalysisReport | null;
}

export default function AnalysisReportView({ transcript, config, onRestart, initialReport }: Props) {
  const [report, setReport] = useState<AnalysisReport | null>(initialReport || null);
  const [loading, setLoading] = useState(!initialReport);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (initialReport && initialReport.grammar_score > 0) return;
    const analyze = async () => {
      try {
        const ai = getAI();
        const response = await ai.models.generateContent({
          model: "gemini-3.1-pro-preview",
          contents: `
            Analyze the following transcript of a high-pressure oral practice session.
            Persona: ${config.persona}
            Context: ${config.context}
            Transcript:
            ${transcript || initialReport?.transcript}

            Provide a detailed analysis including scores (0-100) for grammar, logic, emotion, and fluency.
            Also provide constructive feedback and suggestions for better expressions.
          `,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                grammar_score: { type: Type.INTEGER },
                logic_score: { type: Type.INTEGER },
                emotion_score: { type: Type.INTEGER },
                fluency_score: { type: Type.INTEGER },
                feedback: { type: Type.STRING, description: "Markdown formatted feedback" },
              },
              required: ["grammar_score", "logic_score", "emotion_score", "fluency_score", "feedback"]
            }
          }
        });

        const data = JSON.parse(response.text || '{}');
        const finalReport: AnalysisReport = {
          id: initialReport?.id || Math.random().toString(36).substr(2, 9),
          timestamp: initialReport?.timestamp || new Date().toISOString(),
          scenario: config.context,
          persona: config.persona,
          transcript: transcript || initialReport?.transcript || '',
          audioUrl: initialReport?.audioUrl,
          ...data
        };

        setReport(finalReport);
        
        // Save to DB
        await fetch('/api/reports', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(finalReport)
        });

      } catch (err) {
        console.error("Analysis error:", err);
      } finally {
        setLoading(false);
      }
    };

    analyze();
  }, [transcript, config, initialReport]);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <div className="relative w-24 h-24">
          <div className="absolute inset-0 border-4 border-black/10 rounded-full" />
          <div className="absolute inset-0 border-4 border-black border-t-transparent rounded-full animate-spin" />
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">Analyzing Performance</h2>
          <p className="text-gray-500">Evaluating grammar, logic, and emotional intelligence...</p>
        </div>
      </div>
    );
  }

  if (!report) return <div>Error generating report.</div>;

  return (
    <div className="max-w-4xl mx-auto p-8 space-y-12">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        {/* Header */}
        <div className="flex justify-between items-end">
          <div className="space-y-2">
            <div className="flex items-center gap-4">
              <h1 className="text-4xl font-bold tracking-tight">Performance Report</h1>
              {report.audioUrl && (
                <button
                  onClick={togglePlay}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-full font-bold hover:bg-blue-600 transition-all shadow-lg"
                >
                  {isPlaying ? <Pause size={16} fill="white" /> : <Play size={16} fill="white" />}
                  {isPlaying ? 'Pause Recording' : 'Replay Audio'}
                </button>
              )}
            </div>
            <p className="text-gray-500">Session with {report.persona} • {new Date(report.timestamp).toLocaleDateString()}</p>
          </div>
          <button 
            onClick={onRestart}
            className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-xl font-bold hover:bg-gray-900 transition-all"
          >
            <RotateCcw size={18} /> New Session
          </button>
        </div>

        {report.audioUrl && (
          <audio 
            ref={audioRef} 
            src={report.audioUrl} 
            onEnded={() => setIsPlaying(false)}
            className="hidden"
          />
        )}

        {/* Scores Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ScoreCard label="Grammar" score={report.grammar_score} icon={<Zap size={16} />} color="text-blue-600" />
          <ScoreCard label="Logic" score={report.logic_score} icon={<Brain size={16} />} color="text-purple-600" />
          <ScoreCard label="Emotion" score={report.emotion_score} icon={<Heart size={16} />} color="text-red-600" />
          <ScoreCard label="Fluency" score={report.fluency_score} icon={<TrendingUp size={16} />} color="text-green-600" />
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <section className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
              <h3 className="text-xl font-bold mb-6 flex items-center gap-2">
                <ChevronRight className="text-gray-400" /> Detailed Feedback
              </h3>
              <div className="prose prose-slate max-w-none">
                <ReactMarkdown>{report.feedback}</ReactMarkdown>
              </div>
            </section>
          </div>

          <div className="space-y-8">
            <section className="bg-gray-50 p-6 rounded-3xl border border-gray-200">
              <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-4">Transcript</h3>
              <div className="text-sm text-gray-600 space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {report.transcript.split('\n').map((line, i) => (
                  <p key={i} className={line.startsWith('AI:') ? 'font-medium text-gray-900' : ''}>
                    {line}
                  </p>
                ))}
              </div>
            </section>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function ScoreCard({ label, score, icon, color }: { label: string, score: number, icon: React.ReactNode, color: string }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm space-y-3">
      <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${color}`}>
        {icon} {label}
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-3xl font-bold">{score}</span>
        <span className="text-gray-400 text-sm">/100</span>
      </div>
      <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${score}%` }}
          className={`h-full ${color.replace('text-', 'bg-')}`}
        />
      </div>
    </div>
  );
}
