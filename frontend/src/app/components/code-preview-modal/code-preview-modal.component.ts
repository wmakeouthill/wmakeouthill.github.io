import {
    Component,
    inject,
    input,
    output,
    signal,
    computed,
    effect,
    OnDestroy,
    ChangeDetectionStrategy
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
                this.disableBodyScroll();
            } else {
                this.enableBodyScroll();
            }
        });
    }

    ngOnDestroy(): void {
        this.enableBodyScroll();
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
                // Nível raiz
                root.push(node);
            } else {
                // Encontrar pai
                const parentPath = parts.slice(0, -1).join('/');
                const parent = pathMap.get(parentPath);
                if (parent && parent.children) {
                    parent.children.push(node);
                }
            }
        }

        // Ordenar filhos de cada diretório
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

    /**
     * Alterna expansão de um diretório.
     */
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

    /**
     * Abre um arquivo em uma nova aba ou foca na aba existente.
     */
    onFileClick(node: TreeNode): void {
        if (node.type !== 'file') return;

        // Verificar se aba já existe
        const existingTab = this.openTabs().find(tab => tab.path === node.path);
        if (existingTab) {
            this.activeTabPath.set(node.path);
            return;
        }

        // Criar nova aba com loading
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

        // Carregar conteúdo do arquivo
        this.loadFileContent(node.path);
    }

    /**
     * Carrega conteúdo de um arquivo do repositório.
     */
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
     * Aplica syntax highlighting ao código.
     */
    private highlightCode(code: string, language: string): SafeHtml {
        // Se PrismJS estiver disponível, usar para highlighting
        if (typeof (window as any).Prism !== 'undefined') {
            try {
                const prism = (window as any).Prism;
                const grammar = prism.languages[language] || prism.languages.plaintext;
                const highlighted = prism.highlight(code, grammar, language);
                return this.sanitizer.bypassSecurityTrustHtml(this.addLineNumbers(highlighted));
            } catch {
                return this.sanitizer.bypassSecurityTrustHtml(this.addLineNumbers(this.escapeHtml(code)));
            }
        }

        // Fallback: apenas escape HTML e adicionar números de linha
        return this.sanitizer.bypassSecurityTrustHtml(this.addLineNumbers(this.escapeHtml(code)));
    }

    /**
     * Adiciona números de linha ao código.
     */
    private addLineNumbers(code: string): string {
        const lines = code.split('\n');
        return lines.map((line, i) =>
            `<span class="line-number">${i + 1}</span><span class="line-content">${line}</span>`
        ).join('\n');
    }

    /**
     * Escapa HTML para exibição segura.
     */
    private escapeHtml(text: string): string {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Detecta linguagem baseado na extensão do arquivo.
     */
    private detectLanguage(filename: string): string {
        const ext = filename.split('.').pop()?.toLowerCase() || '';
        const langMap: Record<string, string> = {
            'ts': 'typescript',
            'tsx': 'typescript',
            'js': 'javascript',
            'jsx': 'javascript',
            'java': 'java',
            'py': 'python',
            'rb': 'ruby',
            'go': 'go',
            'rs': 'rust',
            'cpp': 'cpp',
            'c': 'c',
            'h': 'c',
            'cs': 'csharp',
            'php': 'php',
            'html': 'html',
            'htm': 'html',
            'css': 'css',
            'scss': 'scss',
            'sass': 'sass',
            'less': 'less',
            'json': 'json',
            'xml': 'xml',
            'yaml': 'yaml',
            'yml': 'yaml',
            'md': 'markdown',
            'sql': 'sql',
            'sh': 'bash',
            'bash': 'bash',
            'zsh': 'bash',
            'ps1': 'powershell',
            'dockerfile': 'docker',
            'gradle': 'groovy',
            'kt': 'kotlin',
            'swift': 'swift',
            'vue': 'vue',
            'svelte': 'svelte'
        };

        return langMap[ext] || 'plaintext';
    }

    /**
     * Alterna para uma aba específica.
     */
    switchTab(tab: FileTab): void {
        this.activeTabPath.set(tab.path);
    }

    /**
     * Fecha uma aba.
     */
    closeTab(tab: FileTab, event: Event): void {
        event.stopPropagation();

        const tabs = this.openTabs();
        const index = tabs.findIndex(t => t.path === tab.path);

        // Remover aba
        this.openTabs.update(t => t.filter(x => x.path !== tab.path));

        // Se era a aba ativa, mudar para outra
        if (this.activeTabPath() === tab.path) {
            const newTabs = this.openTabs();
            if (newTabs.length > 0) {
                // Preferir aba anterior, se não existir, usar a próxima
                const newIndex = Math.min(index, newTabs.length - 1);
                this.activeTabPath.set(newTabs[newIndex].path);
            } else {
                this.activeTabPath.set('');
            }
        }
    }

    /**
     * Retorna ícone para tipo de arquivo.
     */
    getFileIcon(node: TreeNode): string {
        if (node.type === 'dir') {
            return node.expanded ? '📂' : '📁';
        }

        const ext = node.name.split('.').pop()?.toLowerCase() || '';
        const iconMap: Record<string, string> = {
            'ts': '🔷',
            'tsx': '⚛️',
            'js': '🟨',
            'jsx': '⚛️',
            'java': '☕',
            'py': '🐍',
            'html': '🌐',
            'css': '🎨',
            'scss': '🎨',
            'json': '📋',
            'md': '📝',
            'yml': '⚙️',
            'yaml': '⚙️',
            'xml': '📄',
            'sql': '🗃️',
            'sh': '💻',
            'dockerfile': '🐳',
            'gitignore': '👁️',
            'env': '🔐',
            'svg': '🖼️',
            'png': '🖼️',
            'jpg': '🖼️',
            'jpeg': '🖼️',
            'gif': '🖼️'
        };

        return iconMap[ext] || '📄';
    }

    /**
     * Fecha o modal.
     */
    closeModal(): void {
        this.close.emit();
    }

    /**
     * Handler para tecla ESC.
     */
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
