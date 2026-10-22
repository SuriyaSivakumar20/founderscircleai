
export type UserRole = 'FOUNDER' | 'INVESTOR' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  industry?: string;
  stage?: string;
  location?: string;
  description?: string;
  avatar?: string;
  website?: string;
  teamSize?: number;
  foundedYear?: number;
  vettingScore?: number;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  createdAt: string;
}
