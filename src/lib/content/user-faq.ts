/** FAQ membre — réutilisable sur le site, emails ou support. */

export type UserFaqItem = {
  id: string;
  question: string;
  answer: string;
};

export const USER_FAQ_ITEMS: UserFaqItem[] = [
  {
    id: "beta-free",
    question: "Est-ce que Meet & Match est payant en ce moment ?",
    answer:
      "Non. Nous sommes en phase de test : l'inscription, l'activation du compte, les likes et les mises en relation (matching) sont entièrement gratuits. Nous vous préviendrons avant d'activer les tarifs définitifs et l'intégration des paiements réels (Stripe).",
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
      "Oui. Dès la création de votre compte et de votre profil, vous pouvez parcourir gratuitement les profils dans Découvrir et Rencontres. Vous voyez les photos, les informations et les préférences des membres actifs — sans pouvoir les contacter directement.",
  },
  {
    id: "when-pay",
    question: "Quand dois-je payer ?",
    answer:
      "Pendant la phase test, tout est gratuit : activez votre compte sans payer pour liker. Après le lancement officiel, les frais d'inscription débloqueront les interactions et les frais de matching ne seront dus que lorsqu'un administrateur vous propose une mise en relation.",
  },
  {
    id: "registration-fee",
    question: "À quoi servent les frais d'inscription ?",
    answer:
      "Pendant la phase test, l'activation est gratuite et débloque les likes, les passes et vos likes envoyés. À terme, ce paiement unique activera votre compte sur la plateforme. Le contact avec l'équipe Meet & Match reste toujours gratuit.",
  },
  {
    id: "matching-fee",
    question: "À quoi servent les frais de matching ?",
    answer:
      "En phase test, chaque match proposé par l'équipe est gratuit. Après le lancement, le premier match nécessitera les frais de matching, puis 3 mises en relation gratuites par mois. Chaque match ouvre une discussion encadrée avec un administrateur.",
  },
  {
    id: "matching-credits",
    question: "Que se passe-t-il si un match échoue ?",
    answer:
      "Si un match n'aboutit pas, votre prochain match peut utiliser un de vos crédits gratuits mensuels (3 par mois après votre premier paiement matching). Les crédits se renouvellent automatiquement chaque mois.",
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
3. **Activez votre compte** quand vous souhaitez liker — gratuit pendant la phase test, sur la page *Paiements*.
4. **Likez les profils** qui vous intéressent — notre équipe analyse les compatibilités.
5. **Match proposé** — si nous vous suggérons une rencontre, c'est gratuit en phase test (les tarifs définitifs seront communiqués plus tard).
6. **Discussion encadrée** — une conversation s'ouvre avec l'autre membre et un administrateur dès que le match est confirmé.

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
