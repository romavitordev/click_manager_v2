# Click Manager
Sistema de gestão para fotógrafos com front-end estático e back-end ASP.NET Core.

## Visão geral
Este repositório contém duas partes principais:

- `clickmanager-v2/` — front-end estático em HTML/CSS/JS para landing page, login, cadastro e painel.
- `ClickManagerApi/` — back-end ASP.NET Core 8 com API REST, envio de e-mails e persistência com Entity Framework Core.

Também há projeto de testes em `ClickManagerApi.Tests/` e solução em `ClickManager.slnx`.

## Estrutura do projeto

- `ClickManager.slnx` — solução contendo o API e os testes.
- `ClickManagerApi/` — aplicação ASP.NET Core.
  - `Program.cs` — configuração do pipeline, CORS, EF Core, autenticação JWT e injeção de dependências.
  - `Controllers/` — controladores da API.
  - `Data/` — `ApplicationDbContext` para acesso ao banco.
  - `Models/` — DTOs, configurações e entidades.
  - `Services/` — serviços de e-mail, autenticação e upload de arquivos.
  - `appsettings.json` — configuração de banco, SMTP e JWT.
- `ClickManagerApi.Tests/` — testes automatizados com xUnit e WebApplicationFactory.
- `clickmanager-v2/` — front-end estático.
  - `index.html`, `login.html`, `cadastro.html`, `app.html`.
  - `global.css` — estilos globais e layout.
  - `main.js` — lógica de tema, navegação SPA, AJAX, modais e integração com API.

## Tecnologias usadas

- .NET 8 / ASP.NET Core
- Entity Framework Core
- SQL Server
- MailKit (envio de e-mail)
- HTML/CSS/JavaScript para front-end
- xUnit para testes

## Como rodar

### Pré-requisitos

- .NET 8 SDK instalado
- SQL Server ou SQL Server Express acessível
- Navegador moderno

### 1. Configurar o back-end

1. Abra `ClickManagerApi/appsettings.json`.
2. Ajuste a `ConnectionStrings:DefaultConnection` para o seu servidor SQL.
3. Configure `EmailSettings` com seu servidor SMTP:
   - `SmtpHost`
   - `SmtpPort`
   - `UseSsl`
   - `SenderEmail`
   - `SenderPassword`
   - `AdminEmail`

> Se usar Gmail, gere uma senha de app em https://myaccount.google.com/apppasswords.

### 2. Executar o back-end

No terminal:

```bash
cd ClickManagerApi
dotnet restore
dotnet run
```

A API deve ficar disponível em `http://localhost:5000`.

### 3. Executar o front-end

O front-end está em `clickmanager-v2/`. Ele pode ser aberto diretamente no navegador ou servido com um servidor estático.

Por exemplo, usando o VS Code Live Server ou outra ferramenta:

- `clickmanager-v2/index.html`
- `clickmanager-v2/login.html`
- `clickmanager-v2/cadastro.html`
- `clickmanager-v2/app.html`

### 4. Testar a API

```bash
dotnet test ClickManagerApi.Tests/ClickManagerApi.Tests.csproj
```

## API disponível

### `POST /api/contact`
Envia um formulário de contato.

- Validações aplicadas:
  - `Name` deve ter pelo menos 3 caracteres
  - `Email` deve conter `@`
  - `Plan` deve ser informado
- Retorna objeto JSON com `Success` e `Message`.

### `GET /api/contact/health`
Retorna status de saúde da API.

## Observações importantes

- O back-end aplica migrações automaticamente no startup.
- Não comite credenciais ou senhas no repositório.
- O CORS já permite chamadas de `http://127.0.0.1:5500`, `http://localhost:5500`, `http://localhost:3000` e um exemplo de GitHub Pages.

## Desenvolvimento

- Use `ClickManager.slnx` para abrir a solução no Visual Studio.
- O front-end é independente e busca a API em `http://localhost:5000/api`.
- O serviço de e-mail é implementado em `ClickManagerApi/Services/EmailService.cs`.

## Contato

Para dúvidas na API, verifique `ClickManagerApi/Controllers/ContactController.cs` e a configuração em `ClickManagerApi/appsettings.json`.
 
