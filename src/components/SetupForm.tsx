import React, { useState, useRef } from 'react';
import { PersonaType, ScenarioConfig } from '../types';
import { User, ShieldAlert, MessageSquare, Globe, Zap, Upload, FileAudio } from 'lucide-react';
import { motion } from 'motion/react';

interface Props {
  onStart: (config: ScenarioConfig) => void;
  onUpload: (file: File) => void;
}

export default function SetupForm({ onStart, onUpload }: Props) {
  const [config, setConfig] = useState<ScenarioConfig>({
    persona: PersonaType.STRICT_BOSS,
    difficulty: "Medium",
    context: "You missed a major project deadline by 2 days because of a technical oversight.",
    language: "English"
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="max-w-2xl mx-auto p-8">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-8"
      >
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight text-gray-900">Configure Session</h1>
          <p className="text-gray-500">Choose your critic and set the stage for your practice.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Persona Selection */}
          <div className="space-y-4">
            <label className="status-label flex items-center gap-2 text-gray-900">
              <User size={14} /> Persona
            </label>
            <div className="grid grid-cols-1 gap-2">
              {Object.values(PersonaType).map((p) => (
                <button
                  key={p}
                  onClick={() => setConfig({ ...config, persona: p })}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    config.persona === p 
                      ? 'border-black bg-black text-white shadow-lg' 
                      : 'border-gray-200 bg-white hover:border-gray-400'
                  }`}
                >
                  <div className="font-medium">{p}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-6">
            {/* Difficulty */}
            <div className="space-y-4">
              <label className="status-label flex items-center gap-2 text-gray-900">
                <Zap size={14} /> Pressure Level
              </label>
              <div className="flex gap-2">
                {(["Low", "Medium", "High"] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => setConfig({ ...config, difficulty: d })}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${
                      config.difficulty === d 
                        ? 'bg-red-500 border-red-500 text-white' 
                        : 'bg-white border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            {/* Language */}
            <div className="space-y-4">
              <label className="status-label flex items-center gap-2 text-gray-900">
                <Globe size={14} /> Language
              </label>
              <div className="flex gap-2">
                {(["English", "Chinese"] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => setConfig({ ...config, language: l })}
                    className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${
                      config.language === l 
                        ? 'bg-black border-black text-white' 
                        : 'bg-white border-gray-200 hover:border-gray-400'
                    }`}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Context */}
        <div className="space-y-4">
          <label className="status-label flex items-center gap-2 text-gray-900">
            <MessageSquare size={14} /> Background Context
          </label>
          <textarea
            value={config.context}
            onChange={(e) => setConfig({ ...config, context: e.target.value })}
            className="w-full h-32 p-4 rounded-xl border border-gray-200 focus:border-black focus:ring-1 focus:ring-black outline-none transition-all resize-none"
            placeholder="Describe the situation..."
          />
        </div>

        <button
          onClick={() => onStart(config)}
          className="w-full py-4 bg-black text-white rounded-xl font-bold text-lg hover:bg-gray-900 transition-all flex items-center justify-center gap-2 group"
        >
          Start High-Pressure Session
          <ShieldAlert className="group-hover:animate-pulse" />
        </button>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-gray-200" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[var(--bg-color)] px-2 text-gray-500">Or analyze existing recording</span>
          </div>
        </div>

        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={(e) => e.target.files?.[0] && onUpload(e.target.files[0])}
          accept="audio/*"
          className="hidden" 
        />
        <button
          onClick={() => fileInputRef.current?.click()}
          className="w-full py-4 bg-white border-2 border-dashed border-gray-300 text-gray-600 rounded-xl font-medium hover:border-gray-400 hover:bg-gray-50 transition-all flex items-center justify-center gap-2"
        >
          <Upload size={18} />
          Upload Audio for Analysis
        </button>
      </motion.div>
    </div>
  );
}
