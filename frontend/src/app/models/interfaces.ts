/**
 * Interfaces TypeScript para tipagem forte
 */

// Interface para linguagens do repositório
export interface LanguageInfo {
  name: string;
  percentage: number;
  color: string;
}

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
  size?: number;
  totalLanguageBytes?: number;
  languages?: LanguageInfo[]; // Array com todas as linguagens e suas porcentagens
  topics: string[];
  created_at: string;
  updated_at: string;
  pushed_at: string;
  fork: boolean; // Adicionada propriedade fork
}

// Interface para skills/tecnologias
export interface Skill {
  name: string;
  // level numérico foi substituído por uma label categórica para evitar autoavaliação precisa
  levelLabel?: 'Básico' | 'Intermediário' | 'Avançado' | 'Produção';
  category: 'frontend' | 'backend' | 'database' | 'devops' | 'other';
  icon?: string;
  // opcional: em quantos projetos essa skill foi utilizada (para evidência)
  projectsCount?: number;
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

// Interface para certificações (estática - legado)
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

// Interface para certificado PDF dinâmico (do GitHub)
export interface CertificadoPdf {
  /** Nome do arquivo (ex: "Diploma - Bacharel em Direito.pdf") */
  fileName: string;
  /** Nome formatado para exibição (ex: "Diploma - Bacharel em Direito") */
  displayName: string;
  /** URL para download direto do PDF */
  downloadUrl: string;
  /** URL da página do arquivo no GitHub */
  htmlUrl: string;
  /** Tamanho em bytes */
  size: number;
  /** SHA do arquivo (para cache) */
  sha: string;
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
