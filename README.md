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

## Segurança

Tudo que grava passa pela conta de quem está logado. O texto é filtrado no servidor: xingamento, ameaça, link, spam, e-mail, CPF e telefone não entram. Capa só se for jpg, png ou webp de verdade. Publicar, comentar, seguir e denunciar têm limite. Três denúncias de pessoas diferentes escondem a página dos outros. Conversa só abre pra quem participa. Senha não fica no código.
