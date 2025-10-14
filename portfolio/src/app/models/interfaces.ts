/**
 * Interfaces TypeScript para tipagem forte
 */

// Interface para repositórios do GitHub
export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  topics: string[];
  created_at: string;
  updated_at: string;
  pushed_at: string;
  fork: boolean; // Adicionada propriedade fork
}

// Interface para skills/tecnologias
export interface Skill {
  name: string;
  level: number; // 1-100
  category: 'frontend' | 'backend' | 'database' | 'devops' | 'other';
  icon?: string;
}

// Interface para experiência profissional
export interface Experience {
  id: number;
  company: string;
  position: string;
  startDate: string;
  endDate: string | null; // null se ainda trabalha
  current: boolean;
  description: string;
  technologies: string[];
  // Lista de destaques formatados como bullets com título e texto
  highlights?: Array<{ title: string; text: string }>;
  location?: string;
}

// Interface para educação
export interface Education {
  id: number;
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string | null;
  current: boolean;
  description?: string;
  grade?: string;
}

// Interface para projetos
export interface Project {
  id: number;
  title: string;
  description: string;
  image: string;
  technologies: string[];
  githubUrl?: string;
  liveUrl?: string;
  stars?: number;
  featured?: boolean;
}

// Interface para certificações
export interface Certification {
  id: number;
  name: string;
  issuer: string;
  issueDate: string;
  expiryDate?: string | null;
  credentialId?: string;
  credentialUrl?: string;
  image?: string;
}

// Interface para informações pessoais
export interface PersonalInfo {
  name: string;
  title: string;
  tagline: string;
  bio: string[];
  location: string;
  email: string;
  phone?: string;
  website?: string;
  available: boolean;
  yearsOfExperience: number;
  image: string;
}

// Interface para redes sociais
export interface SocialLink {
  platform: string;
  url: string;
  icon: string;
  username?: string;
}

// Interface para dados de contato
export interface ContactForm {
  name: string;
  email: string;
  subject: string;
  message: string;
}

// Interface para navegação
export interface NavItem {
  label: string;
  section: string;
  active?: boolean;
}
