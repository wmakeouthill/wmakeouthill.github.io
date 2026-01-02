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
    /** Para package compaction - mostra path completo colapsado */
    displayName?: string;
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
    readonly panelWidth = signal<number>(260);
    readonly isDragging = signal<boolean>(false);
    private startX = 0;
    private startWidth = 0;

    // Computed para aba ativa
    readonly activeTab = computed(() => {
        const path = this.activeTabPath();
        return this.openTabs().find(tab => tab.path === path) || null;
    });

    constructor() {
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
        const newWidth = Math.min(500, Math.max(180, this.startWidth + deltaX));
        this.panelWidth.set(newWidth);
    }

    @HostListener('document:mouseup')
    onMouseUp(): void {
        this.isDragging.set(false);
    }

    /**
     * Carrega highlight.js com tema Dracula (similar ao IntelliJ Darcula).
     */
    private loadHighlightJs(): void {
        if ((window as any).hljs) return;

        // Tema Dracula (mais próximo do IntelliJ Darcula)
        const linkEl = document.createElement('link');
        linkEl.rel = 'stylesheet';
        linkEl.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github-dark.min.css';
        document.head.appendChild(linkEl);

        const scriptEl = document.createElement('script');
        scriptEl.src = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js';
        scriptEl.onload = () => {
            const languages = [
                'typescript', 'java', 'javascript', 'python', 'bash',
                'yaml', 'properties', 'dockerfile', 'kotlin', 'groovy',
                'xml', 'json', 'css', 'scss', 'sql', 'markdown'
            ];
            let loaded = 0;
            languages.forEach(lang => {
                const langScript = document.createElement('script');
                langScript.src = `https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/languages/${lang}.min.js`;
                langScript.onload = () => {
                    loaded++;
                    if (loaded === languages.length) {
                        console.log('✅ Highlight.js loaded with all languages');
                        this.rehighlightOpenTabs();
                    }
                };
                langScript.onerror = () => {
                    loaded++;
                    console.warn(`⚠️ Could not load language: ${lang}`);
                };
                document.head.appendChild(langScript);
            });
        };
        document.head.appendChild(scriptEl);
    }

    /**
     * Reprocessa syntax highlighting das abas abertas.
     */
    private rehighlightOpenTabs(): void {
        this.openTabs.update(tabs => tabs.map(tab => {
            if (!tab.loading && tab.content) {
                const highlighted = this.highlightCode(tab.content, tab.language);
                return { ...tab, highlightedContent: highlighted };
            }
            return tab;
        }));
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
            let tree = this.buildTreeFromFlatList(response.tree || []);
            // Aplicar package compaction (juntar pastas com um único filho)
            tree = this.compactTree(tree);
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
     * Package Compaction estilo IntelliJ:
     * - Pastas estruturais (src, main, java, resources, test, target) NUNCA são compactadas
     * - Apenas pacotes Java (pastas dentro de java/) são compactados com ponto (.)
     */
    private compactTree(nodes: TreeNode[], parentPath = ''): TreeNode[] {
        return nodes.map(node => {
            if (node.type === 'dir' && node.children) {
                // Primeiro, compactar filhos recursivamente
                node.children = this.compactTree(node.children, node.path);

                // Verificar se ESTE nó pode ser compactado (não é estrutural)
                // E se tem exatamente um filho que é diretório
                if (this.canCompact(node) &&
                    node.children.length === 1 &&
                    node.children[0].type === 'dir' &&
                    this.canCompact(node.children[0])) {

                    const child = node.children[0];

                    // Verificar se estamos dentro de java/ para usar ponto
                    const isJavaPackage = this.isJavaPackageFolder(node.path);
                    const separator = isJavaPackage ? '.' : '/';

                    const currentDisplayName = node.displayName || node.name;
                    const childDisplayName = child.displayName || child.name;
                    const compactedName = `${currentDisplayName}${separator}${childDisplayName}`;

                    return {
                        ...child,
                        displayName: compactedName,
                        children: child.children
                    };
                }
            }
            return node;
        });
    }

    /**
     * Lista de pastas estruturais que NUNCA devem ser compactadas.
     */
    private readonly STRUCTURAL_FOLDERS = new Set([
        'src', 'main', 'test', 'java', 'kotlin', 'scala', 'groovy',
        'resources', 'webapp', 'target', 'build', 'out', 'bin',
        'node_modules', 'dist', '.git', '.github', '.idea', '.vscode',
        'frontend', 'backend', 'container', 'docker', 'scripts',
        'META-INF', 'WEB-INF'
    ]);

    /**
     * Verifica se uma pasta pode ser compactada (não é estrutural).
     */
    private canCompact(node: TreeNode): boolean {
        // Pastas estruturais não podem ser compactadas
        if (this.STRUCTURAL_FOLDERS.has(node.name.toLowerCase())) {
            return false;
        }
        // Se o nome contém caracteres especiais típicos de config, não compactar
        if (node.name.startsWith('.') || node.name.startsWith('_')) {
            return false;
        }
        return true;
    }

    /**
     * Verifica se uma pasta está dentro de src/main/java ou src/test/java
     * (ou seja, é um pacote Java que deve usar notação de ponto).
     */
    private isJavaPackageFolder(path: string): boolean {
        // O path deve conter /java/ e estar DEPOIS dele
        const javaIndex = path.indexOf('/java/');
        if (javaIndex !== -1) {
            // Verifica se há algo depois de /java/
            return path.length > javaIndex + 6;
        }

        // Também verificar se começa com java/
        if (path.startsWith('java/')) {
            return path.length > 5;
        }

        return false;
    }

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
                    ? hljs.highlight(code, { language, ignoreIllegals: true })
                    : hljs.highlightAuto(code);
                return this.sanitizer.bypassSecurityTrustHtml(this.addLineNumbers(result.value));
            } catch (e) {
                console.warn('Highlight.js error:', e);
            }
        }

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
        const name = filename.toLowerCase();
        const ext = name.split('.').pop() || '';

        // Arquivos especiais
        if (name === 'dockerfile') return 'dockerfile';
        if (name === 'pom.xml') return 'xml';
        if (name.endsWith('.gradle.kts')) return 'kotlin';
        if (name.endsWith('.gradle')) return 'groovy';

        const langMap: Record<string, string> = {
            'ts': 'typescript', 'tsx': 'typescript',
            'js': 'javascript', 'jsx': 'javascript', 'mjs': 'javascript',
            'java': 'java', 'py': 'python', 'rb': 'ruby',
            'go': 'go', 'rs': 'rust', 'cpp': 'cpp', 'c': 'c', 'h': 'c',
            'cs': 'csharp', 'php': 'php', 'kt': 'kotlin', 'kts': 'kotlin',
            'html': 'xml', 'htm': 'xml', 'xml': 'xml', 'svg': 'xml',
            'css': 'css', 'scss': 'scss', 'sass': 'scss', 'less': 'less',
            'json': 'json', 'yaml': 'yaml', 'yml': 'yaml',
            'md': 'markdown', 'sql': 'sql',
            'sh': 'bash', 'bash': 'bash', 'zsh': 'bash',
            'properties': 'properties', 'ini': 'ini', 'toml': 'ini',
            'groovy': 'groovy'
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
     * Base path para ícones IntelliJ.
     */
    private readonly ICON_BASE_PATH = 'assets/icons-intellij';

    /**
     * Retorna img tag para ícone da pasta (oficial IntelliJ).
     */
    getFolderIconSvg(node: TreeNode): SafeHtml {
        let iconName = 'webFolder_dark';
        const lowerName = node.name.toLowerCase();

        // Pasta .github
        if (lowerName === '.github') {
            iconName = 'folderGithub_dark';
        }
        // Pasta de testes
        else if (lowerName === 'test' || lowerName === 'tests') {
            // Verificar se é raiz de teste (ex: src/test)
            if (node.path.includes('src/test') || node.path === 'test') {
                iconName = 'testRoot_dark';
            }
        }

        const imgTag = `<img src="${this.ICON_BASE_PATH}/${iconName}.svg" width="16" height="16" alt="folder" style="vertical-align: middle;">`;
        return this.sanitizer.bypassSecurityTrustHtml(imgTag);
    }

    /**
     * Retorna img tag para ícone do arquivo baseado no tipo.
     */
    getFileIconSvg(filename: string): SafeHtml {
        const iconName = this.getIconNameForFile(filename);
        const imgTag = `<img src="${this.ICON_BASE_PATH}/${iconName}.svg" width="16" height="16" alt="file" style="vertical-align: middle;" onerror="this.style.display='none'">`;
        return this.sanitizer.bypassSecurityTrustHtml(imgTag);
    }

    /**
     * Determina o nome do ícone baseado no filename.
     * Detecta tipos Java (class, interface, enum, record, exception).
     */
    private getIconNameForFile(filename: string): string {
        const lowerName = filename.toLowerCase();
        const ext = lowerName.split('.').pop() || '';
        const baseName = filename.replace(/\.[^.]+$/, '');

        // === ARQUIVOS ESPECÍFICOS ===
        // Manifest
        if (lowerName.includes('manifest')) {
            return 'manifest_dark';
        }
        // Spring Boot Properties
        if (lowerName === 'application.properties' || lowerName === 'application.yml' || lowerName === 'application.yaml') {
            return 'springBoot@14x14_dark';
        }

        // === JAVA - Detectar tipo pelo nome do arquivo ===
        if (ext === 'java') {
            // Interface: nomes que começam com 'I' maiúsculo seguido de maiúscula, ou terminam com Interface
            if (/^I[A-Z]/.test(baseName) || baseName.endsWith('Interface')) {
                return 'interface_dark';
            }
            // Enum: termina com Enum ou usa padrão de enum
            if (baseName.endsWith('Enum') || baseName.endsWith('Type') || baseName.endsWith('Status')) {
                return 'enum_dark';
            }
            // Record: termina com Record ou DTO, Request, Response (records modernos)
            if (baseName.endsWith('Record') || baseName.endsWith('Dto') ||
                baseName.endsWith('DTO') || baseName.endsWith('Request') ||
                baseName.endsWith('Response')) {
                return 'record_dark';
            }
            // Exception: termina com Exception ou Error
            if (baseName.endsWith('Exception') || baseName.endsWith('Error')) {
                return 'exception_dark';
            }
            // Abstract class: começa com Abstract ou termina com Base
            if (baseName.startsWith('Abstract') || baseName.endsWith('Base')) {
                return 'classAbstract_dark';
            }
            // Test: termina com Test
            if (baseName.endsWith('Test') || baseName.endsWith('Tests') || baseName.endsWith('Spec')) {
                return 'test_dark';
            }
            // Classe padrão
            return 'class_dark';
        }

        // === TYPESCRIPT - Detectar tipo ===
        if (ext === 'ts' || ext === 'tsx') {
            // Interface
            if (/^I[A-Z]/.test(baseName) || lowerName.includes('.interface.')) {
                return 'typeScriptInterface_dark';
            }
            // Enum
            if (lowerName.includes('.enum.')) {
                return 'typeScriptEnum_dark';
            }
            // Class
            if (lowerName.includes('.class.')) {
                return 'typeScriptClass_dark';
            }
            // Module
            if (lowerName.includes('.module.')) {
                return 'typeScriptModule_dark';
            }
            // Test
            if (lowerName.includes('.spec.') || lowerName.includes('.test.')) {
                return ext === 'tsx' ? 'tsxTest_dark' : 'tsTest_dark';
            }
            // TypeScript padrão
            return 'typeScript_dark';
        }

        // === JAVASCRIPT ===
        if (ext === 'js' || ext === 'jsx' || ext === 'mjs') {
            if (lowerName.includes('.spec.') || lowerName.includes('.test.')) {
                return 'jsTest_dark';
            }
            return 'javaScript_dark';
        }

        // === MAPEAMENTO POR EXTENSÃO ===
        const iconMap: Record<string, string> = {
            // Web
            'html': 'html_dark',
            'htm': 'html_dark',
            'css': 'css_dark',
            'scss': 'css_dark',
            'sass': 'css_dark',

            // Data
            'json': 'json_dark',
            'yaml': 'yaml_dark',
            'yml': 'yaml_dark',
            'csv': 'csv_dark',
            'xml': 'mavenProject_dark',

            // Config
            'properties': 'properties_dark',

            // Docs
            'md': 'markdown_dark',
            'mdx': 'markdown_dark',

            // Images
            'png': 'image_dark',
            'jpg': 'image_dark',
            'jpeg': 'image_dark',
            'gif': 'image_dark',
            'svg': 'image_dark',
            'webp': 'image_dark',
            'ico': 'image_dark',
        };

        // Arquivos especiais por nome
        if (lowerName === '.gitignore') {
            return 'gitignore';
        }
        if (lowerName === 'dockerfile' || lowerName.startsWith('dockerfile')) {
            return 'welcomeDockerFallback';
        }
        if (lowerName === 'pom.xml') {
            return 'mavenProject_dark';
        }
        if (lowerName.endsWith('.gradle') || lowerName.endsWith('.gradle.kts')) {
            return 'mavenProject_dark';
        }
        if (lowerName === 'manifest.json') {
            return 'manifest_dark';
        }

        return iconMap[ext] || 'inlayRenameInNoCodeFiles_dark';
    }

    getFileIcon(node: TreeNode): string {
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
