import { ChangeDetectionStrategy, Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Skill } from '../../models/interfaces';
import { TranslatePipe } from '../../i18n/i18n.pipe';

@Component({
  selector: 'app-skills',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, TranslatePipe],
  templateUrl: './skills.component.html',
  styleUrl: './skills.component.css'
})
export class SkillsComponent {
  skills: Skill[] = [
    // Architecture & Principles
    { name: 'Clean Architecture', levelKey: 'production', projectsCount: 5, category: 'architecture', icon: 'spring.svg' },
    { name: 'SOLID', levelKey: 'production', projectsCount: 5, category: 'architecture', icon: 'java.svg' },
    { name: 'DDD', levelKey: 'production', projectsCount: 4, category: 'architecture', icon: 'spring.svg' },
    { name: 'DRY / KISS / YAGNI', levelKey: 'production', projectsCount: 6, category: 'architecture', icon: 'typescript.svg' },
    { name: 'Design Patterns', levelKey: 'production', projectsCount: 5, category: 'architecture', icon: 'java.svg' },
    { name: 'OWASP Top 10', levelKey: 'advanced', projectsCount: 3, category: 'architecture', icon: 'spring.svg' },
    { name: 'ACID', levelKey: 'production', projectsCount: 4, category: 'architecture', icon: 'sql.svg' },
    { name: 'Hexagonal / Ports & Adapters', levelKey: 'advanced', projectsCount: 3, category: 'architecture', icon: 'spring.svg' },
    { name: 'RESTful APIs', levelKey: 'production', projectsCount: 6, category: 'architecture', icon: 'spring.svg' },
    { name: 'RBAC', levelKey: 'production', projectsCount: 4, category: 'architecture', icon: 'spring.svg' },

    // Frontend
    { name: 'Angular', levelKey: 'production', projectsCount: 6, category: 'frontend', icon: 'angular.svg' },
    { name: 'TypeScript', levelKey: 'production', projectsCount: 8, category: 'frontend', icon: 'typescript.svg' },
    { name: 'JavaScript', levelKey: 'production', projectsCount: 10, category: 'frontend', icon: 'javascript.svg' },
    { name: 'HTML5', levelKey: 'production', projectsCount: 10, category: 'frontend', icon: 'html5.svg' },
    { name: 'CSS3/SCSS', levelKey: 'production', projectsCount: 10, category: 'frontend', icon: 'css3.svg' },
    { name: 'React', levelKey: 'advanced', projectsCount: 2, category: 'frontend', icon: 'react.svg' },
    { name: 'React Native', levelKey: 'advanced', projectsCount: 1, category: 'frontend', icon: 'react.svg' },
    { name: 'Electron', levelKey: 'advanced', projectsCount: 3, category: 'frontend', icon: 'electron.svg' },
    { name: 'Angular Material', levelKey: 'production', projectsCount: 3, category: 'frontend', icon: 'angular.svg' },
    { name: 'RxJS', levelKey: 'production', projectsCount: 6, category: 'frontend', icon: 'angular.svg' },
    { name: 'Chart.js', levelKey: 'advanced', projectsCount: 2, category: 'frontend', icon: 'chartjs.svg' },
    { name: 'Socket.IO', levelKey: 'advanced', projectsCount: 3, category: 'frontend', icon: 'nodejs.svg' },
    { name: 'Google Maps API', levelKey: 'advanced', projectsCount: 2, category: 'frontend', icon: 'google-maps.svg' },
    { name: 'PWA', levelKey: 'advanced', projectsCount: 2, category: 'frontend', icon: 'pwa.svg' },
    { name: 'SSE (Server-Sent Events)', levelKey: 'advanced', projectsCount: 2, category: 'frontend', icon: 'live-streaming-icon.svg' },
    { name: 'Chrome Extension (MV3)', levelKey: 'advanced', projectsCount: 1, category: 'frontend', icon: 'chrome.svg' },
    { name: 'Angular Signals/Zoneless', levelKey: 'production', projectsCount: 4, category: 'frontend', icon: 'angular.svg' },

    // Backend
    { name: 'Java', levelKey: 'production', projectsCount: 5, category: 'backend', icon: 'java.svg' },
    { name: 'Spring Boot', levelKey: 'production', projectsCount: 5, category: 'backend', icon: 'spring.svg' },
    { name: 'Spring Framework', levelKey: 'production', projectsCount: 5, category: 'backend', icon: 'spring.svg' },
    { name: 'Node.js', levelKey: 'advanced', projectsCount: 2, category: 'backend', icon: 'nodejs.svg' },
    { name: 'Express.js', levelKey: 'advanced', projectsCount: 2, category: 'backend', icon: 'express.svg' },
    { name: 'Spring Security', levelKey: 'production', projectsCount: 4, category: 'backend', icon: 'spring.svg' },
    { name: 'Spring Data JPA', levelKey: 'production', projectsCount: 5, category: 'backend', icon: 'spring.svg' },
    { name: 'Hibernate', levelKey: 'production', projectsCount: 5, category: 'backend', icon: 'spring.svg' },
    { name: 'JWT', levelKey: 'production', projectsCount: 4, category: 'backend', icon: 'jwt.svg' },
    { name: 'WebSockets', levelKey: 'production', projectsCount: 3, category: 'backend', icon: 'spring.svg' },
    { name: 'Lombok', levelKey: 'production', projectsCount: 5, category: 'backend', icon: 'lombok.svg' },
    { name: 'MapStruct', levelKey: 'production', projectsCount: 3, category: 'backend', icon: 'java.svg' },
    { name: 'Python', levelKey: 'advanced', projectsCount: 3, category: 'backend', icon: 'python.svg' },
    { name: 'VBA', levelKey: 'advanced', projectsCount: 4, category: 'backend', icon: 'vba.svg' },
    { name: 'Selenium', levelKey: 'advanced', projectsCount: 3, category: 'backend', icon: 'selenium.svg' },
    { name: 'OAuth 2.0 (Google)', levelKey: 'advanced', projectsCount: 2, category: 'backend', icon: 'google.svg' },
    { name: 'OAuth 2.0', levelKey: 'advanced', projectsCount: 3, category: 'backend', icon: 'oauth.svg' },

    // Database
    { name: 'Oracle', levelKey: 'production', projectsCount: 3, category: 'database', icon: 'oracle.svg' },
    { name: 'MySQL', levelKey: 'production', projectsCount: 4, category: 'database', icon: 'mysql.svg' },
    { name: 'PostgreSQL', levelKey: 'advanced', projectsCount: 3, category: 'database', icon: 'postgres.svg' },
    { name: 'Cloud SQL', levelKey: 'advanced', projectsCount: 2, category: 'database', icon: 'cloud.svg' },
    { name: 'SQLite', levelKey: 'advanced', projectsCount: 2, category: 'database', icon: 'database.svg' },
    { name: 'H2', levelKey: 'intermediate', projectsCount: 2, category: 'database', icon: 'database.svg' },
    { name: 'Redis', levelKey: 'advanced', projectsCount: 2, category: 'database', icon: 'redis.svg' },
    { name: 'SQL', levelKey: 'production', projectsCount: 8, category: 'database', icon: 'sql.svg' },
    { name: 'TypeORM', levelKey: 'intermediate', projectsCount: 1, category: 'database', icon: 'typescript.svg' },

    // DevOps & Tools
    { name: 'Docker', levelKey: 'production', projectsCount: 6, category: 'devops', icon: 'docker.svg' },
    { name: 'Docker Compose', levelKey: 'advanced', projectsCount: 5, category: 'devops', icon: 'docker-compose.svg' },
    { name: 'Git', levelKey: 'production', projectsCount: 12, category: 'devops', icon: 'git.svg' },
    { name: 'GitHub', levelKey: 'production', projectsCount: 10, category: 'devops', icon: 'github.svg' },
    { name: 'GitLab', levelKey: 'production', projectsCount: 4, category: 'devops', icon: 'gitlab.svg' },
    { name: 'Liquibase', levelKey: 'production', projectsCount: 4, category: 'devops', icon: 'liquibase.svg' },
    { name: 'Prometheus', levelKey: 'advanced', projectsCount: 3, category: 'devops', icon: 'prometheus.svg' },
    { name: 'Grafana', levelKey: 'advanced', projectsCount: 3, category: 'devops', icon: 'grafana.svg' },
    { name: 'Micrometer', levelKey: 'advanced', projectsCount: 3, category: 'devops', icon: 'micrometer.svg' },
    { name: 'AlertManager', levelKey: 'intermediate', projectsCount: 2, category: 'devops', icon: 'alertmanager.svg' },
    { name: 'Maven', levelKey: 'production', projectsCount: 5, category: 'devops', icon: 'maven.svg' },
    { name: 'Google Cloud Run', levelKey: 'advanced', projectsCount: 4, category: 'devops', icon: 'cloud.svg' },
    { name: 'Cloud Build', levelKey: 'advanced', projectsCount: 4, category: 'devops', icon: 'cloud.svg' },
    { name: 'Firebase Hosting', levelKey: 'intermediate', projectsCount: 1, category: 'devops', icon: 'firebase.svg' },
    { name: 'Secret Manager', levelKey: 'advanced', projectsCount: 4, category: 'devops', icon: 'cloud.svg' },
    { name: 'Kubernetes', levelKey: 'intermediate', projectsCount: 1, category: 'devops', icon: 'kubernetes.svg' },
    { name: 'Podman', levelKey: 'intermediate', projectsCount: 1, category: 'devops', icon: 'podman.svg' },
    { name: 'NGINX', levelKey: 'intermediate', projectsCount: 2, category: 'devops', icon: 'nginx.svg' },
    { name: 'CI/CD Pipeline', levelKey: 'advanced', projectsCount: 4, category: 'devops', icon: 'gitlab.svg' },
    { name: 'electron-builder', levelKey: 'advanced', projectsCount: 3, category: 'devops', icon: 'electron.svg' },
    { name: 'Spring Actuator', levelKey: 'advanced', projectsCount: 4, category: 'devops', icon: 'spring.svg' },
    { name: 'Power BI', levelKey: 'advanced', projectsCount: 3, category: 'devops', icon: 'powerbi.svg' },
    { name: 'DAX', levelKey: 'advanced', projectsCount: 3, category: 'devops', icon: 'powerbi.svg' }
  ];

  categories = [
    { key: 'architecture', labelKey: 'skills.architecture', icon: '🏗️' },
    { key: 'frontend', labelKey: 'skills.frontend', icon: '💻' },
    { key: 'backend', labelKey: 'skills.backend', icon: '⚙️' },
    { key: 'database', labelKey: 'skills.database', icon: '🗄️' },
    { key: 'devops', labelKey: 'skills.devops', icon: '🛠️' }
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
