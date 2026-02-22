import React, { useEffect, useRef, useState } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { ScenarioConfig } from '../types';
import { SYSTEM_INSTRUCTION_TEMPLATE } from '../services/gemini';
import { Mic, MicOff, Square, Volume2, AlertCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Props {
  config: ScenarioConfig;
  onComplete: (transcript: string, audioUrl?: string) => void;
}

export default function VoiceSession({ config, onComplete }: Props) {
  const [isConnecting, setIsConnecting] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transcript, setTranscript] = useState<string[]>([]);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const sessionRef = useRef<any>(null);
  const audioQueueRef = useRef<Float32Array[]>([]);
  const isPlayingRef = useRef(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const mixedDestinationRef = useRef<MediaStreamAudioDestinationNode | null>(null);

  useEffect(() => {
    const initSession = async () => {
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        
        const sessionPromise = ai.live.connect({
          model: "gemini-2.5-flash-native-audio-preview-09-2025",
          callbacks: {
            onopen: () => {
              setIsConnecting(false);
              setIsRecording(true);
              startMic();
            },
            onmessage: async (message: LiveServerMessage) => {
              if (message.serverContent?.modelTurn?.parts[0]?.inlineData?.data) {
                const base64Audio = message.serverContent.modelTurn.parts[0].inlineData.data;
                const audioData = base64ToFloat32(base64Audio);
                audioQueueRef.current.push(audioData);
                if (!isPlayingRef.current) {
                  playNextChunk();
                }
              }

              if (message.serverContent?.interrupted) {
                audioQueueRef.current = [];
                isPlayingRef.current = false;
              }

              // Handle transcriptions if enabled
              if (message.serverContent?.modelTurn?.parts[0]?.text) {
                setTranscript(prev => [...prev, `AI: ${message.serverContent?.modelTurn?.parts[0]?.text}`]);
              }
            },
            onerror: (err) => {
              console.error("Live API Error:", err);
              setError("Connection lost. Please try again.");
            },
            onclose: () => {
              setIsRecording(false);
            }
          },
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: { prebuiltVoiceConfig: { voiceName: "Zephyr" } },
            },
            systemInstruction: SYSTEM_INSTRUCTION_TEMPLATE(config.persona, config.context, config.language),
          },
        });

        sessionRef.current = await sessionPromise;
      } catch (err) {
        console.error("Init Error:", err);
        setError("Failed to initialize AI session.");
      }
    };

    initSession();

    return () => {
      stopMic();
      if (sessionRef.current) sessionRef.current.close();
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  const startMic = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioContextRef.current = new AudioContext({ sampleRate: 16000 });
      
      // Setup mixed destination for recording
      mixedDestinationRef.current = audioContextRef.current.createMediaStreamDestination();
      
      const source = audioContextRef.current.createMediaStreamSource(stream);
      
      // Connect mic to mixed destination
      source.connect(mixedDestinationRef.current);
      
      processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);

      processorRef.current.onaudioprocess = (e) => {
        if (!sessionRef.current) return;
        const inputData = e.inputBuffer.getChannelData(0);
        const pcmData = float32ToInt16(inputData);
        const base64Data = btoa(String.fromCharCode(...new Uint8Array(pcmData.buffer)));
        
        sessionRef.current.sendRealtimeInput({
          media: { data: base64Data, mimeType: 'audio/pcm;rate=16000' }
        });
      };

      source.connect(processorRef.current);
      processorRef.current.connect(audioContextRef.current.destination);
      
      // Start recording
      mediaRecorderRef.current = new MediaRecorder(mixedDestinationRef.current.stream);
      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      mediaRecorderRef.current.start();

    } catch (err) {
      console.error("Mic Error:", err);
      setError("Microphone access denied.");
    }
  };

  const stopMic = () => {
    if (processorRef.current) {
      processorRef.current.disconnect();
      processorRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  const playNextChunk = () => {
    if (audioQueueRef.current.length === 0 || !audioContextRef.current) {
      isPlayingRef.current = false;
      return;
    }

    isPlayingRef.current = true;
    const chunk = audioQueueRef.current.shift()!;
    const buffer = audioContextRef.current.createBuffer(1, chunk.length, 24000);
    buffer.getChannelData(0).set(chunk);

    const source = audioContextRef.current.createBufferSource();
    source.buffer = buffer;
    
    // Connect AI audio to both speakers and mixed destination for recording
    source.connect(audioContextRef.current.destination);
    if (mixedDestinationRef.current) {
      source.connect(mixedDestinationRef.current);
    }
    
    source.onended = playNextChunk;
    source.start();
  };

  const float32ToInt16 = (buffer: Float32Array) => {
    const l = buffer.length;
    const buf = new Int16Array(l);
    for (let i = 0; i < l; i++) {
      buf[i] = Math.min(1, buffer[i]) * 0x7FFF;
    }
    return buf;
  };

  const base64ToFloat32 = (base64: string) => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const int16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(int16.length);
    for (let i = 0; i < int16.length; i++) {
      float32[i] = int16[i] / 32768.0;
    }
    return float32;
  };

  const handleStop = () => {
    const fullTranscript = transcript.join('\n');
    
    if (mediaRecorderRef.current) {
      mediaRecorderRef.current.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        onComplete(fullTranscript, audioUrl);
      };
      mediaRecorderRef.current.stop();
    } else {
      onComplete(fullTranscript);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8">
      <div className="widget-container w-full max-w-md aspect-square flex flex-col items-center justify-between p-12 relative">
        {/* Header */}
        <div className="w-full flex justify-between items-start">
          <div className="space-y-1">
            <div className="status-label">Session Active</div>
            <div className="timer-display">00:00:00</div>
          </div>
          <div className="status-label text-red-500">{config.difficulty} Pressure</div>
        </div>

        {/* Visualizer Area */}
        <div className="relative flex items-center justify-center w-64 h-64">
          <div className={`radial-track absolute inset-0 transition-transform duration-500 ${isRecording ? 'scale-110 opacity-20' : 'scale-100 opacity-10'}`} />
          <div className={`radial-track absolute inset-4 transition-transform duration-700 ${isRecording ? 'scale-105 opacity-30' : 'scale-100 opacity-10'}`} />
          
          <motion.div 
            animate={isRecording ? { scale: [1, 1.1, 1] } : {}}
            transition={{ repeat: Infinity, duration: 2 }}
            className={`w-32 h-32 rounded-full flex items-center justify-center transition-colors duration-500 ${isRecording ? 'bg-red-500/10' : 'bg-white/5'}`}
          >
            {isRecording ? <Mic size={48} className="text-red-500" /> : <MicOff size={48} className="text-gray-600" />}
          </motion.div>
        </div>

        {/* Footer */}
        <div className="w-full space-y-6">
          <div className="text-center space-y-2">
            <h2 className="text-xl font-bold text-white tracking-tight">{config.persona}</h2>
            <p className="text-sm text-[var(--text-secondary)] italic">"Listening for your response..."</p>
          </div>

          <button
            onClick={handleStop}
            className="w-full py-4 bg-white text-black rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-200 transition-all"
          >
            <Square size={18} fill="black" />
            End & Analyze
          </button>
        </div>

        {/* Overlays */}
        <AnimatePresence>
          {isConnecting && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center z-50 rounded-2xl"
            >
              <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mb-4" />
              <p className="text-white font-medium">Establishing Secure Link...</p>
            </motion.div>
          )}

          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute bottom-4 left-4 right-4 bg-red-500/90 text-white p-4 rounded-xl flex items-center gap-3 backdrop-blur-md"
            >
              <AlertCircle size={20} />
              <p className="text-sm font-medium">{error}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
