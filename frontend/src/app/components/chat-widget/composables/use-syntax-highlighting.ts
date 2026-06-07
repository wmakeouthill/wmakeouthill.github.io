import { ElementRef } from '@angular/core';
import { ensurePrism } from '../../../utils/prism-loader.util';

export function useSyntaxHighlighting(
  messagesContainer: ElementRef<HTMLDivElement> | undefined
): void {
  setTimeout(async () => {
    const container = messagesContainer?.nativeElement;
    if (!container) {
      return;
    }

    const Prism = await ensurePrism();
    if (!Prism) {
      return;
    }

    const codeBlocks = container.querySelectorAll('pre code:not([data-prism-processed])');
    codeBlocks.forEach((codeBlockElement) => {
      const codeBlock = codeBlockElement as HTMLElement;

      if (!codeBlock.className.includes('language-')) {
        const parentDiv = codeBlock.closest('.code-block-enhanced');
        const languageSpan = parentDiv?.querySelector('.code-language');

        if (languageSpan) {
          const language = languageSpan.textContent?.toLowerCase().trim() || 'text';
          codeBlock.className = `language-${language}`;
        } else {
          codeBlock.className = detectLanguageFromCode(codeBlock.textContent || '');
        }
      }

      try {
        Prism.highlightElement(codeBlock, false);
      } catch (error) {
        console.warn('Erro ao aplicar syntax highlighting:', error);
      }
    });
  }, 100);
}

function detectLanguageFromCode(codeText: string): string {
  if (codeText.trim().startsWith('{') || codeText.includes('function') || codeText.includes('const ')) {
    return 'language-javascript';
  }
  if (codeText.includes('public class') || codeText.includes('@')) {
    return 'language-java';
  }
  if (codeText.includes('import ') || codeText.includes('export ')) {
    return 'language-typescript';
  }
  return 'language-text';
}

