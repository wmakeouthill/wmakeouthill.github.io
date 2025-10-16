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
    { name: 'Angular', levelLabel: 'Produção', projectsCount: 4, category: 'frontend', icon: 'angular.svg' },
    { name: 'TypeScript', levelLabel: 'Produção', projectsCount: 6, category: 'frontend', icon: 'typescript.svg' },
    { name: 'JavaScript', levelLabel: 'Produção', projectsCount: 8, category: 'frontend', icon: 'javascript.svg' },
    { name: 'HTML5', levelLabel: 'Produção', projectsCount: 10, category: 'frontend', icon: 'html5.svg' },
    { name: 'CSS3/SCSS', levelLabel: 'Produção', projectsCount: 9, category: 'frontend', icon: 'css3.svg' },
    { name: 'Electron', levelLabel: 'Avançado', projectsCount: 3, category: 'frontend', icon: '⚡' },
    { name: 'Angular Material', levelLabel: 'Avançado', projectsCount: 2, category: 'frontend', icon: '⚡' },
    { name: 'RxJS', levelLabel: 'Avançado', projectsCount: 4, category: 'frontend', icon: '⚡' },
    { name: 'Chart.js', levelLabel: 'Intermediário', projectsCount: 1, category: 'frontend', icon: '⚡' },
    { name: 'Socket.IO', levelLabel: 'Avançado', projectsCount: 3, category: 'frontend', icon: '⚡' },

    // Backend
    { name: 'Java', levelLabel: 'Produção', projectsCount: 3, category: 'backend', icon: 'java.svg' },
    { name: 'Spring Boot', levelLabel: 'Avançado', projectsCount: 3, category: 'backend', icon: 'spring.svg' },
    { name: 'Node.js', levelLabel: 'Avançado', projectsCount: 2, category: 'backend', icon: '⚡' },
    { name: 'Express.js', levelLabel: 'Avançado', projectsCount: 2, category: 'backend', icon: '⚡' },
    { name: 'Spring Security', levelLabel: 'Avançado', projectsCount: 3, category: 'backend', icon: '⚡' },
    { name: 'Spring Data JPA', levelLabel: 'Avançado', projectsCount: 3, category: 'backend', icon: '⚡' },
    { name: 'Hibernate', levelLabel: 'Avançado', projectsCount: 3, category: 'backend', icon: '⚡' },
    { name: 'JWT', levelLabel: 'Avançado', projectsCount: 3, category: 'backend', icon: '⚡' },
    { name: 'WebSockets', levelLabel: 'Avançado', projectsCount: 3, category: 'backend', icon: '⚡' },

    // Database
    { name: 'PostgreSQL', levelLabel: 'Avançado', projectsCount: 3, category: 'database', icon: 'postgres.svg' },
    { name: 'MySQL', levelLabel: 'Avançado', projectsCount: 3, category: 'database', icon: 'mysql.svg' },
    { name: 'SQLite', levelLabel: 'Avançado', projectsCount: 2, category: 'database', icon: '⚡' },
    { name: 'H2', levelLabel: 'Intermediário', projectsCount: 2, category: 'database', icon: '⚡' },
    { name: 'Oracle', levelLabel: 'Avançado', projectsCount: 2, category: 'database', icon: 'oracle.svg' },
    { name: 'Redis', levelLabel: 'Avançado', projectsCount: 2, category: 'database', icon: 'redis.svg' },
    { name: 'SQL', levelLabel: 'Produção', projectsCount: 6, category: 'database', icon: 'sql.svg' },
    { name: 'TypeORM', levelLabel: 'Intermediário', projectsCount: 1, category: 'database', icon: '⚡' },

    // DevOps & Tools
    { name: 'Docker', levelLabel: 'Produção', projectsCount: 5, category: 'devops', icon: 'docker.svg' },
    { name: 'Docker Compose', levelLabel: 'Avançado', projectsCount: 4, category: 'devops', icon: 'docker-compose.svg' },
    { name: 'GitLab', levelLabel: 'Produção', projectsCount: 4, category: 'devops', icon: 'gitlab.svg' },
    { name: 'Podman', levelLabel: 'Intermediário', projectsCount: 1, category: 'devops', icon: 'podman.svg' },
    { name: 'Kubernetes', levelLabel: 'Intermediário', projectsCount: 1, category: 'devops', icon: 'kubernetes.svg' },
    { name: 'Liquibase', levelLabel: 'Avançado', projectsCount: 3, category: 'devops', icon: 'liquibase.svg' },
    { name: 'Prometheus', levelLabel: 'Avançado', projectsCount: 2, category: 'devops', icon: 'prometheus.svg' },
    { name: 'Grafana', levelLabel: 'Avançado', projectsCount: 2, category: 'devops', icon: 'grafana.svg' },
    { name: 'Micrometer', levelLabel: 'Intermediário', projectsCount: 1, category: 'devops', icon: 'micrometer.svg' },
    { name: 'AlertManager', levelLabel: 'Intermediário', projectsCount: 1, category: 'devops', icon: 'alertmanager.svg' },
    { name: 'Maven', levelLabel: 'Avançado', projectsCount: 3, category: 'devops', icon: 'maven.svg' },
    { name: 'Google Cloud Run', levelLabel: 'Intermediário', projectsCount: 2, category: 'devops', icon: 'cloud.svg' },
    { name: 'NGINX', levelLabel: 'Intermediário', projectsCount: 1, category: 'devops', icon: '⚡' },
    { name: 'CI/CD Pipeline', levelLabel: 'Intermediário', projectsCount: 2, category: 'devops', icon: '⚡' },
    { name: 'electron-builder', levelLabel: 'Intermediário', projectsCount: 2, category: 'devops', icon: '⚡' },
    { name: 'Git', levelLabel: 'Produção', projectsCount: 10, category: 'devops', icon: 'git.svg' }
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

  // helper para template: verifica se icon é um arquivo svg
  isSvg(icon?: string): boolean {
    return !!icon && icon.toLowerCase().endsWith('.svg');
  }

  pluralize(count: number, singular: string, plural: string) {
    return count > 1 ? plural : singular;
  }
}
