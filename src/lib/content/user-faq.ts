/** FAQ membre — réutilisable sur le site, emails ou support. */

export type UserFaqItem = {
  id: string;
  question: string;
  answer: string;
};

export const USER_FAQ_ITEMS: UserFaqItem[] = [
  {
    id: "trial",
    question: "Y a-t-il une période d'essai ?",
    answer:
      "Oui. Chaque nouveau compte bénéficie de 14 jours gratuits : likes et mises en relation inclus. À la fin de l'essai, activez votre compte (paiement unique) pour continuer. Vous pouvez aussi payer avant la fin pour ne pas être interrompu.",
  },
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
      "Oui. Dès la création de votre compte, vous pouvez parcourir les profils. Pendant les 14 jours d'essai, vous pouvez aussi liker et accepter des matchs. Ensuite, l'activation payante est requise pour continuer à interagir.",
  },
  {
    id: "when-pay",
    question: "Quand dois-je payer ?",
    answer:
      "Après vos 14 jours d'essai (ou avant si vous le souhaitez). Les frais d'inscription débloquent likes et matching. Les frais de matching ne sont dus que lorsqu'un administrateur vous propose une mise en relation — sauf pendant l'essai, où ils sont offerts.",
  },
  {
    id: "registration-fee",
    question: "À quoi servent les frais d'inscription ?",
    answer:
      "C'est un paiement unique qui active durablement votre compte : likes, passes et accès aux matchs. Pendant l'essai de 14 jours, ces fonctions sont déjà disponibles. Le contact avec l'équipe reste toujours gratuit.",
  },
  {
    id: "matching-fee",
    question: "À quoi servent les frais de matching ?",
    answer:
      "Les frais de matching sont un service payé à chaque mise en relation proposée par l'équipe (pas un abonnement). Pendant l'essai, c'est gratuit. Ensuite : like sens unique = seul le liker paie ; like réciproque = les deux paient. Chaque match ouvre une discussion encadrée avec un administrateur.",
  },
  {
    id: "matching-credits",
    question: "Que se passe-t-il si un match échoue ?",
    answer:
      "Si un match n'aboutit pas, vous pourrez être proposé à un nouveau match. Les frais de matching s'appliquent à nouveau à chaque nouvelle mise en relation — ce n'est pas un abonnement, mais un service à la demande.",
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
      "Non. Aucun chat libre n'est possible entre deux membres qui ne se connaissent pas. Les seules conversations possibles sont : le contact avec l'équipe (gratuit) et la discussion encadrée après un match proposé et payé (like sens unique : seul le liker paie ; like réciproque : les deux).",
  },
  {
    id: "profiles-visible",
    question: "Quels profils puis-je voir ?",
    answer:
      "Vous voyez les membres actifs qui ont une photo sur leur profil et dont le compte est activé (inscription payée, essai en cours ou accès gratuit). Votre propre profil n'apparaît pas dans votre liste de découverte.",
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
      "Oui : 14 jours d'essai à l'inscription pour tous. En plus, l'administration peut accorder un accès gratuit prolongé (bêta testeurs, cas particuliers).",
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
2. **Profitez de 14 jours offerts** — likes et mises en relation inclus pendant l'essai.
3. **Parcourez les profils** — allez dans *Découvrir* ou *Rencontres*.
4. **Likez** les profils qui vous intéressent — notre équipe analyse les compatibilités.
5. **Match proposé** — pendant l'essai c'est gratuit ; ensuite les tarifs s'appliquent.
6. **Avant la fin de l'essai** — activez votre compte sur *Paiements* pour continuer sans interruption.

## À retenir

- Essai : **14 jours gratuits** pour chaque nouvel inscrit
- Consultation des profils : **gratuite**
- Likes et matching pendant l'essai : **inclus**
- Après l'essai : activation payante pour continuer
- Messages privés entre membres : **impossible**
- Contact avec l'équipe : **gratuit à tout moment**

## Liens utiles

- Fonctionnement : https://youmeetnmatch.com/fonctionnement
- Tarifs : https://youmeetnmatch.com/tarifs
- Contact : https://youmeetnmatch.com/contact

À très bientôt sur Meet & Match,
L'équipe Meet & Match
`;
