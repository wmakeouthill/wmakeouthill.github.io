# Desenvolvimento - Acesso de Rede

Este documento explica como configurar o acesso de rede para desenvolvimento do Angular.

## Comandos Disponíveis

### Desenvolvimento Local (Padrão)

```bash
npm start
# ou
ng serve
```

- Acessível apenas em: `http://localhost:4200`
- Mais seguro para desenvolvimento

### Desenvolvimento com Acesso de Rede

```bash
npm run start:network
# ou
ng serve --configuration=network
```

- Acessível em: `http://SEU_IP:4200` (ex: `http://192.168.1.100:4200`)
- Permite acesso de outros dispositivos na rede local

### Desenvolvimento Local Explícito

```bash
npm run start:local
```

- Força o uso de localhost mesmo se houver configurações de rede

## Como Descobrir Seu IP

### Windows

```cmd
ipconfig
```

Procure por "Endereço IPv4" da sua conexão ativa.

### Linux/Mac

```bash
ifconfig
# ou
ip addr show
```

## Segurança

⚠️ **IMPORTANTE**:

- O acesso de rede expõe sua aplicação para outros dispositivos na rede local
- Use apenas em redes confiáveis (casa, escritório)
- Nunca use em redes públicas (WiFi de aeroporto, café, etc.)

## Desativando o Acesso de Rede

Para voltar ao modo local, simplesmente use:

```bash
npm start
# ou
npm run start:local
```

## Troubleshooting

### Não consegue acessar pelo IP

1. Verifique se o firewall do Windows não está bloqueando a porta 4200
2. Confirme que está na mesma rede local
3. Teste primeiro com `localhost:4200` para garantir que a aplicação está funcionando

### Porta já em uso

Se a porta 4200 estiver ocupada, você pode usar outra porta:

```bash
ng serve --host 0.0.0.0 --port 4201
```
