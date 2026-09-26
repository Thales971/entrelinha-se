# entrelinha-se

Caderno social de poesia, frase, reflexão, nota e trecho curto.

Cada publicação vira uma página: dá pra escolher o tipo, o molde do papel e a cor da tinta. Tem feed pra ler sentado, modo folhear, recados, cartas e perfil.

## O que já funciona

- Criar conta e entrar com e-mail
- Publicar poema, frase, reflexão, nota ou trecho curto
- Feed e folhear
- Curtir, comentar, seguir
- Recados e conversa
- Denunciar e bloquear
- Baixar a página em imagem

Música entra só como trecho curto escrito por quem posta. Sem letra inteira e sem capa puxada de catálogo.

## Rodar na máquina

```bash
npm install
npm run dev
```

Abre em `http://localhost:8080`.

O banco local sobe sozinho. Pra persistir de verdade em produção, o app usa Postgres pela variável `DATABASE_URL`.
