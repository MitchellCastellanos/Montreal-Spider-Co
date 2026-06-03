import type { L } from "./types";

export interface CareSection {
  heading: L;
  body: L[];
}

export interface CareGuide {
  slug: string;
  title: L;
  summary: L;
  minRead: number;
  level: "beginner" | "intermediate" | "advanced";
  hue: number;
  sections: CareSection[];
}

export const CARE_GUIDES: CareGuide[] = [
  {
    slug: "beginner-setup",
    level: "beginner",
    minRead: 7,
    hue: 42,
    title: { en: "Your first terrestrial setup", fr: "Votre premier montage terrestre" },
    summary: {
      en: "Everything a new keeper needs to house a docile, ground-dwelling tarantula the right way.",
      fr: "Tout ce qu'un nouvel éleveur doit savoir pour loger correctement une mygale terrestre docile.",
    },
    sections: [
      {
        heading: { en: "Choosing an enclosure", fr: "Choisir un enclos" },
        body: [
          {
            en: "For terrestrial species, floor space matters more than height. A good rule of thumb is an enclosure roughly 3× the spider's leg span wide and no taller than 1.5× the leg span — a fall from too high can injure a heavy-bodied tarantula.",
            fr: "Pour les espèces terrestres, la surface au sol compte plus que la hauteur. Visez un enclos environ 3× l'envergure de la mygale en largeur et pas plus de 1,5× en hauteur — une chute de trop haut peut blesser une mygale au corps lourd.",
          },
          {
            en: "Cross-ventilation keeps the air fresh and prevents stuffy, mold-prone conditions. Make sure the lid latches securely — tarantulas are stronger and more determined than they look.",
            fr: "La ventilation croisée garde l'air sain et évite l'humidité stagnante propice aux moisissures. Assurez-vous que le couvercle se verrouille — les mygales sont plus fortes et déterminées qu'elles n'en ont l'air.",
          },
        ],
      },
      {
        heading: { en: "Substrate & furnishings", fr: "Substrat et aménagement" },
        body: [
          {
            en: "Use 8–12 cm of a coco-fibre and topsoil mix so your spider can burrow. Add a cork-bark hide and a shallow water dish. Skip heat lamps — room temperature between 22–27°C suits almost every beginner species.",
            fr: "Utilisez 8–12 cm d'un mélange de fibre de coco et de terreau pour permettre le terrier. Ajoutez une cachette en liège et un abreuvoir peu profond. Évitez les lampes chauffantes — une température ambiante de 22–27°C convient à presque toutes les espèces débutantes.",
          },
        ],
      },
      {
        heading: { en: "Settling in", fr: "L'acclimatation" },
        body: [
          {
            en: "Give your new spider a few days of quiet before the first feeding. Don't panic if it hides, refuses food, or seals its burrow — this is normal, especially before a molt.",
            fr: "Laissez à votre nouvelle mygale quelques jours de calme avant le premier repas. Pas de panique si elle se cache, refuse de manger ou bouche son terrier — c'est normal, surtout avant une mue.",
          },
        ],
      },
    ],
  },
  {
    slug: "arboreal-setup",
    level: "intermediate",
    minRead: 6,
    hue: 265,
    title: { en: "Setting up an arboreal", fr: "Aménager une arboricole" },
    summary: {
      en: "Tree-dwelling tarantulas need height, anchor points and serious ventilation. Here's how to get it right.",
      fr: "Les mygales arboricoles ont besoin de hauteur, de points d'ancrage et d'une vraie ventilation. Voici comment bien faire.",
    },
    sections: [
      {
        heading: { en: "Vertical space", fr: "L'espace vertical" },
        body: [
          {
            en: "Arboreal species like Caribena versicolor and Avicularia climb. Provide a tall enclosure with a vertical cork slab or branches reaching toward the lid, where they'll build a silken tube retreat.",
            fr: "Les espèces arboricoles comme Caribena versicolor et Avicularia grimpent. Offrez un enclos haut avec une plaque de liège verticale ou des branches montant vers le couvercle, où elles tisseront un tube-refuge.",
          },
        ],
      },
      {
        heading: { en: "Ventilation is everything", fr: "La ventilation avant tout" },
        body: [
          {
            en: "The most common cause of arboreal losses is stagnant, overly humid air. Aim for cross-ventilation (vents on opposite sides) and let the enclosure dry out between light mistings rather than keeping it constantly wet.",
            fr: "La cause la plus fréquente de pertes chez les arboricoles est un air stagnant et trop humide. Visez une ventilation croisée (aérations opposées) et laissez l'enclos sécher entre de légères pulvérisations plutôt que de le garder constamment mouillé.",
          },
        ],
      },
    ],
  },
  {
    slug: "feeding-molting",
    level: "beginner",
    minRead: 8,
    hue: 350,
    title: { en: "Feeding & the molt cycle", fr: "Alimentation et cycle de mue" },
    summary: {
      en: "How much to feed, what to offer, and how to support your spider through a molt safely.",
      fr: "Quelle quantité, quoi offrir, et comment accompagner votre mygale durant la mue en toute sécurité.",
    },
    sections: [
      {
        heading: { en: "What and how often", fr: "Quoi et à quelle fréquence" },
        body: [
          {
            en: "Offer appropriately sized feeders — roughly the size of the spider's abdomen. Slings eat every few days; juveniles weekly; adults every 1–2 weeks. A plump abdomen means a well-fed spider. Always remove uneaten prey within 24 hours.",
            fr: "Offrez des proies de taille adaptée — environ la taille de l'abdomen. Les jeunes mangent tous les quelques jours; les juvéniles, chaque semaine; les adultes, toutes les 1–2 semaines. Un abdomen dodu indique une mygale bien nourrie. Retirez toujours les proies non consommées en 24 heures.",
          },
        ],
      },
      {
        heading: { en: "Recognizing a pre-molt", fr: "Reconnaître la prémue" },
        body: [
          {
            en: "A tarantula entering pre-molt often refuses food, darkens in colour, and may seal itself away. Stop feeding and never disturb a spider that has flipped onto its back — it is molting, not dying.",
            fr: "Une mygale en prémue refuse souvent de manger, fonce en couleur et peut se cloîtrer. Cessez de nourrir et ne dérangez jamais une mygale retournée sur le dos — elle mue, elle ne meurt pas.",
          },
          {
            en: "After a molt, the new exoskeleton is soft. Wait at least a week (longer for large spiders) before offering food again so the fangs can harden.",
            fr: "Après la mue, le nouvel exosquelette est mou. Attendez au moins une semaine (davantage pour les grosses mygales) avant de renourrir, le temps que les crochets durcissent.",
          },
        ],
      },
    ],
  },
  {
    slug: "rehousing-safely",
    level: "intermediate",
    minRead: 5,
    hue: 175,
    title: { en: "Rehousing without stress", fr: "Déménager sans stress" },
    summary: {
      en: "A calm, repeatable method for moving your tarantula to a bigger home — safely for both of you.",
      fr: "Une méthode calme et reproductible pour déménager votre mygale dans un plus grand habitat — en sécurité pour vous deux.",
    },
    sections: [
      {
        heading: { en: "Prepare first", fr: "Préparez d'abord" },
        body: [
          {
            en: "Set up the new enclosure completely before you start. Work over a low, enclosed surface (like inside a large plastic tub) so an escapee has nowhere to bolt. Keep a catch cup and a soft brush on hand.",
            fr: "Montez entièrement le nouvel enclos avant de commencer. Travaillez au-dessus d'une surface basse et fermée (comme l'intérieur d'un grand bac) pour qu'une fugueuse n'ait nulle part où filer. Gardez un gobelet de capture et un pinceau doux à portée.",
          },
        ],
      },
      {
        heading: { en: "Gentle does it", fr: "Tout en douceur" },
        body: [
          {
            en: "Coax — never grab. Use the catch cup and gentle brush taps to guide the spider in, then transfer it to the new home. Move slowly and deliberately; sudden movements trigger defensive sprints.",
            fr: "Incitez — ne saisissez jamais. Utilisez le gobelet et de légers coups de pinceau pour guider la mygale, puis transférez-la. Bougez lentement et posément; les gestes brusques déclenchent des sprints défensifs.",
          },
        ],
      },
    ],
  },
  {
    slug: "advanced-husbandry",
    level: "advanced",
    minRead: 9,
    hue: 210,
    title: { en: "Old-world & advanced species", fr: "Espèces de l'Ancien Monde et avancées" },
    summary: {
      en: "Speed, potent venom and defensiveness — what to know before keeping advanced tarantulas.",
      fr: "Vitesse, venin puissant et défensivité — ce qu'il faut savoir avant de garder des mygales avancées.",
    },
    sections: [
      {
        heading: { en: "Respect the venom", fr: "Respectez le venin" },
        body: [
          {
            en: "Old-world species (Poecilotheria, Pterinochilus, Monocentropus) lack urticating hairs and rely on speed and a medically significant bite. A bite isn't life-threatening to a healthy adult, but can mean serious pain and cramping for days. These are strictly hands-off animals.",
            fr: "Les espèces de l'Ancien Monde (Poecilotheria, Pterinochilus, Monocentropus) n'ont pas de poils urticants et comptent sur leur vitesse et une morsure médicalement notable. Une morsure n'est pas mortelle pour un adulte en santé, mais peut causer douleur et crampes intenses pendant des jours. Ces animaux ne se manipulent jamais.",
          },
        ],
      },
      {
        heading: { en: "Enclosure security", fr: "Sécurité de l'enclos" },
        body: [
          {
            en: "Escape-proofing is non-negotiable. Use enclosures with minimal gaps and a locking lid, and always rehouse over a contained area. Keep a long catch cup and never put your hand inside without a clear plan.",
            fr: "L'inviolabilité est non négociable. Utilisez des enclos à interstices minimes avec couvercle verrouillable, et déménagez toujours au-dessus d'une zone confinée. Gardez un long gobelet de capture et n'introduisez jamais la main sans plan précis.",
          },
        ],
      },
    ],
  },
];

export function getCareGuide(slug: string): CareGuide | undefined {
  return CARE_GUIDES.find((g) => g.slug === slug);
}
