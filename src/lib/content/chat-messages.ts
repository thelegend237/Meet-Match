/**
 * Textes des messages automatiques et réponses rapides admin.
 * Ton chaleureux, humain, avec emojis — aligné sur la communication WhatsApp Meet & Match.
 */

/** Message de bienvenue envoyé à l'ouverture d'une discussion de match. */
export const MATCH_CHAT_WELCOME =
  "Bienvenue sur Meet & Match 💜\n\nNous espérons que vous trouveriez votre moitié ici. Une photo de profil nous aidera à mieux vous accompagner — n'hésitez pas à en ajouter une si ce n'est pas déjà fait.\n\nBonne journée 😊";

/** Intro personnalisée quand la discussion de match s'active (noms des membres). */
export function matchChatIntro(firstNameA: string, firstNameB: string): string {
  return (
    `Bonjour ${firstNameA} et ${firstNameB} 👋✨\n\n` +
    `Je suis ravie de vous mettre en contact ! D'après vos profils et vos attentes, nous pensons que vous pourriez vraiment bien vous entendre.\n\n` +
    `Prenez le temps d'échanger ici — nous sommes là si vous avez besoin de nous 💬`
  );
}

/** Clôture — match réussi (échange de coordonnées / belle connexion). */
export const MATCH_CHAT_CLOSE_SUCCESS =
  "Félicitations ! 🥳❤️\n\n" +
  "Votre échange était un beau premier pas vers une possible connexion. Nous sommes heureux d'avoir pu vous rapprocher et espérons que cette rencontre continuera sur une belle lancée. ✨\n\n" +
  "Puisque vous avez décidé d'échanger vos coordonnées, votre conversation sur Meet & Match sera maintenant fermée. À vous de faire vivre la suite ! ❤️";

export const MATCH_CHAT_CLOSE_SUCCESS_FAREWELL =
  "Merci d'avoir tenté l'aventure avec nous ! 🌸💕";

/** Clôture — match sans aboutissement. */
export const MATCH_CHAT_CLOSE_FAILED =
  "Même si cette rencontre n'a pas abouti à une connexion, chaque échange est une nouvelle expérience et une occasion de faire une belle rencontre. ❤️\n\n" +
  "Votre match est maintenant terminé. Qui sait ? La prochaine rencontre sera peut-être la bonne ! 🍀🤝";

/** Clôture — match annulé. */
export const MATCH_CHAT_CLOSE_CANCELLED =
  "Cette mise en relation est clôturée. Merci d'avoir tenté l'aventure avec Meet & Match ! 🌸💕\n\n" +
  "Nous restons à vos côtés pour la suite — n'hésitez pas à nous écrire si besoin.";

/** Rappel photo de profil (réponse rapide admin). */
export const ADMIN_REPLY_WELCOME_PHOTO =
  "Bienvenue sur Meet & Match 💜\n\nNous espérons que vous trouviez votre moitié ici. Une photo de profil nous aidera à mieux vous servir.\n\nBonne journée 😊";

/** Notifications in-app (titres + corps). */
export const NOTIF = {
  matchProposed: {
    title: "Un match pour vous ! 💫",
    body: "Notre équipe vous propose une mise en relation. Consultez votre espace Match pour la suite.",
  },
  chatOpened: {
    title: "Discussion ouverte 💬",
    body: "Votre conversation est prête — vous pouvez échanger avec votre match et notre équipe.",
  },
  matchSuccess: {
    title: "Match réussi ! 🥳",
    body: "Félicitations — votre mise en relation a abouti. Votre compte est en pause pendant que vous vivez cette belle histoire.",
  },
  matchFailed: {
    title: "Match terminé",
    body: "Cette rencontre n'a pas abouti, mais la prochaine pourrait être la bonne ! 🍀 Nous continuons à chercher pour vous.",
  },
  matchingPaymentRequired: {
    title: "Paiement matching 💳",
    body: "Votre mise en relation est prête. Finalisez les frais de matching pour ouvrir la discussion.",
  },
  matchingPaymentWaived: {
    title: "Match proposé ✨",
    body: "Un administrateur vous propose un match. Les frais de matching sont à la charge de la personne qui a liké en premier.",
  },
  matchingPaymentFree: {
    title: "Match offert 🎁",
    body: "Cette mise en relation est gratuite (essai ou offre en cours). Confirmez pour ouvrir la discussion !",
  },
} as const;

export interface AdminQuickReplyTemplate {
  id: string;
  label: string;
  content: string;
}

/** Réponses rapides admin — ton humain et bienveillant. */
export const ADMIN_CHAT_QUICK_REPLIES: AdminQuickReplyTemplate[] = [
  {
    id: "welcome",
    label: "Bienvenue",
    content: ADMIN_REPLY_WELCOME_PHOTO,
  },
  {
    id: "photo_missing",
    label: "Photo manquante",
    content:
      "Bonjour 👋\n\nMerci pour votre signalement. Nous avons bien noté : votre match n'a pas encore de photo de profil visible. Notre équipe va le contacter pour compléter son profil au plus vite 📸\n\nRestez disponible, nous revenons vers vous très rapidement !",
  },
  {
    id: "city_mismatch",
    label: "Ville incohérente",
    content:
      "Bonjour 👋\n\nMerci pour votre retour. Nous vérifions la localisation indiquée sur le profil de votre match 🗺️ Si une incohérence est confirmée, nous vous tiendrons informé(e) très vite.\n\nN'hésitez pas à nous préciser ce que vous avez constaté si ce n'est pas déjà fait.",
  },
  {
    id: "profile_incomplete",
    label: "Profil incomplet",
    content:
      "Bonjour 👋\n\nNous avons constaté que le profil de votre match n'est pas entièrement complété. Notre équipe l'invite à finaliser les informations manquantes (photo, bio, localisation…) avant de poursuivre sereinement la discussion ✨\n\nMerci de votre patience 🙏",
  },
  {
    id: "ask_details",
    label: "Demander des précisions",
    content:
      "Bonjour 👋\n\nPour intervenir efficacement, pourriez-vous nous préciser ce qui vous semble incohérent ou manquant (photo, ville, informations du profil, comportement) ? 💬\n\nDès réception de votre retour, notre équipe prend le relais.",
  },
  {
    id: "mediation",
    label: "Prise en charge",
    content:
      "Bonjour 👋\n\nNotre équipe prend en charge votre signalement et revient vers vous sous 24 à 48 h ⏳\n\nMerci de votre patience et de votre confiance 💜\n\nL'équipe Meet & Match",
  },
  {
    id: "rules_reminder",
    label: "Rappel bienveillance",
    content:
      "Bonjour 👋\n\nPetit rappel amical : les échanges se font dans le respect et la bienveillance 🤝 N'hésitez pas à nous signaler tout comportement inapproprié via ce fil — nous sommes là pour vous accompagner.\n\nBelle continuation ! ✨",
  },
  {
    id: "profile_updated",
    label: "Profil corrigé",
    content:
      "Bonjour 👋\n\nBonne nouvelle ! Nous avons contacté votre match concernant les éléments signalés. Le profil a été mis à jour ou est en cours de correction ✅\n\nN'hésitez pas à nous faire un retour si quelque chose vous semble encore incohérent.\n\nBelle continuation ! 💫",
  },
  {
    id: "close_success",
    label: "Clôture — match réussi",
    content: MATCH_CHAT_CLOSE_SUCCESS,
  },
  {
    id: "close_success_short",
    label: "Merci pour l'aventure",
    content: MATCH_CHAT_CLOSE_SUCCESS_FAREWELL,
  },
  {
    id: "close_failed",
    label: "Clôture — sans aboutissement",
    content: MATCH_CHAT_CLOSE_FAILED,
  },
  {
    id: "close_cancelled",
    label: "Clôture — annulé",
    content: MATCH_CHAT_CLOSE_CANCELLED,
  },
  {
    id: "encourage",
    label: "Encouragement",
    content:
      "Bonjour 👋\n\nChaque rencontre est une étape — prenez le temps de vous découvrir, sans pression. Nous sommes là si vous avez la moindre question 💜\n\nBelle journée ! ☀️",
  },
];
