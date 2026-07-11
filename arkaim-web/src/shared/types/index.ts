/**
 * Общие TypeScript типы для Arkaim Digital Consciousness.
 */

// ── Auth ──────────────────────────────────────────

export type UserRole = 'reader' | 'editor' | 'admin';

export interface User {
  id: string;
  role: UserRole;
  username?: string;
  display_name?: string;
  provider: string;
  provider_user_id?: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Session {
  id: string;
  user_id: string;
  expires_at: string;
  created_at: string;
}

export interface ApiKey {
  id: string;
  user_id: string;
  key_prefix: string;
  name?: string;
  last_used_at?: string;
  is_active: boolean;
  created_at: string;
}

export interface Invite {
  id: string;
  token: string;
  url: string;
  created_by: string;
  role: UserRole;
  max_uses: number;
  use_count: number;
  expires_at?: string;
  is_active: boolean;
  created_at: string;
  note?: string;
}

// ── Book ──────────────────────────────────────────

export interface Genome {
  themes: Theme[];
  characters: Character[];
  values: Value[];
  world_entities: WorldEntity[];
  author_intent: Record<string, unknown>;
}

export interface Theme {
  name: string;
  description?: string;
}

export interface Character {
  id: string;
  name: string;
  role?: string;
  description?: string;
}

export interface Value {
  name: string;
  description?: string;
}

export interface WorldEntity {
  id: string;
  name: string;
  type?: string;
}

export interface BookLayers {
  knowledge_layer: string;
  meaning_layer: string;
  identity_layer: string;
  mission_layer: string;
}

// ── Reader ────────────────────────────────────────

export interface ReaderProfile {
  reader_id: string;
  display_name: string;
  questions_total: number;
  conversation_count: number;
  last_topic: string;
  topics: ReaderTopic[];
}

export interface ReaderTopic {
  name: string;
  depth: number;
  questions: number;
}

export interface HistoryItem {
  id: number;
  session_id: string;
  content: string;
  created_at: string;
}

export interface HistoryStats {
  questions: number;
  sessions: number;
  last_active: string | null;
}

// ── Messages ──────────────────────────────────────

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  created_at?: string;
}

// ── Visual ────────────────────────────────────────

export interface VisualScene {
  chapter: number;
  scene_id: string;
  title: string;
  characters: string[];
  location: string;
  emotion: string;
  meaning_tags: string[];
  color_palette?: string[];
}

export interface VisualCharacter {
  character_id: string;
  name: string;
  archetype?: string;
  color_palette: string[];
  visual_description: string;
}

export interface VisualLocation {
  location_id: string;
  name: string;
  atmosphere?: string;
  architecture?: string;
  lighting?: string;
}

// ── Crowdfunding ──────────────────────────────────

export interface Campaign {
  id: string;
  platform: string;
  url: string;
  title: string;
  target_amount: number;
  current_amount: number;
  backers_count: number;
  days_left: number;
  milestones: Milestone[];
}

export interface Milestone {
  id: string;
  title: string;
  target_amount: number;
  reached: boolean;
}

// ── Admin ─────────────────────────────────────────

export interface AdminStats {
  users: {
    total: number;
    by_role: Record<UserRole, number>;
  };
  reader_memory: Record<string, unknown>;
  presence: {
    trending_topics: number;
    pending_suggestions: number;
  };
  email: Record<string, unknown>;
}

// ── Suggestions ───────────────────────────────────

export interface Suggestion {
  id: string;
  topic: string;
  reason?: string;
  suggested_action?: string;
  status: 'pending' | 'approved' | 'rejected';
}

// ── WebSocket Events ──────────────────────────────

export type WsEvent =
  | 'pulse_beat'
  | 'new_suggestion'
  | 'service_status'
  | 'new_question'
  | 'your_question_answered'
  | 'chat_response'
  | 'crowdfunding_milestone';
