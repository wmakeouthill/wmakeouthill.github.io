import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Injectable({
    providedIn: 'root'
})
export class MarkdownService {

    constructor(private http: HttpClient) { }

    getReadmeContent(projectName: string): Observable<string> {
        // Mapear nomes de projetos para arquivos markdown
        const readmeFileName = this.getReadmeFileName(projectName);

        if (!readmeFileName) {
            return of('');
        }

        const readmePath = `assets/portfolio_md/${readmeFileName}`;

        return this.http.get(readmePath, { responseType: 'text' })
            .pipe(
                map(content => this.parseMarkdown(content)),
                catchError(error => {
                    console.error(`Erro ao carregar README para ${projectName}:`, error);
                    return of('');
                })
            );
    }

    private getReadmeFileName(projectName: string): string | null {
        // Mapear nomes de repositórios para nomes de arquivos markdown
        const projectMappings: { [key: string]: string } = {
            'fazenda-inhouse': 'README - Fazenda inhouse.md',
            'lol-matchmaking': 'README - LOL Matchmaking.md',
            // Adicione mais mapeamentos conforme necessário
        };

        // Tentar encontrar por nome exato
        if (projectMappings[projectName.toLowerCase()]) {
            return projectMappings[projectName.toLowerCase()];
        }

        // Tentar encontrar por nome similar
        const projectNameLower = projectName.toLowerCase();
        for (const [key, value] of Object.entries(projectMappings)) {
            if (projectNameLower.includes(key) || key.includes(projectNameLower)) {
                return value;
            }
        }

        return null;
    }

    private parseMarkdown(content: string): string {
        // Converter markdown básico para HTML de forma simples
        return content
            // Code blocks primeiro
            .replace(/```(\w+)?\n?([\s\S]*?)```/g, '<pre><code>$2</code></pre>')

            // Headers
            .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
            .replace(/^### (.*$)/gim, '<h3>$1</h3>')
            .replace(/^## (.*$)/gim, '<h2>$1</h2>')
            .replace(/^# (.*$)/gim, '<h1>$1</h1>')

            // Bold
            .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
            .replace(/__(.*?)__/g, '<strong>$1</strong>')

            // Italic
            .replace(/\*(.*?)\*/g, '<em>$1</em>')
            .replace(/_(.*?)_/g, '<em>$1</em>')

            // Inline code
            .replace(/`(.*?)`/g, '<code>$1</code>')

            // Links
            .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')

            // Lists
            .replace(/^\* (.*$)/gim, '<li>$1</li>')
            .replace(/^- (.*$)/gim, '<li>$1</li>')
            .replace(/^(\d+)\. (.*$)/gim, '<li>$2</li>')

            // Line breaks
            .replace(/\n\n/g, '</p><p>')
            .replace(/\n/g, '<br>')

            // Wrap in paragraphs
            .replace(/^(.*)$/gim, '<p>$1</p>')

            // Clean up empty paragraphs
            .replace(/<p><\/p>/g, '')
            .replace(/<p><br><\/p>/g, '')

            // Clean up list items
            .replace(/<p><li>/g, '<li>')
            .replace(/<\/li><\/p>/g, '</li>')

            // Wrap consecutive list items in ul/ol
            .replace(/(<li>.*<\/li>)(\s*<li>.*<\/li>)+/g, (match) => {
                return '<ul>' + match + '</ul>';
            });
    }
}
