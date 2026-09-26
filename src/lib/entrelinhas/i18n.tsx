import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export const LANGS = [
  { id: "pt", label: "PT" },
  { id: "en", label: "EN" },
  { id: "es", label: "ES" },
  { id: "fr", label: "FR" },
] as const;

export type Lang = (typeof LANGS)[number]["id"];

const pt = {
  pocket: "um livro no bolso",
  tagline: "Feed pra ler sentado. Folhear pra frase curta. A página continua sendo um livro.",
  opening: "Abrindo o caderno…",
  openNote: "caderno aberto",
  signUp: "Criar conta",
  signIn: "Entrar",
  namePh: "Seu nome",
  emailPh: "E-mail",
  passwordPh: "Senha",
  accept: "Li e aceito as regras do caderno.",
  read: "Ler",
  openingBtn: "Abrindo…",
  createBook: "Criar meu caderno",
  enter: "Entrar",
  or: "ou",
  continueWith: "Continuar com",
  errEmail: "Usa um e-mail válido e uma senha com 8 caracteres ou mais.",
  errName: "Como a gente te chama?",
  errTerms: "Aceita as regras do caderno pra criar a conta.",
  errEnter: "Não deu pra entrar.",
  language: "Idioma",
  navHome: "Início",
  navFlip: "Folhear",
  navLetters: "Cartas",
  navMe: "Eu",
  newPage: "Nova página",
  shelf: "estante",
  all: "Tudo",
  following: "Seguindo",
  dayVerse: "verso do dia",
  searchPh: "Buscar verso, nome, música",
  turning: "Virando a página…",
  deskClean: "A mesa está limpa.",
  deskCleanHint: "Publica a primeira página, ou segue alguém pra encher o feed.",
  yours: "Sua",
  browsing: "Folheando…",
  nothingShort: "Nada curto pra folhear.",
  writePhrase: "Escrever uma frase",
  pages: "Páginas",
  ribbon: "Fita",
  likes: "Curtidas",
  editBook: "Editar caderno",
  follow: "Seguir",
  write: "Escrever",
  block: "Bloquear",
  unblock: "Desbloquear",
  blankBio: "Ainda sem descrição. O caderno está em branco.",
  note: "Nota",
  pagesWord: "páginas",
  readers: "leitores",
  followingCount: "seguindo",
  noPages: "Nenhuma página ainda.",
  emptyRibbon: "A fita ainda está vazia.",
  emptyLikes: "Nenhuma curtida ainda.",
  peopleNear: "Gente por perto",
  blocked: "Bloqueados",
  rules: "Regras",
  back: "Voltar",
  bookGone: "Esse caderno sumiu.",
  openingBook: "Abrindo o caderno…",
  letters: "Cartas",
  openingLetters: "Abrindo as cartas…",
  noLetters: "Nenhuma conversa ainda. Abre um perfil e toca em Escrever.",
  letterOpen: "Conversa aberta",
  startLetter: "Começa a carta.",
  firstPage: "primeira página",
  howSign: "Como você assina?",
  signHint: "Isso aparece embaixo do verso. O @ é o seu lugar na estante.",
  penName: "Nome de pena",
  userPh: "usuario",
  mold: "Molde do livro",
  saving: "Guardando…",
  enterShelf: "Entrar na estante",
  story: "História",
  storyHint: "Some em 24 horas. Uma frase basta.",
  openingPage: "Abrindo a página…",
  pageGone: "Essa página não está mais aqui.",
  inMargin: "Na margem",
  margin: "Margem",
  marginEmpty: "Ninguém escreveu na margem ainda.",
  storyGone: "Essa história já saiu do ar.",
  openingStory: "Abrindo…",
  kindPoem: "Poema",
  kindPhrase: "Frase",
  kindThought: "Reflexão",
  kindSong: "Música",
  kindNote: "Nota",
  lampOn: "Acender a lamparina",
  lampOff: "Voltar pra luz do dia",
  term1: "Você entra com o seu nome e responde pelo que publica.",
  term2: "Não cabe assédio, ameaça, nudez, golpe nem conteúdo ilegal.",
  term3: "Música é só um trecho curto, de até 4 linhas, escrito por você. Sem letra inteira e sem capa oficial de álbum.",
  term4: "Dá para denunciar e bloquear. Três pessoas diferentes denunciando a mesma página escondem ela dos outros.",
  term5: "Xingamento, ameaça, discurso de ódio, link, spam e dado pessoal não são publicados, nem disfarçados.",
};

const en: Record<keyof typeof pt, string> = {
  pocket: "a book in the pocket",
  tagline: "A feed to read sitting down. Flip for a short line. The page is still a book.",
  opening: "Opening the notebook…",
  openNote: "notebook open",
  signUp: "Create account",
  signIn: "Sign in",
  namePh: "Your name",
  emailPh: "Email",
  passwordPh: "Password",
  accept: "I read and accept the notebook rules.",
  read: "Read",
  openingBtn: "Opening…",
  createBook: "Create my notebook",
  enter: "Enter",
  or: "or",
  continueWith: "Continue with",
  errEmail: "Use a valid email and a password of 8 characters or more.",
  errName: "What should we call you?",
  errTerms: "Accept the notebook rules to create the account.",
  errEnter: "Could not sign in.",
  language: "Language",
  navHome: "Home",
  navFlip: "Flip",
  navLetters: "Letters",
  navMe: "Me",
  newPage: "New page",
  shelf: "shelf",
  all: "All",
  following: "Following",
  dayVerse: "verse of the day",
  searchPh: "Search a line, a name, a song",
  turning: "Turning the page…",
  deskClean: "The desk is clear.",
  deskCleanHint: "Publish the first page, or follow someone to fill the feed.",
  yours: "Yours",
  browsing: "Flipping…",
  nothingShort: "Nothing short to flip through.",
  writePhrase: "Write a line",
  pages: "Pages",
  ribbon: "Ribbon",
  likes: "Likes",
  editBook: "Edit notebook",
  follow: "Follow",
  write: "Write",
  block: "Block",
  unblock: "Unblock",
  blankBio: "No description yet. The notebook is blank.",
  note: "Note",
  pagesWord: "pages",
  readers: "readers",
  followingCount: "following",
  noPages: "No pages yet.",
  emptyRibbon: "The ribbon is still empty.",
  emptyLikes: "No likes yet.",
  peopleNear: "People nearby",
  blocked: "Blocked",
  rules: "Rules",
  back: "Back",
  bookGone: "That notebook is gone.",
  openingBook: "Opening the notebook…",
  letters: "Letters",
  openingLetters: "Opening the letters…",
  noLetters: "No conversation yet. Open a profile and tap Write.",
  letterOpen: "Conversation open",
  startLetter: "Start the letter.",
  firstPage: "first page",
  howSign: "How do you sign?",
  signHint: "This shows under the verse. The @ is your place on the shelf.",
  penName: "Pen name",
  userPh: "username",
  mold: "Book mold",
  saving: "Saving…",
  enterShelf: "Enter the shelf",
  story: "Story",
  storyHint: "It leaves in 24 hours. One line is enough.",
  openingPage: "Opening the page…",
  pageGone: "This page is no longer here.",
  inMargin: "In the margin",
  margin: "Margin",
  marginEmpty: "Nobody wrote in the margin yet.",
  storyGone: "That story has left the air.",
  openingStory: "Opening…",
  kindPoem: "Poem",
  kindPhrase: "Line",
  kindThought: "Reflection",
  kindSong: "Song",
  kindNote: "Note",
  lampOn: "Light the lamp",
  lampOff: "Back to daylight",
  term1: "You sign in with your name and answer for what you publish.",
  term2: "No harassment, threats, nudity, scams, or illegal content.",
  term3: "A song is only a short excerpt, up to 4 lines, written by you. No full lyrics and no official album art.",
  term4: "You can report and block. Three different people reporting the same page hide it from everyone else.",
  term5: "Insults, threats, hate, links, spam, and personal data are not published, even disguised.",
};

const es: Record<keyof typeof pt, string> = {
  pocket: "un libro en el bolsillo",
  tagline: "Un feed para leer sentado. Pasar para la frase corta. La página sigue siendo un libro.",
  opening: "Abriendo el cuaderno…",
  openNote: "cuaderno abierto",
  signUp: "Crear cuenta",
  signIn: "Entrar",
  namePh: "Tu nombre",
  emailPh: "Correo",
  passwordPh: "Contraseña",
  accept: "Leí y acepto las reglas del cuaderno.",
  read: "Leer",
  openingBtn: "Abriendo…",
  createBook: "Crear mi cuaderno",
  enter: "Entrar",
  or: "o",
  continueWith: "Continuar con",
  errEmail: "Usa un correo válido y una contraseña de 8 caracteres o más.",
  errName: "¿Cómo te llamamos?",
  errTerms: "Acepta las reglas del cuaderno para crear la cuenta.",
  errEnter: "No se pudo entrar.",
  language: "Idioma",
  navHome: "Inicio",
  navFlip: "Pasar",
  navLetters: "Cartas",
  navMe: "Yo",
  newPage: "Nueva página",
  shelf: "estante",
  all: "Todo",
  following: "Siguiendo",
  dayVerse: "verso del día",
  searchPh: "Buscar verso, nombre, canción",
  turning: "Pasando la página…",
  deskClean: "La mesa está limpia.",
  deskCleanHint: "Publica la primera página, o sigue a alguien para llenar el feed.",
  yours: "Tuya",
  browsing: "Pasando…",
  nothingShort: "Nada corto para pasar.",
  writePhrase: "Escribir una frase",
  pages: "Páginas",
  ribbon: "Cinta",
  likes: "Me gusta",
  editBook: "Editar cuaderno",
  follow: "Seguir",
  write: "Escribir",
  block: "Bloquear",
  unblock: "Desbloquear",
  blankBio: "Todavía sin descripción. El cuaderno está en blanco.",
  note: "Nota",
  pagesWord: "páginas",
  readers: "lectores",
  followingCount: "siguiendo",
  noPages: "Ninguna página todavía.",
  emptyRibbon: "La cinta sigue vacía.",
  emptyLikes: "Ningún me gusta todavía.",
  peopleNear: "Gente cerca",
  blocked: "Bloqueados",
  rules: "Reglas",
  back: "Volver",
  bookGone: "Ese cuaderno desapareció.",
  openingBook: "Abriendo el cuaderno…",
  letters: "Cartas",
  openingLetters: "Abriendo las cartas…",
  noLetters: "Ninguna conversación todavía. Abre un perfil y toca Escribir.",
  letterOpen: "Conversación abierta",
  startLetter: "Empieza la carta.",
  firstPage: "primera página",
  howSign: "¿Cómo firmas?",
  signHint: "Esto aparece debajo del verso. El @ es tu lugar en el estante.",
  penName: "Nombre de pluma",
  userPh: "usuario",
  mold: "Molde del libro",
  saving: "Guardando…",
  enterShelf: "Entrar al estante",
  story: "Historia",
  storyHint: "Se va en 24 horas. Una frase basta.",
  openingPage: "Abriendo la página…",
  pageGone: "Esta página ya no está aquí.",
  inMargin: "Al margen",
  margin: "Margen",
  marginEmpty: "Nadie escribió al margen todavía.",
  storyGone: "Esa historia ya salió del aire.",
  openingStory: "Abriendo…",
  kindPoem: "Poema",
  kindPhrase: "Frase",
  kindThought: "Reflexión",
  kindSong: "Canción",
  kindNote: "Nota",
  lampOn: "Encender la lámpara",
  lampOff: "Volver a la luz del día",
  term1: "Entras con tu nombre y respondes por lo que publicas.",
  term2: "No cabe acoso, amenaza, desnudez, estafa ni contenido ilegal.",
  term3: "La música es solo un fragmento corto, de hasta 4 líneas, escrito por ti. Sin letra entera ni portada oficial.",
  term4: "Se puede denunciar y bloquear. Tres personas distintas denunciando la misma página la ocultan para los demás.",
  term5: "Insultos, amenazas, odio, enlaces, spam y datos personales no se publican, ni disfrazados.",
};

const fr: Record<keyof typeof pt, string> = {
  pocket: "un livre dans la poche",
  tagline: "Un fil à lire assis. Feuilleter pour la phrase courte. La page reste un livre.",
  opening: "Ouverture du cahier…",
  openNote: "cahier ouvert",
  signUp: "Créer un compte",
  signIn: "Entrer",
  namePh: "Ton nom",
  emailPh: "E-mail",
  passwordPh: "Mot de passe",
  accept: "J'ai lu et j'accepte les règles du cahier.",
  read: "Lire",
  openingBtn: "Ouverture…",
  createBook: "Créer mon cahier",
  enter: "Entrer",
  or: "ou",
  continueWith: "Continuer avec",
  errEmail: "Utilise un e-mail valide et un mot de passe de 8 caractères ou plus.",
  errName: "Comment t'appelle-t-on ?",
  errTerms: "Accepte les règles du cahier pour créer le compte.",
  errEnter: "Impossible d'entrer.",
  language: "Langue",
  navHome: "Accueil",
  navFlip: "Feuilleter",
  navLetters: "Lettres",
  navMe: "Moi",
  newPage: "Nouvelle page",
  shelf: "étagère",
  all: "Tout",
  following: "Abonnements",
  dayVerse: "vers du jour",
  searchPh: "Chercher un vers, un nom, une chanson",
  turning: "On tourne la page…",
  deskClean: "La table est vide.",
  deskCleanHint: "Publie la première page, ou suis quelqu'un pour remplir le fil.",
  yours: "Toi",
  browsing: "Feuilletage…",
  nothingShort: "Rien de court à feuilleter.",
  writePhrase: "Écrire une phrase",
  pages: "Pages",
  ribbon: "Ruban",
  likes: "J'aime",
  editBook: "Modifier le cahier",
  follow: "Suivre",
  write: "Écrire",
  block: "Bloquer",
  unblock: "Débloquer",
  blankBio: "Pas encore de description. Le cahier est blanc.",
  note: "Note",
  pagesWord: "pages",
  readers: "lecteurs",
  followingCount: "abonnements",
  noPages: "Aucune page pour l'instant.",
  emptyRibbon: "Le ruban est encore vide.",
  emptyLikes: "Aucun j'aime pour l'instant.",
  peopleNear: "Du monde autour",
  blocked: "Bloqués",
  rules: "Règles",
  back: "Retour",
  bookGone: "Ce cahier a disparu.",
  openingBook: "Ouverture du cahier…",
  letters: "Lettres",
  openingLetters: "Ouverture des lettres…",
  noLetters: "Aucune conversation. Ouvre un profil et touche Écrire.",
  letterOpen: "Conversation ouverte",
  startLetter: "Commence la lettre.",
  firstPage: "première page",
  howSign: "Comment signes-tu ?",
  signHint: "Ça apparaît sous le vers. Le @ est ta place sur l'étagère.",
  penName: "Nom de plume",
  userPh: "utilisateur",
  mold: "Moule du livre",
  saving: "Enregistrement…",
  enterShelf: "Entrer sur l'étagère",
  story: "Story",
  storyHint: "Elle part dans 24 heures. Une phrase suffit.",
  openingPage: "Ouverture de la page…",
  pageGone: "Cette page n'est plus là.",
  inMargin: "Dans la marge",
  margin: "Marge",
  marginEmpty: "Personne n'a encore écrit dans la marge.",
  storyGone: "Cette story n'est plus en ligne.",
  openingStory: "Ouverture…",
  kindPoem: "Poème",
  kindPhrase: "Phrase",
  kindThought: "Réflexion",
  kindSong: "Chanson",
  kindNote: "Note",
  lampOn: "Allumer la lampe",
  lampOff: "Revenir au jour",
  term1: "Tu entres avec ton nom et tu réponds de ce que tu publies.",
  term2: "Pas de harcèlement, de menace, de nudité, d'arnaque ni de contenu illégal.",
  term3: "La musique n'est qu'un court extrait, jusqu'à 4 lignes, écrit par toi. Pas de paroles entières ni de pochette officielle.",
  term4: "On peut signaler et bloquer. Trois personnes différentes signalant la même page la cachent aux autres.",
  term5: "Injures, menaces, haine, liens, spam et données personnelles ne sont pas publiés, même déguisés.",
};

const copy = { pt, en, es, fr };

export type CopyKey = keyof typeof pt;

const known: Record<string, CopyKey> = {
  "E-mail ou senha não batem.": "errEnter",
  "Já existe um caderno com esse e-mail.": "errEnter",
  "A senha precisa ter pelo menos 8 caracteres.": "errEmail",
  "Não deu pra entrar agora. Tenta de novo.": "errEnter",
  "Não deu pra entrar daqui. Tenta de novo.": "errEnter",
};

export function say(lang: Lang, message: string) {
  const key = known[message];
  return key ? copy[lang][key] : message;
}

type LangApi = {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: CopyKey) => string;
};

const LangContext = createContext<LangApi | null>(null);

function isLang(value: string | null): value is Lang {
  return value === "pt" || value === "en" || value === "es" || value === "fr";
}

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("pt");

  useEffect(() => {
    const saved = localStorage.getItem("entrelinha-lang");
    if (isLang(saved)) {
      setLangState(saved);
      return;
    }
    const nav = navigator.language.toLowerCase();
    if (nav.startsWith("en")) setLangState("en");
    else if (nav.startsWith("es")) setLangState("es");
    else if (nav.startsWith("fr")) setLangState("fr");
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang === "pt" ? "pt-BR" : lang;
    localStorage.setItem("entrelinha-lang", lang);
  }, [lang]);

  const api: LangApi = {
    lang,
    setLang: setLangState,
    t: (key) => copy[lang][key],
  };

  return <LangContext.Provider value={api}>{children}</LangContext.Provider>;
}

export function useLang() {
  const value = useContext(LangContext);
  if (!value) throw new Error("Fora do idioma");
  return value;
}

export function LangSwitch({ ink = false }: { ink?: boolean }) {
  const { lang, setLang, t } = useLang();
  return (
    <div className={ink ? "lang-switch on-ink" : "lang-switch"} role="group" aria-label={t("language")}>
      {LANGS.map((item) => (
        <button
          key={item.id}
          type="button"
          className={lang === item.id ? "on" : ""}
          aria-pressed={lang === item.id}
          onClick={() => setLang(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

export function kindLabel(lang: Lang, kind: string) {
  const map: Record<string, CopyKey> = {
    poema: "kindPoem",
    frase: "kindPhrase",
    reflexao: "kindThought",
    musica: "kindSong",
    nota: "kindNote",
  };
  const key = map[kind];
  return key ? copy[lang][key] : kind;
}
