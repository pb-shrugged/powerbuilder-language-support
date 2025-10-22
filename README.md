# PowerBuilder Language Server Protocol (LSP)

Um Language Server Protocol completo para PowerBuilder, implementado em TypeScript com Tree-sitter.

## 📋 Funcionalidades

O MVP do PowerBuilder LSP oferece as seguintes funcionalidades:

- ✅ **Diagnostics**: Validação de sintaxe em tempo real (detecta nós ERROR do Tree-sitter)
- ✅ **Hover**: Exibe informações sobre símbolos ao passar o mouse
- ✅ **Go to Definition**: Navegação para a definição de símbolos (mesmo arquivo)
- ✅ **Document Symbols**: Lista de símbolos top-level (funções, variáveis, tipos)
- ✅ **Sincronização Incremental**: Parsing eficiente com atualizações incrementais
- ✅ **Debouncing**: Validação com debounce de 300ms para melhor performance

## 🏗️ Arquitetura

O projeto segue uma arquitetura em camadas com monorepo:

```
powerbuilder-language-support/
├── client/                          # Extensão VSCode
│   ├── src/
│   │   └── extension.ts            # Ativa extensão e inicia LanguageClient
│   ├── package.json                 # Configuração da extensão
│   └── language-configuration.json  # Configuração da linguagem
├── packages/
│   ├── pb-language-service/        # Biblioteca pura (agnóstica)
│   │   ├── src/
│   │   │   ├── parser/
│   │   │   │   └── TreeSitterManager.ts    # Parser Tree-sitter + cache
│   │   │   ├── symbols/
│   │   │   │   └── SymbolProvider.ts       # Extração de símbolos
│   │   │   ├── features/
│   │   │   │   ├── diagnostics.ts          # Validação
│   │   │   │   ├── hover.ts                # Hover
│   │   │   │   ├── definition.ts           # Go-to-definition
│   │   │   │   └── documentSymbol.ts       # Símbolos do documento
│   │   │   ├── utils/
│   │   │   │   └── ast.ts                  # Helpers AST
│   │   │   ├── index.ts                    # API pública
│   │   │   └── __tests__/                  # Testes unitários
│   │   └── package.json
│   └── pb-language-server/         # Servidor LSP (camada fina)
│       ├── src/
│       │   └── server.ts            # Handlers LSP + lifecycle
│       └── package.json
├── .vscode/
│   ├── launch.json                  # Configuração de debug
│   └── tasks.json                   # Tarefas de build
├── package.json                     # Raiz do monorepo
└── tsconfig.base.json               # Configuração TypeScript base
```

### Separação de Responsabilidades

- **pb-language-service**: Biblioteca pura sem dependências de VSCode. Usa apenas `vscode-languageserver-types` (tipos puros). Faz parsing com Tree-sitter e provê APIs para LSP features.

- **pb-language-server**: Servidor LSP fino que implementa o protocolo LSP e delega toda a lógica para o `pb-language-service`.

- **client**: Extensão VSCode que inicia o `LanguageClient` e se comunica com o servidor via IPC.

## 🚀 Instalação e Build

### Pré-requisitos

- Node.js >= 16.0.0
- npm >= 8.0.0

### Instalação

```bash
cd ~/powerbuilder-language-support
npm install
```

O script `postinstall` automaticamente executa o build de todos os pacotes.

### Build Manual

```bash
# Build completo
npm run build

# Build com watch (desenvolvimento)
npm run watch

# Limpar outputs
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
cd client
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
- Anexar o debugger ao servidor LSP na porta 6009
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

## 📝 Exemplos de Arquivos PowerBuilder

### Arquivo .sru (Script Object)

```powerbuilder
forward
global type my_object from nonvisualobject
end type

type variables
  string is_name
  integer ii_count
end variables

forward prototypes
public function string getname()
public subroutine setname(string as_name)
end prototypes

public function string getname()
  return is_name
end function

public subroutine setname(string as_name)
  is_name = as_name
end subroutine
```

### Arquivo .srf (Function Object)

```powerbuilder
forward
global type my_functions from function_object
end type

forward prototypes
global function string gf_format_date(date ad_date)
global function boolean gf_is_valid(string as_input)
end prototypes

global function string gf_format_date(date ad_date)
  return string(ad_date, "yyyy-mm-dd")
end function

global function boolean gf_is_valid(string as_input)
  if isnull(as_input) or trim(as_input) = "" then
    return false
  end if
  return true
end function
```

## 🎯 Extensões Suportadas

O Language Server é ativado para os seguintes tipos de arquivo:

- `.sru` - Script Repository User Object
- `.sra` - Script Repository Application
- `.srf` - Script Repository Function
- `.srw` - Script Repository Window
- `.pbl` - PowerBuilder Library

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

### Parsing Incremental

O TreeSitterManager usa o método `tree.edit()` do Tree-sitter para aplicar mudanças incrementais, evitando re-parsing completo do documento.

### Debouncing

Validações são debounced em 300ms para evitar execuções desnecessárias durante digitação rápida.

## 🔍 API do Language Service

### PowerBuilderLanguageService

```typescript
class PowerBuilderLanguageService {
  // Parsing
  parseAndCache(uri: string, text: string, version: number): void
  updateWithChanges(uri: string, changes: TextDocumentContentChangeEvent[], version: number): boolean
  removeDocument(uri: string): void
  clear(): void

  // Features
  validate(uri: string): Diagnostic[]
  provideHover(uri: string, position: Position): Hover | null
  findDefinition(uri: string, position: Position): Location | null
  buildDocumentSymbols(uri: string): DocumentSymbol[]
}
```

## 📚 Referências

Este projeto foi inspirado por:

- [bash-language-server](https://github.com/bash-lsp/bash-language-server)
- [vscode-css-languageservice](https://github.com/microsoft/vscode-css-languageservice)

## 🤝 Contribuindo

1. Clone o repositório
2. Crie uma branch para sua feature
3. Faça suas alterações
4. Execute os testes: `npm test`
5. Faça commit e push
6. Abra um Pull Request

## 📄 Licença

MIT

## 🐛 Troubleshooting

### Erro: Cannot find module '@pb-shrugged/tree-sitter-powerbuilder'

Execute:
```bash
npm install
```

### Servidor não está iniciando

1. Verifique os logs em **View > Output > PowerBuilder Language Server**
2. Certifique-se de que o build foi executado: `npm run build`
3. Tente recarregar a janela: **Cmd/Ctrl + Shift + P** > "Reload Window"

### Símbolos não aparecem

Verifique se o arquivo tem a extensão correta (.sru, .sra, .srf, .srw, .pbl) e se o language ID está configurado como `powerbuilder`.

## 📞 Suporte

Para reportar bugs ou solicitar features, abra uma issue no repositório do projeto.

---

**Happy PowerBuilder coding! 🚀**
