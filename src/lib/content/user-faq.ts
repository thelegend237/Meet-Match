/** FAQ membre — réutilisable sur le site, emails ou support. */

export type UserFaqItem = {
  id: string;
  question: string;
  answer: string;
};

export const USER_FAQ_ITEMS: UserFaqItem[] = [
  {
    id: "what-is",
    question: "En quoi Meet & Match est différent des autres apps de rencontre ?",
    answer:
      "Meet & Match n'est pas une application de chat libre. Vous ne pouvez jamais écrire directement à un autre membre. Vous consultez des profils, vous exprimez votre intérêt par des likes, et notre équipe analyse les compatibilités avant de proposer une mise en relation encadrée.",
  },
  {
    id: "browse-free",
    question: "Puis-je voir les profils sans payer ?",
    answer:
      "Oui. Dès la création de votre compte et de votre profil, vous pouvez parcourir gratuitement les profils dans Découvrir et Rencontres. Vous voyez les photos, les informations et les préférences des membres actifs — sans pouvoir les contacter directement.",
  },
  {
    id: "when-pay",
    question: "Quand dois-je payer ?",
    answer:
      "Deux paiements distincts existent. Les frais d'inscription débloquent les interactions (likes, passes, mes likes). Les frais de matching ne sont dus que lorsqu'un administrateur vous propose une mise en relation — jamais avant.",
  },
  {
    id: "registration-fee",
    question: "À quoi servent les frais d'inscription ?",
    answer:
      "Ils activent votre compte sur la plateforme : envoyer des likes, passer des profils, consulter vos likes envoyés et être pris en compte par l'équipe pour une future mise en relation. Le contact avec l'équipe Meet & Match reste gratuit.",
  },
  {
    id: "matching-fee",
    question: "À quoi servent les frais de matching ?",
    answer:
      "Lorsqu'un administrateur juge deux profils compatibles, il vous propose un match. Chaque personne règle alors ses frais de matching (sauf accès gratuit accordé par l'administration). Une fois les deux paiements validés, une discussion de groupe s'ouvre avec un administrateur présent.",
  },
  {
    id: "like-reciproque",
    question: "Si deux personnes se likent, est-ce un match automatique ?",
    answer:
      "Non. Un like réciproque alerte notre équipe, mais chaque mise en relation est validée manuellement par un administrateur. Nous analysons les profils, les attentes et la compatibilité avant de proposer un match.",
  },
  {
    id: "message-prive",
    question: "Puis-je envoyer un message privé à quelqu'un ?",
    answer:
      "Non. Aucun chat libre n'est possible entre deux membres qui ne se connaissent pas. Les seules conversations possibles sont : le contact avec l'équipe (gratuit) et la discussion encadrée après un match proposé et payé par les deux parties.",
  },
  {
    id: "profiles-visible",
    question: "Quels profils puis-je voir ?",
    answer:
      "Vous voyez les membres actifs qui ont une photo sur leur profil et dont le compte est activé (inscription payée ou accès gratuit). Votre propre profil n'apparaît pas dans votre liste de découverte.",
  },
  {
    id: "photo-required",
    question: "Pourquoi une photo est-elle obligatoire ?",
    answer:
      "Pour garantir des profils authentiques et une expérience de confiance. Une photo est demandée à la fin de l'inscription. Pour envoyer des likes, vous devez également avoir une photo sur votre profil.",
  },
  {
    id: "free-access",
    question: "Peut-on bénéficier d'un accès gratuit ?",
    answer:
      "Oui. L'administration peut accorder un accès gratuit à l'inscription, au matching ou les deux (bêta testeurs, cas particuliers). Dans ce cas, les étapes de paiement correspondantes sont automatiquement débloquées.",
  },
  {
    id: "contact-team",
    question: "Comment contacter l'équipe ?",
    answer:
      "À tout moment via la page Contact du site. C'est gratuit et sans engagement. Notre équipe répond à vos questions sur le fonctionnement, votre profil ou vos paiements.",
  },
];

/** Texte prêt à coller dans un email de bienvenue (Markdown). */
export const WELCOME_EMAIL_MARKDOWN = `# Bienvenue sur Meet & Match

Bonjour,

Merci d'avoir rejoint Meet & Match. Voici comment profiter de la plateforme en quelques minutes.

## Ce qui vous attend

Meet & Match est une plateforme de rencontre **sérieuse et encadrée** : pas de chat libre entre inconnus, chaque mise en relation est validée par notre équipe.

## Vos premières étapes

1. **Complétez votre profil** — photo, bio, attentes et préférences.
2. **Parcourez gratuitement** — allez dans *Découvrir* ou *Rencontres* pour voir les profils des membres actifs.
3. **Activez votre compte** quand vous souhaitez liker — frais d'inscription sur la page *Paiements*.
4. **Likez les profils** qui vous intéressent — notre équipe analyse les compatibilités.
5. **Match proposé** — si nous vous suggérons une rencontre, les frais de matching s'appliquent alors (uniquement à ce moment-là).
6. **Discussion encadrée** — après paiement des deux côtés, une conversation s'ouvre avec l'autre membre et un administrateur.

## À retenir

- Consultation des profils : **gratuite**
- Likes et interactions : **après activation du compte**
- Messages privés entre membres : **impossible**
- Contact avec l'équipe : **gratuit à tout moment**

## Liens utiles

- Fonctionnement : https://meet-and-match.vercel.app/fonctionnement
- Tarifs : https://meet-and-match.vercel.app/tarifs
- Contact : https://meet-and-match.vercel.app/contact

À très bientôt sur Meet & Match,
L'équipe Meet & Match
`;
