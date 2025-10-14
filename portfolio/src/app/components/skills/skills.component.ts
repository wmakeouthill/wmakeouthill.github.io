import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Skill } from '../../models/interfaces';

@Component({
  selector: 'app-skills',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './skills.component.html',
  styleUrl: './skills.component.css'
})
export class SkillsComponent {
  skills: Skill[] = [
  // Frontend
  { name: 'Angular', levelLabel: 'Produção', projectsCount: 4, category: 'frontend', icon: '🅰️' },
  { name: 'TypeScript', levelLabel: 'Produção', projectsCount: 6, category: 'frontend', icon: '📘' },
  { name: 'JavaScript', levelLabel: 'Produção', projectsCount: 8, category: 'frontend', icon: '📜' },
  { name: 'HTML5', levelLabel: 'Produção', projectsCount: 10, category: 'frontend', icon: '🌐' },
  { name: 'CSS3/SCSS', levelLabel: 'Produção', projectsCount: 9, category: 'frontend', icon: '🎨' },

    // Backend
  { name: 'Java', levelLabel: 'Produção', projectsCount: 3, category: 'backend', icon: '☕' },
  { name: 'Spring', levelLabel: 'Avançado', projectsCount: 3, category: 'backend', icon: '🌱' },
  { name: 'Spring Boot', levelLabel: 'Avançado', projectsCount: 3, category: 'backend', icon: '🚀' },
  { name: 'SQL', levelLabel: 'Produção', projectsCount: 6, category: 'backend', icon: '🗄️' },

    // Database
  { name: 'PostgreSQL', levelLabel: 'Avançado', projectsCount: 3, category: 'database', icon: '🐘' },
  { name: 'MySQL', levelLabel: 'Avançado', projectsCount: 3, category: 'database', icon: '🐬' },
  { name: 'Oracle', levelLabel: 'Avançado', projectsCount: 2, category: 'database', icon: '🔷' },

    // DevOps & Tools
    { name: 'Docker', levelLabel: 'Produção', projectsCount: 5, category: 'devops', icon: '🐳' },
    { name: 'Podman', levelLabel: 'Intermediário', projectsCount: 1, category: 'devops', icon: '📦' },
    { name: 'Kubernetes', levelLabel: 'Intermediário', projectsCount: 1, category: 'devops', icon: '☸️' },
    { name: 'Liquibase', levelLabel: 'Avançado', projectsCount: 2, category: 'devops', icon: '📜' },
    { name: 'Prometheus', levelLabel: 'Avançado', projectsCount: 2, category: 'devops', icon: '📈' },
    { name: 'Grafana', levelLabel: 'Avançado', projectsCount: 2, category: 'devops', icon: '📊' },
    { name: 'Micrometer', levelLabel: 'Intermediário', projectsCount: 1, category: 'devops', icon: '📏' },
    { name: 'AlertManager', levelLabel: 'Intermediário', projectsCount: 1, category: 'devops', icon: '🚨' },
    { name: 'Maven', levelLabel: 'Avançado', projectsCount: 3, category: 'devops', icon: '📦' },
    { name: 'Cloud', levelLabel: 'Intermediário', projectsCount: 1, category: 'devops', icon: '☁️' },
    { name: 'Electron', levelLabel: 'Intermediário', projectsCount: 1, category: 'other', icon: '⚡' },
    { name: 'Git', levelLabel: 'Produção', projectsCount: 10, category: 'devops', icon: '🌿' },
    { name: 'Docker Compose', levelLabel: 'Avançado', projectsCount: 4, category: 'devops', icon: '🧩' }
  ];

  categories = [
    { key: 'frontend', label: 'Frontend', icon: '💻' },
    { key: 'backend', label: 'Backend', icon: '⚙️' },
    { key: 'database', label: 'Database', icon: '🗄️' },
    { key: 'devops', label: 'DevOps & Tools', icon: '🛠️' }
  ];

  getSkillsByCategory(category: string): Skill[] {
    return this.skills.filter(skill => skill.category === category);
  }
}
