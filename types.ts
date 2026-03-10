
export type UserRole = 'FOUNDER' | 'INVESTOR' | 'ADMIN';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  industry?: string;
  description?: string;
  avatar?: string;
  website?: string;
  createdAt: string;
}

export interface Company {
  id: string;
  name: string;
  industry: string;
  description: string;
  location: string;
  avatar?: string;
  website: string;
  linkedinUrl?: string;
  isPublicEntity: boolean;
}

export interface Investor {
  id: string;
  name: string;
  description: string;
  location: string;
  avatar?: string;
  website: string;
  linkedinUrl?: string;
  isPublicEntity: boolean;
}

export interface Post {
  id: string;
  content: string;
  image?: string;
  createdAt: string;
  authorId: string;
  author: {
    id: string;
    name: string;
    avatar?: string;
    role: string;
  };
  referencedCompanyId?: string;
  referencedCompany?: Company;
  referencedInvestorId?: string;
  referencedInvestor?: Investor;
  likes: { userId: string }[];
  comments: Comment[];
}

export interface Comment {
  id: string;
  content: string;
  userId: string;
  postId: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    avatar?: string;
  };
}

export interface ChatMessage {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  createdAt: string;
}

// Keeping legacy Profile for compatibility during migration if needed
export interface Profile {
  id: string;
  role: string;
  name: string;
  industry: string;
  description: string;
  avatar: string;
  website?: string;
}
