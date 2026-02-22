export enum PersonaType {
  STRICT_BOSS = "Strict Boss",
  DISAPPOINTED_MENTOR = "Disappointed Mentor",
  ANGRY_CLIENT = "Angry Client",
  PASSIVE_AGGRESSIVE_COLLEAGUE = "Passive-Aggressive Colleague"
}

export interface ScenarioConfig {
  persona: PersonaType;
  difficulty: "Low" | "Medium" | "High";
  context: string;
  language: "English" | "Chinese";
}

export interface AnalysisReport {
  id: string;
  timestamp: string;
  scenario: string;
  persona: string;
  grammar_score: number;
  logic_score: number;
  emotion_score: number;
  fluency_score: number;
  feedback: string;
  transcript: string;
  audioUrl?: string;
}
