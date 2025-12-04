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
    { name: 'Angular', levelLabel: 'Produção', projectsCount: 6, category: 'frontend', icon: 'angular.svg' },
    { name: 'TypeScript', levelLabel: 'Produção', projectsCount: 8, category: 'frontend', icon: 'typescript.svg' },
    { name: 'JavaScript', levelLabel: 'Produção', projectsCount: 10, category: 'frontend', icon: 'javascript.svg' },
    { name: 'HTML5', levelLabel: 'Produção', projectsCount: 10, category: 'frontend', icon: 'html5.svg' },
    { name: 'CSS3/SCSS', levelLabel: 'Produção', projectsCount: 10, category: 'frontend', icon: 'css3.svg' },
    { name: 'React', levelLabel: 'Avançado', projectsCount: 2, category: 'frontend', icon: 'react.svg' },
    { name: 'React Native', levelLabel: 'Avançado', projectsCount: 1, category: 'frontend', icon: 'react.svg' },
    { name: 'Electron', levelLabel: 'Avançado', projectsCount: 3, category: 'frontend', icon: 'electron.svg' },
    { name: 'Angular Material', levelLabel: 'Avançado', projectsCount: 3, category: 'frontend', icon: '⚡' },
    { name: 'RxJS', levelLabel: 'Avançado', projectsCount: 6, category: 'frontend', icon: '⚡' },
    { name: 'Chart.js', levelLabel: 'Avançado', projectsCount: 2, category: 'frontend', icon: '⚡' },
    { name: 'Socket.IO', levelLabel: 'Avançado', projectsCount: 3, category: 'frontend', icon: '⚡' },

    // Backend
    { name: 'Java', levelLabel: 'Produção', projectsCount: 5, category: 'backend', icon: 'java.svg' },
    { name: 'Spring Boot', levelLabel: 'Produção', projectsCount: 5, category: 'backend', icon: 'spring.svg' },
    { name: 'Spring Framework', levelLabel: 'Produção', projectsCount: 5, category: 'backend', icon: 'spring.svg' },
    { name: 'Node.js', levelLabel: 'Avançado', projectsCount: 2, category: 'backend', icon: 'nodejs.svg' },
    { name: 'Express.js', levelLabel: 'Avançado', projectsCount: 2, category: 'backend', icon: '⚡' },
    { name: 'Spring Security', levelLabel: 'Avançado', projectsCount: 4, category: 'backend', icon: '⚡' },
    { name: 'Spring Data JPA', levelLabel: 'Avançado', projectsCount: 5, category: 'backend', icon: '⚡' },
    { name: 'Hibernate', levelLabel: 'Avançado', projectsCount: 5, category: 'backend', icon: '⚡' },
    { name: 'JWT', levelLabel: 'Avançado', projectsCount: 4, category: 'backend', icon: '⚡' },
    { name: 'WebSockets', levelLabel: 'Avançado', projectsCount: 3, category: 'backend', icon: '⚡' },
    { name: 'Lombok', levelLabel: 'Avançado', projectsCount: 5, category: 'backend', icon: '⚡' },
    { name: 'MapStruct', levelLabel: 'Avançado', projectsCount: 3, category: 'backend', icon: '⚡' },
    { name: 'Python', levelLabel: 'Avançado', projectsCount: 3, category: 'backend', icon: 'python.svg' },
    { name: 'VBA', levelLabel: 'Avançado', projectsCount: 4, category: 'backend', icon: '⚡' },
    { name: 'Selenium', levelLabel: 'Avançado', projectsCount: 3, category: 'backend', icon: '⚡' },

    // Database
    { name: 'Oracle', levelLabel: 'Produção', projectsCount: 3, category: 'database', icon: 'oracle.svg' },
    { name: 'MySQL', levelLabel: 'Produção', projectsCount: 4, category: 'database', icon: 'mysql.svg' },
    { name: 'PostgreSQL', levelLabel: 'Avançado', projectsCount: 3, category: 'database', icon: 'postgres.svg' },
    { name: 'Cloud SQL', levelLabel: 'Avançado', projectsCount: 2, category: 'database', icon: 'cloud.svg' },
    { name: 'SQLite', levelLabel: 'Avançado', projectsCount: 2, category: 'database', icon: '⚡' },
    { name: 'H2', levelLabel: 'Intermediário', projectsCount: 2, category: 'database', icon: '⚡' },
    { name: 'Redis', levelLabel: 'Avançado', projectsCount: 2, category: 'database', icon: 'redis.svg' },
    { name: 'SQL', levelLabel: 'Produção', projectsCount: 8, category: 'database', icon: 'sql.svg' },
    { name: 'TypeORM', levelLabel: 'Intermediário', projectsCount: 1, category: 'database', icon: '⚡' },

    // DevOps & Tools
    { name: 'Docker', levelLabel: 'Produção', projectsCount: 6, category: 'devops', icon: 'docker.svg' },
    { name: 'Docker Compose', levelLabel: 'Avançado', projectsCount: 5, category: 'devops', icon: 'docker-compose.svg' },
    { name: 'Git', levelLabel: 'Produção', projectsCount: 12, category: 'devops', icon: 'git.svg' },
    { name: 'GitHub', levelLabel: 'Produção', projectsCount: 10, category: 'devops', icon: 'github.svg' },
    { name: 'GitLab', levelLabel: 'Produção', projectsCount: 4, category: 'devops', icon: 'gitlab.svg' },
    { name: 'Liquibase', levelLabel: 'Avançado', projectsCount: 4, category: 'devops', icon: 'liquibase.svg' },
    { name: 'Prometheus', levelLabel: 'Avançado', projectsCount: 3, category: 'devops', icon: 'prometheus.svg' },
    { name: 'Grafana', levelLabel: 'Avançado', projectsCount: 3, category: 'devops', icon: 'grafana.svg' },
    { name: 'Micrometer', levelLabel: 'Avançado', projectsCount: 3, category: 'devops', icon: 'micrometer.svg' },
    { name: 'AlertManager', levelLabel: 'Intermediário', projectsCount: 2, category: 'devops', icon: 'alertmanager.svg' },
    { name: 'Maven', levelLabel: 'Avançado', projectsCount: 5, category: 'devops', icon: 'maven.svg' },
    { name: 'Google Cloud Run', levelLabel: 'Avançado', projectsCount: 4, category: 'devops', icon: 'cloud.svg' },
    { name: 'Cloud Build', levelLabel: 'Avançado', projectsCount: 4, category: 'devops', icon: 'cloud.svg' },
    { name: 'Firebase Hosting', levelLabel: 'Intermediário', projectsCount: 1, category: 'devops', icon: 'firebase.svg' },
    { name: 'Secret Manager', levelLabel: 'Avançado', projectsCount: 4, category: 'devops', icon: 'cloud.svg' },
    { name: 'Kubernetes', levelLabel: 'Intermediário', projectsCount: 1, category: 'devops', icon: 'kubernetes.svg' },
    { name: 'Podman', levelLabel: 'Intermediário', projectsCount: 1, category: 'devops', icon: 'podman.svg' },
    { name: 'NGINX', levelLabel: 'Intermediário', projectsCount: 2, category: 'devops', icon: '⚡' },
    { name: 'CI/CD Pipeline', levelLabel: 'Avançado', projectsCount: 4, category: 'devops', icon: '⚡' },
    { name: 'electron-builder', levelLabel: 'Avançado', projectsCount: 3, category: 'devops', icon: '⚡' },
    { name: 'Spring Actuator', levelLabel: 'Avançado', projectsCount: 4, category: 'devops', icon: '⚡' },
    { name: 'Power BI', levelLabel: 'Avançado', projectsCount: 3, category: 'devops', icon: 'powerbi.svg' },
    { name: 'DAX', levelLabel: 'Avançado', projectsCount: 3, category: 'devops', icon: '⚡' }
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
