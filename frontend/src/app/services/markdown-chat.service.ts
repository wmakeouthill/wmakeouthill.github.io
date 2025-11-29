import { Injectable, inject } from '@angular/core';
import { MarkdownService } from './markdown.service';

@Injectable({
  providedIn: 'root'
})
export class MarkdownChatService {
  private readonly markdownService = inject(MarkdownService);

  async renderMarkdownToHtml(markdown: string): Promise<string> {
    try {
      const processedMarkdown = this.preprocessMarkdown(markdown);
      // Usa renderMarkdownToHtml completo com todas as funcionalidades (Mermaid, code blocks, etc.)
      const html = await this.markdownService.renderMarkdownToHtml(processedMarkdown, 'chat');
      const htmlWithLinks = this.convertUrlsToLinks(html);
      return this.applyChatStyles(htmlWithLinks);
    } catch (error) {
      console.error('Erro ao renderizar markdown:', error);
      return this.fallbackEscape(markdown);
    }
  }

  private preprocessMarkdown(markdown: string): string {
    markdown = this.processEmailPattern(markdown);
    markdown = this.processLinkedInPattern(markdown);
    markdown = this.processGitHubPattern(markdown);
    markdown = this.processWhatsAppPattern(markdown);
    markdown = this.processPhonePattern(markdown);
    return markdown;
  }

  private processEmailPattern(markdown: string): string {
    return markdown.replace(
      /(\*\*)?Email:(\*\*)?\s*([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi,
      (match, bold1, bold2, email) => {
        return `${bold1 || ''}Email:${bold2 || ''} [Email](mailto:${email})`;
      }
    );
  }

  private processLinkedInPattern(markdown: string): string {
    return markdown.replace(
      /(\*\*)?LinkedIn:(\*\*)?\s*(linkedin\.com\/[^\s\n]+|www\.linkedin\.com\/[^\s\n]+)/gi,
      (match, bold1, bold2, url) => {
        const fullUrl = url.startsWith('http') 
          ? url 
          : (url.startsWith('www.') ? `https://${url}` : `https://www.${url}`);
        return `${bold1 || ''}LinkedIn:${bold2 || ''} [LinkedIn](${fullUrl})`;
      }
    );
  }

  private processGitHubPattern(markdown: string): string {
    return markdown.replace(
      /(\*\*)?GitHub:(\*\*)?\s*(github\.com\/[^\s\n]+|www\.github\.com\/[^\s\n]+)/gi,
      (match, bold1, bold2, url) => {
        const fullUrl = url.startsWith('http') ? url : `https://${url}`;
        return `${bold1 || ''}GitHub:${bold2 || ''} [GitHub](${fullUrl})`;
      }
    );
  }

  private processWhatsAppPattern(markdown: string): string {
    return markdown.replace(
      /(\*\*)?WhatsApp:(\*\*)?\s*(wa\.me\/[^\s\n]+|api\.whatsapp\.com\/[^\s\n]+)/gi,
      (match, bold1, bold2, url) => {
        const fullUrl = url.startsWith('http') ? url : `https://${url}`;
        return `${bold1 || ''}WhatsApp:${bold2 || ''} [WhatsApp](${fullUrl})`;
      }
    );
  }

  private processPhonePattern(markdown: string): string {
    return markdown.replace(
      /(\*\*)?(Telefone|Celular):(\*\*)?\s*(\+55\s?\d{2}\s?\d{4,5}-?\d{4})/gi,
      (match, bold1, label, bold2, phone) => {
        const cleanPhone = phone.replace(/\s/g, '').replace(/-/g, '');
        return `${bold1 || ''}${label}:${bold2 || ''} [${phone}](https://wa.me/${cleanPhone})`;
      }
    );
  }

  private convertUrlsToLinks(html: string): string {
    html = this.convertEmailWithContext(html);
    html = this.convertLinkedInWithContext(html);
    html = this.convertGitHubWithContext(html);
    html = this.convertWhatsAppWithContext(html);
    html = this.convertPhoneWithContext(html);
    html = this.convertEmailWithoutContext(html);
    html = this.convertLinkedInWithoutContext(html);
    html = this.convertGitHubWithoutContext(html);
    html = this.convertPhoneWithoutContext(html);
    return html;
  }

  private convertEmailWithContext(html: string): string {
    return html.replace(
      /(\*\*)?Email:(\*\*)?\s*([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi,
      (match, bold1, bold2, email) => {
        const bold = bold1 ? '<strong>' : '';
        const boldEnd = bold1 ? '</strong>' : '';
        return `${bold}Email:${boldEnd} <a href="mailto:${email}" class="chat-link">Email</a>`;
      }
    );
  }

  private convertLinkedInWithContext(html: string): string {
    return html.replace(
      /(\*\*)?LinkedIn:(\*\*)?\s*(linkedin\.com\/[^\s<>"{}|\\^`\[\]]+|www\.linkedin\.com\/[^\s<>"{}|\\^`\[\]]+)/gi,
      (match, bold1, bold2, url) => {
        const bold = bold1 ? '<strong>' : '';
        const boldEnd = bold1 ? '</strong>' : '';
        const fullUrl = url.startsWith('http') 
          ? url 
          : (url.startsWith('www.') ? `https://${url}` : `https://www.${url}`);
        return `${bold}LinkedIn:${boldEnd} <a href="${fullUrl}" class="chat-link">LinkedIn</a>`;
      }
    );
  }

  private convertGitHubWithContext(html: string): string {
    return html.replace(
      /(\*\*)?GitHub:(\*\*)?\s*(github\.com\/[^\s<>"{}|\\^`\[\]]+|www\.github\.com\/[^\s<>"{}|\\^`\[\]]+)/gi,
      (match, bold1, bold2, url) => {
        const bold = bold1 ? '<strong>' : '';
        const boldEnd = bold1 ? '</strong>' : '';
        const fullUrl = url.startsWith('http') ? url : `https://${url}`;
        return `${bold}GitHub:${boldEnd} <a href="${fullUrl}" class="chat-link">GitHub</a>`;
      }
    );
  }

  private convertWhatsAppWithContext(html: string): string {
    return html.replace(
      /(\*\*)?WhatsApp:(\*\*)?\s*(wa\.me\/[^\s<>"{}|\\^`\[\]]+|api\.whatsapp\.com\/[^\s<>"{}|\\^`\[\]]+)/gi,
      (match, bold1, bold2, url) => {
        const bold = bold1 ? '<strong>' : '';
        const boldEnd = bold1 ? '</strong>' : '';
        const fullUrl = url.startsWith('http') ? url : `https://${url}`;
        return `${bold}WhatsApp:${boldEnd} <a href="${fullUrl}" class="chat-link">WhatsApp</a>`;
      }
    );
  }

  private convertPhoneWithContext(html: string): string {
    return html.replace(
      /(\*\*)?(Telefone|Celular):(\*\*)?\s*(\+55\s?\d{2}\s?\d{4,5}-?\d{4})/gi,
      (match, bold1, label, bold2, phone) => {
        const bold = bold1 ? '<strong>' : '';
        const boldEnd = bold1 ? '</strong>' : '';
        const cleanPhone = phone.replace(/\s/g, '').replace(/-/g, '');
        return `${bold}${label}:${boldEnd} <a href="https://wa.me/${cleanPhone}" class="chat-link">${phone}</a>`;
      }
    );
  }

  private convertEmailWithoutContext(html: string): string {
    const emailPattern = /([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/g;
    return html.replace(emailPattern, (email) => {
      if (html.includes(`href="mailto:${email}"`)) {
        return email;
      }
      return `<a href="mailto:${email}" class="chat-link">Email</a>`;
    });
  }

  private convertLinkedInWithoutContext(html: string): string {
    const linkedinPattern = /(linkedin\.com\/[^\s<>"{}|\\^`\[\]]+|www\.linkedin\.com\/[^\s<>"{}|\\^`\[\]]+)/gi;
    return html.replace(linkedinPattern, (url) => {
      if (this.isAlreadyLinked(html, url)) {
        return url;
      }
      const fullUrl = url.startsWith('http') 
        ? url 
        : (url.startsWith('www.') ? `https://${url}` : `https://www.${url}`);
      return `<a href="${fullUrl}" class="chat-link">LinkedIn</a>`;
    });
  }

  private convertGitHubWithoutContext(html: string): string {
    const githubPattern = /(github\.com\/[^\s<>"{}|\\^`\[\]]+|www\.github\.com\/[^\s<>"{}|\\^`\[\]]+)/gi;
    return html.replace(githubPattern, (url) => {
      if (this.isAlreadyLinked(html, url)) {
        return url;
      }
      const fullUrl = url.startsWith('http') ? url : `https://${url}`;
      return `<a href="${fullUrl}" class="chat-link">GitHub</a>`;
    });
  }

  private convertPhoneWithoutContext(html: string): string {
    const phoneRegex = /(\+55\s?\d{2}\s?\d{4,5}-?\d{4})/g;
    return html.replace(phoneRegex, (phone) => {
      const cleanPhone = phone.replace(/\s/g, '').replace(/-/g, '');
      if (html.includes(`href="https://wa.me/${cleanPhone}"`)) {
        return phone;
      }
      return `<a href="https://wa.me/${cleanPhone}" class="chat-link">${phone}</a>`;
    });
  }

  private isAlreadyLinked(html: string, url: string): boolean {
    return html.includes(`href="${url}"`) 
      || html.includes(`href="https://${url}"`) 
      || html.includes(`href="https://www.${url}"`);
  }

  private applyChatStyles(html: string): string {
    // Adiciona classes do chat sem remover classes markdown-text existentes
    return html
      .replace(/<a class="markdown-text"/g, '<a class="markdown-text chat-link" target="_blank" rel="noopener noreferrer"')
      .replace(/<a /g, '<a class="chat-link" target="_blank" rel="noopener noreferrer" ')
      .replace(/<p class="markdown-text">/g, '<p class="markdown-text chat-paragraph">')
      .replace(/<p>/g, '<p class="chat-paragraph">')
      .replace(/<strong class="markdown-text">/g, '<strong class="markdown-text chat-strong">')
      .replace(/<strong>/g, '<strong class="chat-strong">')
      .replace(/<em class="markdown-text">/g, '<em class="markdown-text chat-em">')
      .replace(/<em>/g, '<em class="chat-em">')
      .replace(/<ul class="markdown-text"/g, '<ul class="markdown-text chat-list"')
      .replace(/<ul(\s|>)/g, '<ul class="chat-list"$1')
      .replace(/<ol class="markdown-text"/g, '<ol class="markdown-text chat-list"')
      .replace(/<ol(\s|>)/g, '<ol class="chat-list"$1')
      .replace(/<li class="markdown-text"/g, '<li class="markdown-text chat-list-item"')
      .replace(/<li(\s|>)/g, '<li class="chat-list-item"$1');
  }

  private fallbackEscape(markdown: string): string {
    const escaped = markdown
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');
    const htmlWithLinks = this.convertUrlsToLinks(escaped);
    return this.applyChatStyles(htmlWithLinks);
  }
}

