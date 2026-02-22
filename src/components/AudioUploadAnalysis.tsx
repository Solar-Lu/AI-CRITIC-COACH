import React, { useEffect, useState } from 'react';
import { AnalysisReport } from '../types';
import { getAI } from '../services/gemini';
import { Type } from "@google/genai";
import ReactMarkdown from 'react-markdown';
import { motion } from 'motion/react';
import { FileAudio, Loader2 } from 'lucide-react';

interface Props {
  file: File;
  onComplete: (report: AnalysisReport) => void;
}

export default function AudioUploadAnalysis({ file, onComplete }: Props) {
  const [status, setStatus] = useState("Reading audio file...");

  useEffect(() => {
    const processFile = async () => {
      try {
        setStatus("Transcribing and analyzing audio...");
        const reader = new FileReader();
        reader.onload = async () => {
          const base64 = (reader.result as string).split(',')[1];
          const ai = getAI();
          
          const response = await ai.models.generateContent({
            model: "gemini-3.1-pro-preview",
            contents: [
              {
                inlineData: {
                  data: base64,
                  mimeType: file.type
                }
              },
              {
                text: "Transcribe this audio and analyze the speaker's performance in a professional setting. Provide scores and feedback."
              }
            ],
            config: {
              responseMimeType: "application/json",
              responseSchema: {
                type: Type.OBJECT,
                properties: {
                  grammar_score: { type: Type.INTEGER },
                  logic_score: { type: Type.INTEGER },
                  emotion_score: { type: Type.INTEGER },
                  fluency_score: { type: Type.INTEGER },
                  feedback: { type: Type.STRING },
                  transcript: { type: Type.STRING }
                },
                required: ["grammar_score", "logic_score", "emotion_score", "fluency_score", "feedback", "transcript"]
              }
            }
          });

          const data = JSON.parse(response.text || '{}');
          const report: AnalysisReport = {
            id: Math.random().toString(36).substr(2, 9),
            timestamp: new Date().toISOString(),
            scenario: "Uploaded Recording",
            persona: "Unknown Critic",
            audioUrl: URL.createObjectURL(file),
            ...data
          };

          onComplete(report);
        };
        reader.readAsDataURL(file);
      } catch (err) {
        console.error("Upload analysis error:", err);
      }
    };

    processFile();
  }, [file]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-8">
      <div className="relative">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
          className="w-32 h-32 border-4 border-dashed border-black/10 rounded-full"
        />
        <div className="absolute inset-0 flex items-center justify-center">
          <FileAudio size={48} className="text-black animate-pulse" />
        </div>
      </div>
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">Processing Audio</h2>
        <div className="flex items-center justify-center gap-2 text-gray-500">
          <Loader2 size={16} className="animate-spin" />
          {status}
        </div>
      </div>
    </div>
  );
}
