# PowerBuilder Language Support

- Um serviço de suporte ao ambiente PowerBuilder implementada em Typescript e com Tree-Sitter como parser.
- Um servidor de linguagem implementando o Language Server Protocol.
- Uma extensão para VSCode.

## 📋 Funcionalidades

O MVP do PowerBuilder LSP oferece as seguintes funcionalidades:

- ✅ **Diagnostics**: Validação de sintaxe em tempo real (detecta nós ERROR do Tree-sitter)
- ✅ **Hover**: Exibe informações sobre símbolos ao passar o mouse
- ✅ **Go to Definition**: Navegação para a definição de símbolos (mesmo arquivo)
- ✅ **Document Symbols**: Lista de símbolos (funções, variáveis, classe do documento)
- ✅ **Workspace Symbols**: Lista de símbolos globais (funções globais, variáveis globais, classes)

## 🏗️ Arquitetura

O projeto segue uma arquitetura em camadas com monorepo:

```
powerbuilder-language-support/
├── vscode-client/                          # Extensão VSCode
│   ├── src/
│   │   └── extension.ts             # Ativa extensão e inicia LanguageClient
│   ├── package.json                 # Configuração da extensão
│   └── language-configuration.json  # Configuração da linguagem
├── packages/
│   ├── pb-language-service/        # Biblioteca pura (agnóstica)
│   └── pb-language-server/         # Servidor LSP (camada fina)
├── .vscode/
│   ├── launch.json                  # Configuração de debug
│   └── tasks.json                   # Tarefas de build
├── package.json                     # Raiz do monorepo
└── tsconfig.base.json               # Configuração TypeScript base
```

### Separação de Responsabilidades

- **pb-language-service**: Biblioteca pura sem dependências de VSCode. Usa apenas `vscode-languageserver-types` (tipos puros). Faz parsing com Tree-sitter e provê APIs para LSP features.

- **pb-language-server**: Servidor de linguagem que implementa o protocolo LSP e delega toda a lógica para o `pb-language-service`.

- **vscode-client**: Extensão VSCode que inicia o `LanguageClient` e se comunica com o servidor via IPC.

## 🚀 Instalação e Build

### Pré-requisitos

- Node.js >= 16.0.0
- npm >= 8.0.0

### Instalação

```bash
cd ~/powerbuilder-language-support
npm install
```

### Build

```bash
# Build completo
npm run build

# Build com watch (desenvolvimento)
npm run watch

# Limpar outputs e node_modules
npm run clean
```

### Build Individual

```bash
# Apenas o language service
cd packages/pb-language-service
npm run build

# Apenas o language server
cd packages/pb-language-server
npm run build

# Apenas o client
cd vscode-client
npm run build
```

## 🐛 Debug

### Debug no VSCode

1. Abra o projeto no VSCode:
   ```bash
   code ~/powerbuilder-language-support
   ```

2. Pressione **F5** ou vá em **Run > Start Debugging**

3. Selecione **"Client + Server"** na configuração de debug

Isso irá:
- Iniciar a extensão em uma nova janela do VSCode (Extension Host)
- Anexar o debugger ao servidor LSP na porta 6019
- Permitir debug simultâneo de cliente e servidor

### Debug Individual

- **Client**: Selecione "Launch Client"
- **Server**: Selecione "Attach to Server" (após o cliente iniciar)

### Logs

O servidor LSP envia logs para o console do VSCode:
- **View > Output**
- Selecione **"PowerBuilder Language Server"** no dropdown

## 🧪 Testes

```bash
# Executar todos os testes
npm test

# Executar testes do language service
cd packages/pb-language-service
npm test

# Executar testes com coverage
npm test -- --coverage
```

## 🎯 Extensões Suportadas

O Language Server é ativado para os seguintes tipos de arquivo:

- `.sru` - Script Repository User Object
- `.sra` - Script Repository Application
- `.srf` - Script Repository Function
- `.srw` - Script Repository Window

## 🔧 Configuração

### Language ID

O language ID usado é `powerbuilder`.

### Activation Events

A extensão é ativada quando um arquivo PowerBuilder é aberto:
```json
"activationEvents": [
  "onLanguage:powerbuilder"
]
```

## 📊 Tecnologias Utilizadas

- **TypeScript 5.3+**: Linguagem principal
- **Tree-sitter**: Parser incremental
- **@pb-shrugged/tree-sitter-powerbuilder**: Gramática PowerBuilder
- **vscode-languageserver**: Implementação do protocolo LSP
- **vscode-languageclient**: Cliente LSP para VSCode
- **Jest**: Framework de testes

## 🎨 Features LSP Implementadas

### Capabilities

O servidor expõe as seguintes capabilities:

```typescript
{
  textDocumentSync: {
    openClose: true,
    change: TextDocumentSyncKind.Incremental,
    save: { includeText: false }
  },
  hoverProvider: true,
  definitionProvider: true,
  documentSymbolProvider: true
}
```

## 📚 Referências

Este projeto foi inspirado por:

- [bash-language-server](https://github.com/bash-lsp/bash-language-server)
- [vscode-css-languageservice](https://github.com/microsoft/vscode-css-languageservice)
