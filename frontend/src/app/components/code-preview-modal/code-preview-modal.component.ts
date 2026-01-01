import {
    Component,
    inject,
    input,
    output,
    signal,
    computed,
    effect,
    OnDestroy,
    ChangeDetectionStrategy,
    HostListener
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { HttpClient } from '@angular/common/http';
import { TranslatePipe } from '../../i18n/i18n.pipe';
import { resolveApiUrl } from '../../utils/api-url.util';
import { catchError, of } from 'rxjs';

/**
 * Representa um nó na árvore de arquivos do repositório.
 */
export interface TreeNode {
    name: string;
    path: string;
    type: 'file' | 'dir';
    children?: TreeNode[];
    expanded?: boolean;
    loading?: boolean;
}

/**
 * Representa uma aba aberta no visualizador de código.
 */
export interface FileTab {
    name: string;
    path: string;
    content: string;
    highlightedContent: SafeHtml;
    language: string;
    loading: boolean;
}

/**
 * Resposta do backend para a árvore do repositório.
 */
interface RepoTreeResponse {
    tree: TreeNodeResponse[];
}

interface TreeNodeResponse {
    path: string;
    type: 'blob' | 'tree';
    sha: string;
}

/**
 * Modal estilo IDE para visualização de código do repositório.
 * Exibe estrutura de pastas à esquerda e código com abas à direita.
 */
@Component({
    selector: 'app-code-preview-modal',
    standalone: true,
    imports: [CommonModule, TranslatePipe],
    templateUrl: './code-preview-modal.component.html',
    styleUrls: ['./code-preview-modal.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class CodePreviewModalComponent implements OnDestroy {
    private readonly http = inject(HttpClient);
    private readonly sanitizer = inject(DomSanitizer);

    // Inputs
    readonly isOpen = input<boolean>(false);
    readonly projectName = input<string>('');

    // Output
    readonly close = output<void>();

    // Estado interno
    readonly treeStructure = signal<TreeNode[]>([]);
    readonly openTabs = signal<FileTab[]>([]);
    readonly activeTabPath = signal<string>('');
    readonly loadingTree = signal<boolean>(false);
    readonly errorMessage = signal<string>('');

    // Resizable panel
    readonly panelWidth = signal<number>(240);
    readonly isDragging = signal<boolean>(false);
    private startX = 0;
    private startWidth = 0;

    // Computed para aba ativa
    readonly activeTab = computed(() => {
        const path = this.activeTabPath();
        return this.openTabs().find(tab => tab.path === path) || null;
    });

    constructor() {
        // Effect para carregar árvore quando modal abre
        effect(() => {
            const open = this.isOpen();
            const project = this.projectName();

            if (open && project) {
                this.loadRepositoryTree(project);
                this.loadHighlightJs();
                this.disableBodyScroll();
            } else {
                this.enableBodyScroll();
            }
        });
    }

    ngOnDestroy(): void {
        this.enableBodyScroll();
    }

    // Resize handlers
    startResize(event: MouseEvent): void {
        event.preventDefault();
        this.isDragging.set(true);
        this.startX = event.clientX;
        this.startWidth = this.panelWidth();
    }

    @HostListener('document:mousemove', ['$event'])
    onMouseMove(event: MouseEvent): void {
        if (!this.isDragging()) return;

        const deltaX = event.clientX - this.startX;
        const newWidth = Math.min(450, Math.max(150, this.startWidth + deltaX));
        this.panelWidth.set(newWidth);
    }

    @HostListener('document:mouseup')
    onMouseUp(): void {
        this.isDragging.set(false);
    }

    /**
     * Carrega highlight.js dinamicamente.
     */
    private loadHighlightJs(): void {
        if ((window as any).hljs) return;

        // Carregar CSS
        const linkEl = document.createElement('link');
        linkEl.rel = 'stylesheet';
        linkEl.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/vs2015.min.css';
        document.head.appendChild(linkEl);

        // Carregar JS
        const scriptEl = document.createElement('script');
        scriptEl.src = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js';
        scriptEl.onload = () => {
            // Carregar linguagens adicionais
            const languages = ['typescript', 'java', 'python', 'bash', 'yaml', 'properties', 'dockerfile'];
            languages.forEach(lang => {
                const langScript = document.createElement('script');
                langScript.src = `https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/${lang}.min.js`;
                document.head.appendChild(langScript);
            });
        };
        document.head.appendChild(scriptEl);
    }

    /**
     * Carrega a estrutura de diretórios do repositório.
     */
    private loadRepositoryTree(projectName: string): void {
        this.loadingTree.set(true);
        this.errorMessage.set('');
        this.treeStructure.set([]);
        this.openTabs.set([]);
        this.activeTabPath.set('');

        const apiUrl = resolveApiUrl(`/api/projects/${projectName.toLowerCase()}/tree`);

        this.http.get<RepoTreeResponse>(apiUrl).pipe(
            catchError(error => {
                console.error('Erro ao carregar árvore do repositório:', error);
                this.errorMessage.set('Erro ao carregar estrutura do projeto');
                return of({ tree: [] });
            })
        ).subscribe(response => {
            const tree = this.buildTreeFromFlatList(response.tree || []);
            this.treeStructure.set(tree);
            this.loadingTree.set(false);
        });
    }

    /**
     * Converte lista plana da API do GitHub em estrutura de árvore.
     */
    private buildTreeFromFlatList(flatList: TreeNodeResponse[]): TreeNode[] {
        const root: TreeNode[] = [];
        const pathMap = new Map<string, TreeNode>();

        // Ordenar: diretórios primeiro, depois arquivos, ambos alfabeticamente
        const sorted = [...flatList].sort((a, b) => {
            if (a.type !== b.type) {
                return a.type === 'tree' ? -1 : 1;
            }
            return a.path.localeCompare(b.path);
        });

        for (const item of sorted) {
            const parts = item.path.split('/');
            const name = parts[parts.length - 1];
            const isDir = item.type === 'tree';

            const node: TreeNode = {
                name,
                path: item.path,
                type: isDir ? 'dir' : 'file',
                children: isDir ? [] : undefined,
                expanded: false
            };

            pathMap.set(item.path, node);

            if (parts.length === 1) {
                root.push(node);
            } else {
                const parentPath = parts.slice(0, -1).join('/');
                const parent = pathMap.get(parentPath);
                if (parent && parent.children) {
                    parent.children.push(node);
                }
            }
        }

        this.sortTreeRecursive(root);
        return root;
    }

    /**
     * Ordena recursivamente a árvore (diretórios primeiro).
     */
    private sortTreeRecursive(nodes: TreeNode[]): void {
        nodes.sort((a, b) => {
            if (a.type !== b.type) {
                return a.type === 'dir' ? -1 : 1;
            }
            return a.name.localeCompare(b.name);
        });

        for (const node of nodes) {
            if (node.children) {
                this.sortTreeRecursive(node.children);
            }
        }
    }

    toggleDirectory(node: TreeNode): void {
        if (node.type !== 'dir') return;

        this.treeStructure.update(tree => {
            const updateNode = (nodes: TreeNode[]): TreeNode[] => {
                return nodes.map(n => {
                    if (n.path === node.path) {
                        return { ...n, expanded: !n.expanded };
                    }
                    if (n.children) {
                        return { ...n, children: updateNode(n.children) };
                    }
                    return n;
                });
            };
            return updateNode(tree);
        });
    }

    onFileClick(node: TreeNode): void {
        if (node.type !== 'file') return;

        const existingTab = this.openTabs().find(tab => tab.path === node.path);
        if (existingTab) {
            this.activeTabPath.set(node.path);
            return;
        }

        const newTab: FileTab = {
            name: node.name,
            path: node.path,
            content: '',
            highlightedContent: '',
            language: this.detectLanguage(node.name),
            loading: true
        };

        this.openTabs.update(tabs => [...tabs, newTab]);
        this.activeTabPath.set(node.path);
        this.loadFileContent(node.path);
    }

    private loadFileContent(filePath: string): void {
        const projectName = this.projectName();
        const apiUrl = resolveApiUrl(`/api/projects/${projectName.toLowerCase()}/contents?path=${encodeURIComponent(filePath)}`);

        this.http.get<{ content: string; name: string }>(apiUrl).pipe(
            catchError(error => {
                console.error('Erro ao carregar arquivo:', error);
                return of({ content: '// Erro ao carregar arquivo', name: filePath.split('/').pop() || '' });
            })
        ).subscribe(response => {
            this.openTabs.update(tabs => tabs.map(tab => {
                if (tab.path === filePath) {
                    const highlighted = this.highlightCode(response.content, tab.language);
                    return {
                        ...tab,
                        content: response.content,
                        highlightedContent: highlighted,
                        loading: false
                    };
                }
                return tab;
            }));
        });
    }

    /**
     * Aplica syntax highlighting ao código usando highlight.js.
     */
    private highlightCode(code: string, language: string): SafeHtml {
        const hljs = (window as any).hljs;

        if (hljs) {
            try {
                const result = language && hljs.getLanguage(language)
                    ? hljs.highlight(code, { language })
                    : hljs.highlightAuto(code);
                return this.sanitizer.bypassSecurityTrustHtml(this.addLineNumbers(result.value));
            } catch (e) {
                console.warn('Highlight.js error:', e);
            }
        }

        // Fallback sem highlighting
        return this.sanitizer.bypassSecurityTrustHtml(this.addLineNumbers(this.escapeHtml(code)));
    }

    private addLineNumbers(code: string): string {
        const lines = code.split('\n');
        return lines.map((line, i) =>
            `<span class="line-number">${i + 1}</span><span class="line-content">${line || ' '}</span>`
        ).join('\n');
    }

    private escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    private detectLanguage(filename: string): string {
        const ext = filename.split('.').pop()?.toLowerCase() || '';
        const langMap: Record<string, string> = {
            'ts': 'typescript', 'tsx': 'typescript',
            'js': 'javascript', 'jsx': 'javascript',
            'java': 'java', 'py': 'python', 'rb': 'ruby',
            'go': 'go', 'rs': 'rust', 'cpp': 'cpp', 'c': 'c', 'h': 'c',
            'cs': 'csharp', 'php': 'php',
            'html': 'xml', 'htm': 'xml', 'xml': 'xml',
            'css': 'css', 'scss': 'scss', 'sass': 'scss', 'less': 'less',
            'json': 'json', 'yaml': 'yaml', 'yml': 'yaml',
            'md': 'markdown', 'sql': 'sql',
            'sh': 'bash', 'bash': 'bash', 'zsh': 'bash',
            'dockerfile': 'dockerfile', 'properties': 'properties',
            'gradle': 'groovy', 'kt': 'kotlin', 'swift': 'swift'
        };
        return langMap[ext] || 'plaintext';
    }

    switchTab(tab: FileTab): void {
        this.activeTabPath.set(tab.path);
    }

    closeTab(tab: FileTab, event: Event): void {
        event.stopPropagation();
        const tabs = this.openTabs();
        const index = tabs.findIndex(t => t.path === tab.path);

        this.openTabs.update(t => t.filter(x => x.path !== tab.path));

        if (this.activeTabPath() === tab.path) {
            const newTabs = this.openTabs();
            if (newTabs.length > 0) {
                const newIndex = Math.min(index, newTabs.length - 1);
                this.activeTabPath.set(newTabs[newIndex].path);
            } else {
                this.activeTabPath.set('');
            }
        }
    }

    /**
     * Retorna SVG do ícone da pasta (estilo IntelliJ).
     */
    getFolderIconSvg(expanded: boolean): SafeHtml {
        const svg = expanded
            ? `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M1.5 3A1.5 1.5 0 0 1 3 1.5h3.379a1.5 1.5 0 0 1 1.06.44L8.561 3.06a.5.5 0 0 0 .354.147H13a1.5 1.5 0 0 1 1.5 1.5v7.793a1.5 1.5 0 0 1-1.5 1.5H3a1.5 1.5 0 0 1-1.5-1.5V3z" fill="#C7A556"/>
          <path d="M1.5 5.5h13v7a1.5 1.5 0 0 1-1.5 1.5H3a1.5 1.5 0 0 1-1.5-1.5v-7z" fill="#E8C866"/>
        </svg>`
            : `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <path d="M1.5 3A1.5 1.5 0 0 1 3 1.5h3.379a1.5 1.5 0 0 1 1.06.44L8.561 3.06a.5.5 0 0 0 .354.147H13a1.5 1.5 0 0 1 1.5 1.5v7.793a1.5 1.5 0 0 1-1.5 1.5H3a1.5 1.5 0 0 1-1.5-1.5V3z" fill="#8DA3BF"/>
        </svg>`;
        return this.sanitizer.bypassSecurityTrustHtml(svg);
    }

    /**
     * Retorna SVG do ícone do arquivo (estilo IntelliJ).
     */
    getFileIconSvg(filename: string): SafeHtml {
        const ext = filename.split('.').pop()?.toLowerCase() || '';
        const svg = this.getIconForExtension(ext, filename.toLowerCase());
        return this.sanitizer.bypassSecurityTrustHtml(svg);
    }

    private getIconForExtension(ext: string, filename: string): string {
        // TypeScript
        if (ext === 'ts' || ext === 'tsx') {
            return `<svg width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16" rx="2" fill="#3178C6"/><text x="8" y="11.5" text-anchor="middle" fill="white" font-size="8" font-weight="bold">TS</text></svg>`;
        }
        // JavaScript
        if (ext === 'js' || ext === 'jsx' || ext === 'mjs') {
            return `<svg width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16" rx="2" fill="#F7DF1E"/><text x="8" y="11.5" text-anchor="middle" fill="#323330" font-size="8" font-weight="bold">JS</text></svg>`;
        }
        // Java
        if (ext === 'java') {
            return `<svg width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16" rx="2" fill="#B07219"/><text x="8" y="11.5" text-anchor="middle" fill="white" font-size="7" font-weight="bold">☕</text></svg>`;
        }
        // Python
        if (ext === 'py') {
            return `<svg width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16" rx="2" fill="#3776AB"/><text x="8" y="11.5" text-anchor="middle" fill="#FFD43B" font-size="8" font-weight="bold">Py</text></svg>`;
        }
        // HTML
        if (ext === 'html' || ext === 'htm') {
            return `<svg width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16" rx="2" fill="#E34F26"/><text x="8" y="11" text-anchor="middle" fill="white" font-size="6" font-weight="bold">HTML</text></svg>`;
        }
        // CSS
        if (ext === 'css') {
            return `<svg width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16" rx="2" fill="#1572B6"/><text x="8" y="11" text-anchor="middle" fill="white" font-size="6" font-weight="bold">CSS</text></svg>`;
        }
        // SCSS/SASS
        if (ext === 'scss' || ext === 'sass') {
            return `<svg width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16" rx="2" fill="#CC6699"/><text x="8" y="11" text-anchor="middle" fill="white" font-size="5" font-weight="bold">SCSS</text></svg>`;
        }
        // JSON
        if (ext === 'json') {
            return `<svg width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16" rx="2" fill="#5B5B5B"/><text x="8" y="11" text-anchor="middle" fill="#F5D742" font-size="5" font-weight="bold">JSON</text></svg>`;
        }
        // Markdown
        if (ext === 'md' || ext === 'mdx') {
            return `<svg width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16" rx="2" fill="#083FA1"/><text x="8" y="11" text-anchor="middle" fill="white" font-size="6" font-weight="bold">MD</text></svg>`;
        }
        // YAML
        if (ext === 'yml' || ext === 'yaml') {
            return `<svg width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16" rx="2" fill="#CB171E"/><text x="8" y="11" text-anchor="middle" fill="white" font-size="5" font-weight="bold">YML</text></svg>`;
        }
        // XML
        if (ext === 'xml') {
            return `<svg width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16" rx="2" fill="#FF6600"/><text x="8" y="11" text-anchor="middle" fill="white" font-size="5" font-weight="bold">XML</text></svg>`;
        }
        // Properties
        if (ext === 'properties') {
            return `<svg width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16" rx="2" fill="#8B8B00"/><text x="8" y="11" text-anchor="middle" fill="white" font-size="4" font-weight="bold">PROP</text></svg>`;
        }
        // Shell
        if (ext === 'sh' || ext === 'bash' || ext === 'zsh') {
            return `<svg width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16" rx="2" fill="#4EAA25"/><text x="8" y="11" text-anchor="middle" fill="white" font-size="6" font-weight="bold">SH</text></svg>`;
        }
        // Docker
        if (ext === 'dockerfile' || filename === 'dockerfile') {
            return `<svg width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16" rx="2" fill="#2496ED"/><text x="8" y="11" text-anchor="middle" fill="white" font-size="7">🐳</text></svg>`;
        }
        // SQL
        if (ext === 'sql') {
            return `<svg width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16" rx="2" fill="#336791"/><text x="8" y="11" text-anchor="middle" fill="white" font-size="5" font-weight="bold">SQL</text></svg>`;
        }
        // Gitignore
        if (filename === '.gitignore' || ext === 'gitignore') {
            return `<svg width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16" rx="2" fill="#F05032"/><text x="8" y="11" text-anchor="middle" fill="white" font-size="7">G</text></svg>`;
        }
        // SVG
        if (ext === 'svg') {
            return `<svg width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16" rx="2" fill="#FFB13B"/><text x="8" y="11" text-anchor="middle" fill="white" font-size="5" font-weight="bold">SVG</text></svg>`;
        }
        // Images
        if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'ico'].includes(ext)) {
            return `<svg width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16" rx="2" fill="#A85BDD"/><text x="8" y="11" text-anchor="middle" fill="white" font-size="6" font-weight="bold">IMG</text></svg>`;
        }
        // Gradle
        if (ext === 'gradle') {
            return `<svg width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16" rx="2" fill="#02303A"/><text x="8" y="11" text-anchor="middle" fill="#69B3A2" font-size="7">G</text></svg>`;
        }
        // Kotlin
        if (ext === 'kt' || ext === 'kts') {
            return `<svg width="16" height="16" viewBox="0 0 16 16"><rect width="16" height="16" rx="2" fill="#7F52FF"/><text x="8" y="11" text-anchor="middle" fill="white" font-size="8" font-weight="bold">K</text></svg>`;
        }
        // Default file
        return `<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
      <path d="M3 1.5A1.5 1.5 0 0 1 4.5 0h5.086a1.5 1.5 0 0 1 1.06.44l2.415 2.414A1.5 1.5 0 0 1 13.5 3.914V14.5a1.5 1.5 0 0 1-1.5 1.5h-7.5A1.5 1.5 0 0 1 3 14.5V1.5z" fill="#8DA3BF"/>
      <path d="M9.5 0v2.5A1.5 1.5 0 0 0 11 4h2.5" fill="#6B7C93"/>
    </svg>`;
    }

    /**
     * Retorna ícone para tipo de arquivo (usado nas tabs).
     */
    getFileIcon(node: TreeNode): string {
        // Fallback para emojis se SVG não funcionar
        if (node.type === 'dir') {
            return node.expanded ? '📂' : '📁';
        }
        return '📄';
    }

    closeModal(): void {
        this.close.emit();
    }

    onKeyDown(event: KeyboardEvent): void {
        if (event.key === 'Escape') {
            this.closeModal();
        }
    }

    private disableBodyScroll(): void {
        document.body.style.overflow = 'hidden';
    }

    private enableBodyScroll(): void {
        document.body.style.overflow = '';
    }
}
