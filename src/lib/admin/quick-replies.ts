export interface AdminQuickReply {
  id: string;
  label: string;
  content: string;
}

/** Messages prédéfinis pour interventions admin dans les discussions de match. */
export const ADMIN_QUICK_REPLIES: AdminQuickReply[] = [
  {
    id: "photo_missing",
    label: "Photo manquante",
    content:
      "Bonjour,\n\nMerci pour votre signalement. Nous avons pris note : votre match ne dispose pas encore de photo de profil visible. Notre équipe va contacter cette personne pour lui demander de compléter son profil dans les meilleurs délais.\n\nRestez disponible, nous revenons vers vous rapidement.",
  },
  {
    id: "city_mismatch",
    label: "Ville incohérente",
    content:
      "Bonjour,\n\nMerci pour votre retour. Nous vérifions la localisation indiquée sur le profil de votre match. Si une incohérence est confirmée, nous reviendrons vers vous rapidement avec une mise à jour.\n\nN'hésitez pas à nous préciser ce que vous avez constaté si ce n'est pas déjà fait.",
  },
  {
    id: "profile_incomplete",
    label: "Profil incomplet",
    content:
      "Bonjour,\n\nNous avons constaté que le profil de votre match n'est pas entièrement complété. Notre équipe invite votre match à finaliser les informations manquantes (photo, bio, localisation…) avant de poursuivre sereinement la discussion.\n\nMerci de votre patience.",
  },
  {
    id: "ask_details",
    label: "Demander des précisions",
    content:
      "Bonjour,\n\nPour intervenir efficacement, pourriez-vous nous préciser ce qui vous semble incohérent ou manquant (photo, ville, informations du profil, comportement) ?\n\nDès réception de votre retour, notre équipe prendra le relais.",
  },
  {
    id: "mediation",
    label: "Prise en charge",
    content:
      "Bonjour,\n\nNotre équipe prend en charge votre signalement et revient vers vous sous 24 à 48 h. Merci de votre patience et de votre confiance.\n\nMeet & Match",
  },
  {
    id: "rules_reminder",
    label: "Rappel bienveillance",
    content:
      "Bonjour,\n\nRappel amical : les échanges se font dans le respect et la bienveillance. N'hésitez pas à nous signaler tout comportement inapproprié via ce fil — nous sommes là pour vous accompagner.\n\nBonne continuation.",
  },
  {
    id: "profile_updated",
    label: "Profil corrigé",
    content:
      "Bonjour,\n\nNous avons contacté votre match concernant les éléments signalés. Le profil a été mis à jour ou est en cours de correction. N'hésitez pas à nous faire un retour si quelque chose vous semble encore incohérent.\n\nBonne continuation.",
  },
];
