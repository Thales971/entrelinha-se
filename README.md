# entrelinha-se

Um caderno no bolso. Frase, poema, reflexão, nota e trecho curto de música, cada um numa página com molde e tinta.

O feed é pra ler sentado. O folhear é a página curta, uma de cada vez. As cartas são conversa. O perfil é o seu caderno.

Repositório público: [github.com/Thales971/entrelinha-se](https://github.com/Thales971/entrelinha-se)

## O que dá pra fazer

- Criar conta com e-mail e senha, ou entrar de novo
- Escolher o molde do papel e a cor da tinta
- Publicar poema, frase, reflexão, nota ou um trecho curto de música
- Curtir, guardar na fita, republicar e comentar na margem
- Folhear as páginas curtas e baixar a página como imagem
- Stories de uma linha
- Seguir alguém e ver só quem você segue
- Traduzir a página e a carta
- Modo claro e lamparina
- Denunciar e bloquear
- Mandar carta lacrada

Música entra só como trecho curto, de até 4 linhas, escrito por quem posta. Sem letra inteira e sem capa de álbum puxada de catálogo.

## Segurança

Postagem é pública. Quem entra na estante lê. Isso é de propósito.

Carta é outra coisa. Ela sai lacrada neste aparelho, com chave que não vai pro servidor. O banco guarda o texto ilegível. Quem não tem a chave não lê, e o servidor também não. A chave fica neste navegador ou neste app. Outro celular não abre a carta antiga.

O que não entra, nem disfarçado: xingamento, ameaça, discurso de ódio, link, spam, e-mail, CPF e telefone. Foto só se for jpg, png ou webp de verdade, e pequena. Publicar, comentar, seguir e denunciar têm limite. Três denúncias de pessoas diferentes escondem a página dos outros.

Senha, banco e chave da carta não ficam neste repositório.

## Rodar o site

```bash
npm install
npm run dev
```

Abre em `http://localhost:8080`.

O banco local sobe sozinho. Em produção o app usa Postgres pela variável `DATABASE_URL`, que fica fora do git.

## Publicar no Vercel

Na raiz do repositório, importe o projeto no Vercel usando o repositório `Thales971/entrelinha-se`. Deixe `Root Directory` como `.` (não use `mobile`), use `npm run build` como comando de build e mantenha o comando de instalação definido em `vercel.json`.

Antes do primeiro deploy, adicione nas Environment Variables do Vercel, para `Production` e `Preview` conforme necessário:

- `DATABASE_URL`: conexão do Postgres de produção
- `BETTER_AUTH_SECRET`: um segredo aleatório longo
- `BETTER_AUTH_URL`: a URL pública do projeto, por exemplo `https://entrelinha-se.vercel.app`

Depois de publicar, copie a URL real gerada pelo Vercel e use-a no build do app Expo, conforme a seção abaixo.

## App de celular, pelo Expo

A pasta `mobile` é o app que o EAS empacota. Ele abre o mesmo caderno, pra não reescrever o livro inteiro antes da loja. A Play Store fica pra quando o app estiver redondo. O que dá pra gerar agora é um APK de teste.

Antes do build, o site precisa de um endereço público. Sem isso o app abre a capa e avisa que falta a URL.

Na pasta `mobile`:

```bash
npm install
npx eas login
npx eas init
```

O `eas init` liga o projeto na sua conta da Expo e grava o id. Depois:

```bash
$env:EXPO_PUBLIC_SITE_URL = "https://seu-endereco.com"
npx eas build --platform android --profile preview
```

No PowerShell, troque `https://seu-endereco.com` pelo endereço público real do site. No Prompt de Comando, use `set EXPO_PUBLIC_SITE_URL=https://seu-endereco.com` antes do comando de build.

O perfil `preview` gera um APK pra instalar e testar. O perfil `production` gera o pacote da loja (AAB), e esse fica pra mais tarde:

```bash
$env:EXPO_PUBLIC_SITE_URL = "https://seu-endereco.com"
npm run build:loja
```

O pacote Android é `app.entrelinha.caderno`. O ícone é o livro aberto no fundo creme.

## O que tem aqui

| Parte            | Onde                           |
| ---------------- | ------------------------------ |
| Site             | raiz do repositório            |
| App Expo         | `mobile`                       |
| Banco            | `migrations`                   |
| Filtro de texto  | `src/lib/entrelinhas/guard.ts` |
| Lacre das cartas | `src/lib/entrelinhas/seal.ts`  |
