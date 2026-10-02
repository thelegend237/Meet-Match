/** Messages quotidiens : un seul est choisi par jour, le même pour tout le monde. */
export const COMMUNITY_NOTES: { title: string; content: string }[] = [
  {
    title: "On pense à vous",
    content:
      "L'équipe Meet & Match pense à vous aujourd'hui. Prenez un instant pour vous, et peut-être pour une belle rencontre.",
  },
  {
    title: "Vous n'êtes pas seul·e",
    content:
      "Chercher quelqu'un de sincère demande du courage. Nous sommes à vos côtés, à votre rythme.",
  },
  {
    title: "Une petite pensée",
    content:
      "Juste un mot pour vous dire que nous sommes là. Votre histoire compte, et nous veillons sur la communauté avec soin.",
  },
  {
    title: "Restez proche de vos envies",
    content:
      "Aujourd'hui, prenez une minute pour vous rappeler ce que vous attendez vraiment d'une rencontre. Nous sommes avec vous.",
  },
  {
    title: "On veille sur vous",
    content:
      "Meet & Match n'est pas un simple catalogue. Derrière l'écran, une équipe pense à vous et à des rencontres respectueuses.",
  },
  {
    title: "Bonjour de la part de l'équipe",
    content:
      "Nous espérons que votre journée commence doucement. Quand vous serez prêt·e, de nouveaux profils vous attendent.",
  },
  {
    title: "Votre place est ici",
    content:
      "Vous faites partie de Meet & Match, et ça nous tient à cœur. Passez quand vous voulez, sans pression.",
  },
  {
    title: "Un message pour vous",
    content:
      "Nous pensons aux personnes qui cherchent une relation vraie. Vous en faites partie, et nous ne l'oublions pas.",
  },
  {
    title: "Prenez soin de vous",
    content:
      "Avant de chercher l'autre, offrez-vous un peu de douceur aujourd'hui. L'équipe reste présente pour la suite.",
  },
  {
    title: "On est là, tout simplement",
    content:
      "Pas de course, pas d'obligation. Juste un rappel : nous pensons à vous et nous restons disponibles.",
  },
  {
    title: "Une rencontre peut commencer ici",
    content:
      "Quelque part, quelqu'un cherche aussi une relation sincère. Nous sommes avec vous pour que ce moment arrive bien.",
  },
  {
    title: "Merci d'être là",
    content:
      "Votre présence donne du sens à Meet & Match. Aujourd'hui encore, l'équipe pense à vous.",
  },
];

/** Jour calendaire à Douala, pour n'envoyer qu'un message par journée locale. */
export function communityNoteDay(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Douala",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

export function communityNoteForDay(day: string) {
  let hash = 0;
  for (let i = 0; i < day.length; i++) {
    hash = (hash * 33 + day.charCodeAt(i)) >>> 0;
  }
  return COMMUNITY_NOTES[hash % COMMUNITY_NOTES.length];
}
