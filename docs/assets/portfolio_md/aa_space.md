# 🌌 AA Space — Plataforma de Comunidade em Tempo Real

## 🚀 Visão Geral

O **AA Space** é uma plataforma completa de comunidade e comunicação em tempo real, desenvolvida com arquitetura moderna full-stack. A solução oferece um ambiente seguro para compartilhar experiências, com sistema de chat avançado, fórum interativo e gestão de usuários, tudo integrado em uma experiência web responsiva.

### 🎯 Principais Funcionalidades

- **Sistema de Chat Completo**: Conversas privadas e em grupo com controle avançado
- **Fórum Interativo**: Posts, comentários e sistema de curtidas
- **Gestão de Usuários**: Perfis personalizáveis com upload de imagens
- **Comunicação em Tempo Real**: Via WebSockets com Socket.IO
- **Interface Moderna**: Design responsivo com Angular 19
- **Backend Robusto**: API RESTful com Node.js e Express

## 🏗️ Arquitetura do Sistema

```mermaid
%%{title: "Arquitetura Geral do AA_Space"}%%
graph TB
    A[Angular 19 Frontend] --> B[Node.js + Express Backend]
    B --> C[SQLite Database]
    B --> D[Socket.IO Server]
    D --> A
    
    subgraph "Frontend"
        A
        E[Chat System]
        F[Forum System]
        G[User Management]
    end
    
    subgraph "Backend"
        B
        C
        D
        H[JWT Authentication]
        I[TypeORM]
    end
```

## 🔄 Fluxos de Comunicação em Tempo Real

### Sistema de Chat Híbrido (Privado + Grupo)

```mermaid
%%{title: "Chat em Tempo Real com WebSockets"}%%
sequenceDiagram
    participant U1 as User 1
    participant U2 as User 2
    participant F as Frontend
    participant B as Backend
    participant S as Socket.IO
    participant DB as SQLite
    
    Note over U1,DB: Chat Privado
    
    U1->>F: Envia mensagem para User 2
    F->>S: socket.emit('send_message', data)
    S->>B: Processa mensagem
    B->>DB: Salva mensagem no banco
    DB-->>B: Mensagem salva (ID: 123)
    B->>S: socket.to(roomId).emit('new_message', message)
    S->>F: Recebe nova mensagem
    F->>U1: Atualiza interface
    F->>U2: Atualiza interface (se online)
    
    Note over U1,DB: Chat em Grupo
    
    U1->>F: Envia mensagem no grupo
    F->>S: socket.emit('send_group_message', data)
    S->>B: Processa mensagem de grupo
    B->>DB: Salva mensagem no grupo
    DB-->>B: Mensagem salva
    B->>S: socket.to(groupRoomId).emit('new_group_message', message)
    S->>F: Broadcast para todos no grupo
    F->>U1: Atualiza interface
    F->>U2: Atualiza interface
    F->>U3: Atualiza interface (outros membros)
```

### Sistema de Fórum Interativo

```mermaid
%%{title: "Fluxo do Sistema de Fórum com Interações"}%%
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant DB as SQLite
    participant WS as WebSocket
    
    Note over U,WS: Criação de Post
    
    U->>F: Cria novo post
    F->>B: POST /api/posts
    B->>B: Validar dados + autenticação
    B->>DB: INSERT INTO posts
    DB-->>B: Post criado (ID: 456)
    B->>WS: Broadcast novo post
    WS->>F: Todos usuários recebem notificação
    F->>U: Confirmação + post visível
    
    Note over U,WS: Sistema de Curtidas
    
    U->>F: Clica em "Curtir" post
    F->>B: POST /api/posts/456/like
    B->>DB: Verifica se já curtiu
    alt Já curtiu
        DB-->>B: Remove curtida
        B->>DB: DELETE FROM likes
    else Não curtiu
        DB-->>B: Adiciona curtida
        B->>DB: INSERT INTO likes
    end
    DB-->>B: Operação concluída
    B->>WS: Broadcast atualização de likes
    WS->>F: Atualiza contador em tempo real
    
    Note over U,WS: Comentários em Tempo Real
    
    U->>F: Adiciona comentário
    F->>B: POST /api/posts/456/comments
    B->>DB: Salva comentário
    DB-->>B: Comentário salvo
    B->>WS: Broadcast novo comentário
    WS->>F: Todos veem comentário instantaneamente
```

## 🔐 Sistema de Autenticação e Sessões

### Fluxo JWT com Refresh Tokens

```mermaid
%%{title: "Sistema de Autenticação JWT com Refresh Tokens"}%%
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant DB as SQLite
    
    Note over U,DB: Login Inicial
    
    U->>F: Insere credenciais
    F->>B: POST /api/auth/login
    B->>B: Validar credenciais
    B->>DB: SELECT user WHERE email/password
    DB-->>B: Usuário encontrado
    B->>B: Gerar JWT access token (15min)
    B->>B: Gerar refresh token (7 dias)
    B->>DB: Salvar refresh token
    DB-->>B: Token salvo
    B-->>F: {accessToken, refreshToken, user}
    F->>F: Armazenar tokens no localStorage
    
    Note over U,DB: Requisições Autenticadas
    
    F->>B: GET /api/profile (com access token)
    B->>B: Verificar JWT
    alt Token válido
        B-->>F: Dados do perfil
    else Token expirado
        B-->>F: 401 Unauthorized
        F->>B: POST /api/auth/refresh (com refresh token)
        B->>DB: Verificar refresh token
        DB-->>B: Token válido
        B->>B: Gerar novo access token
        B-->>F: Novo access token
        F->>B: GET /api/profile (com novo token)
        B-->>F: Dados do perfil
    end
    
    Note over U,DB: Logout
    
    U->>F: Clica logout
    F->>B: POST /api/auth/logout
    B->>DB: Remover refresh token
    DB-->>B: Token removido
    B-->>F: Logout confirmado
    F->>F: Limpar localStorage
```

## 🛠️ Stack Tecnológica

### Frontend

- **Angular 19** - Framework enterprise com TypeScript 5.7
- **RxJS 7.8** - Programação reativa
- **Socket.IO Client** - Comunicação WebSocket
- **CSS3** - Interface responsiva e moderna

### Backend

- **Node.js** - Runtime JavaScript server-side
- **Express.js 4.18** - Framework web
- **TypeScript 5.8** - Tipagem estática
- **Socket.IO 4.8** - Servidor WebSocket

### Banco de Dados

- **SQLite3** - Banco relacional embarcado
- **TypeORM 0.3.22** - ORM moderno com TypeScript
- **Migrations** - Controle de versão de schema

### Segurança & Autenticação

- **JWT** - Tokens seguros para autenticação
- **bcrypt** - Criptografia de senhas
- **CORS** - Controle de acesso cross-origin
- **Input Validation** - Validação robusta de dados

### DevOps & Desenvolvimento

- **TypeScript Compiler** - Compilação type-safe
- **ts-node** - Execução TypeScript em desenvolvimento
- **nodemon** - Hot reload
- **Concurrently** - Execução paralela de processos

## 🎯 Funcionalidades Técnicas

### 1. Sistema de Chat Avançado

- **Conversas Privadas**: One-to-one com histórico persistente
- **Chat em Grupo**: Múltiplos participantes com avatares personalizáveis
- **Tempo Real**: Comunicação instantânea via WebSockets
- **Status de Mensagens**: Entrega e leitura em tempo real
- **Gerenciamento de Participantes**: Adicionar/remover usuários

### 2. Sistema de Fórum

- **Posts e Comentários**: Sistema completo de interação
- **Sistema de Curtidas**: Para posts e comentários
- **Atualizações em Tempo Real**: Notificações instantâneas
- **Moderação de Conteúdo**: Controle administrativo

### 3. Gestão de Usuários

- **Autenticação JWT**: Sistema stateless seguro
- **Upload de Imagens**: Fotos de perfil e avatares de grupo
- **Informações de Contato**: Email e telefone
- **Sistema de Roles**: Administradores e usuários comuns

### 4. Sistema de Upload e Gestão de Arquivos

- **Validação de Arquivos**: Tipos e tamanhos permitidos
- **Armazenamento Local**: Integração com sistema de arquivos
- **Processamento de Imagens**: Otimização automática

#### Fluxo de Upload com Validação

```mermaid
%%{title: "Sistema de Upload com Validação e Processamento"}%%
sequenceDiagram
    participant U as User
    participant F as Frontend
    participant B as Backend
    participant FS as File System
    participant DB as SQLite
    
    Note over U,DB: Upload de Imagem de Perfil
    
    U->>F: Seleciona arquivo de imagem
    F->>F: Validação client-side (tipo, tamanho)
    F->>B: POST /api/upload/profile-image (multipart/form-data)
    B->>B: Middleware de validação
    alt Arquivo válido
        B->>FS: Salvar arquivo temporário
        FS-->>B: Arquivo salvo
        B->>B: Processar imagem (redimensionar, otimizar)
        B->>FS: Salvar versão otimizada
        FS-->>B: Imagem processada salva
        B->>DB: UPDATE user SET profile_image = filename
        DB-->>B: Banco atualizado
        B-->>F: {success: true, imageUrl: '/uploads/profile_123.jpg'}
        F->>F: Atualizar interface com nova imagem
    else Arquivo inválido
        B-->>F: {error: 'Tipo de arquivo não permitido'}
        F->>U: Exibe erro de validação
    end
    
    Note over U,DB: Upload de Avatar para Grupo
    
    U->>F: Seleciona avatar para grupo
    F->>B: POST /api/upload/group-avatar
    B->>FS: Salvar avatar do grupo
    FS-->>B: Avatar salvo
    B->>DB: UPDATE groups SET avatar = filename
    DB-->>B: Grupo atualizado
    B->>B: Broadcast para membros do grupo
    B-->>F: Avatar atualizado
    F->>F: Atualizar interface do grupo
```

## 🔧 Implementações Técnicas

### Comunicação WebSocket

```typescript
// Servidor Socket.IO
io.on('connection', (socket) => {
  socket.on('join_room', (roomId) => {
    socket.join(roomId);
  });
  
  socket.on('send_message', (data) => {
    io.to(data.roomId).emit('new_message', data);
  });
});
```

### Entidades TypeORM

```typescript
@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;
  
  @Column({ unique: true })
  username: string;
  
  @OneToMany(() => ChatMessage, message => message.sender)
  messages: ChatMessage[];
}
```

### Autenticação JWT

```typescript
// Middleware de autenticação
const authenticateToken = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return res.sendStatus(401);
  
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
};
```

## 📊 Diferenciais Técnicos

### Inovações Implementadas

1. **Sistema de chat híbrido** com conversas privadas e em grupo
2. **Integração WebSocket** para comunicação em tempo real
3. **Arquitetura TypeScript** full-stack com tipagem estática
4. **Sistema de upload** com validação de segurança
5. **Interface responsiva** adaptável para todos os dispositivos

### Skills Demonstradas

- **Full-stack Development** com Angular e Node.js
- **Real-time Communication** com WebSockets
- **TypeScript** em frontend e backend
- **ORM Moderno** com TypeORM
- **Autenticação Segura** com JWT
- **Arquitetura de Componentes** com Angular
- **Programação Reativa** com RxJS
- **Controle de Versão** de banco de dados

## 🚀 Resultado Final

O **AA Space** demonstra capacidade avançada em:

- **Desenvolvimento Full-stack** moderno
- **Comunicação em Tempo Real** com WebSockets
- **Arquitetura TypeScript** type-safe
- **Sistemas de Chat** complexos
- **Gestão de Usuários** e autenticação
- **Interface Responsiva** e moderna

Uma solução completa que integra tecnologias modernas do mercado para criar uma experiência de comunidade robusta e escalável.
