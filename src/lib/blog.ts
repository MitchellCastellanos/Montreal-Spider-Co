import type { L } from "./types";

export interface BlogSection {
  heading: L;
  body: L[];
}

export interface BlogLink {
  label: L;
  href: string;
}

export interface BlogPost {
  slug: string;
  title: L;
  summary: L;
  category: L;
  minRead: number;
  publishedAt: string; // ISO date
  updatedAt: string; // ISO date
  sections: BlogSection[];
  relatedLinks: BlogLink[];
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "where-to-buy-a-tarantula-in-montreal",
    minRead: 7,
    publishedAt: "2026-09-01",
    updatedAt: "2026-09-01",
    title: {
      en: "Where to Buy a Tarantula in Montreal: The Complete Buyer's Guide",
      fr: "Où acheter une mygale à Montréal : le guide complet de l'acheteur",
    },
    category: { en: "Buying Guide", fr: "Guide d'achat" },
    summary: {
      en: "Pet shops, breeders, expos and online sellers all sell tarantulas in Montreal — here's how to tell a reputable source from a risky one before you buy.",
      fr: "Animaleries, éleveurs, expos et vendeurs en ligne vendent tous des mygales à Montréal — voici comment reconnaître une source fiable avant d'acheter.",
    },
    sections: [
      {
        heading: { en: "Your options for buying a tarantula in Montreal", fr: "Vos options pour acheter une mygale à Montréal" },
        body: [
          {
            en: "There are four common routes to owning a tarantula in the Montreal area: a general pet store that carries a handful of exotics, a reptile/invertebrate expo, a hobbyist breeder selling privately, or a specialist online shop. General pet stores rarely stock more than one or two common species and staff are usually generalists, not tarantula keepers — fine for a first impulse buy, less fine if you want accurate species ID, sexing, or husbandry advice. Expos are great for meeting sellers face to face but only run a few times a year. Specialist sellers and hobbyist breeders are where most serious keepers end up, because that's where the species selection, documentation and after-sale support actually live.",
            fr: "Il existe quatre façons courantes de se procurer une mygale dans la région de Montréal : une animalerie généraliste qui garde quelques exotiques, une expo reptiles/invertébrés, un éleveur amateur qui vend en privé, ou une boutique spécialisée en ligne. Les animaleries généralistes n'ont souvent qu'une ou deux espèces en stock et le personnel n'est pas toujours spécialisé en mygales — correct pour un achat impulsif, moins pour une identification précise, un sexage fiable ou de vrais conseils d'élevage. Les expos sont idéales pour rencontrer des vendeurs en personne, mais n'ont lieu que quelques fois par année. Les vendeurs spécialisés et les éleveurs amateurs sont là où finissent la plupart des passionnés sérieux, car c'est là que se trouvent réellement le choix d'espèces, la documentation et le suivi après-vente.",
          },
        ],
      },
      {
        heading: { en: "Why \"captive-bred\" and verified origin matter", fr: "Pourquoi « né en captivité » et l'origine vérifiée comptent" },
        body: [
          {
            en: "Captive-bred tarantulas are typically calmer, better acclimated, and free of the parasites or injuries that wild-caught imports can carry. For a handful of genera — Brachypelma from Mexico is the best-known example — international trade is also regulated under CITES, so paperwork tracing an animal's captive-bred lineage genuinely matters, not just as a nicety. This is the entire reason we run every specimen through TarantulApp's Verified Origin program rather than just taking a seller's word for it — worth asking any seller about, wherever you end up buying.",
            fr: "Les mygales nées en captivité sont généralement plus calmes, mieux acclimatées et exemptes des parasites ou blessures que peuvent porter les spécimens sauvages importés. Pour certains genres — Brachypelma du Mexique étant l'exemple le plus connu — le commerce international est aussi encadré par la CITES, donc la documentation retraçant la lignée captive d'un animal compte réellement, pas seulement comme un plus. C'est exactement pourquoi chaque spécimen que nous vendons passe par le programme Origine Vérifiée de TarantulApp plutôt que de se fier à la parole d'un vendeur — une question à poser à n'importe quel vendeur, peu importe où vous achetez finalement.",
          },
        ],
      },
      {
        heading: { en: "A quick checklist before you buy", fr: "Une checklist rapide avant d'acheter" },
        body: [
          {
            en: "Whoever you buy from, ask for: the correct scientific name (not just a common name — several unrelated species share the same nickname), the animal's approximate age or size, whether it's sexed and how confidently, and clear photos or video showing all eight legs intact and a full, rounded abdomen. A reputable seller will also tell you their live-arrival or DOA policy up front, without being asked twice.",
            fr: "Quel que soit le vendeur, demandez : le nom scientifique exact (pas seulement le nom commun — plusieurs espèces sans lien partagent le même surnom), l'âge ou la taille approximative de l'animal, si elle est sexée et avec quel degré de certitude, et des photos ou vidéos claires montrant les huit pattes intactes et un abdomen plein et arrondi. Un vendeur sérieux vous précisera aussi sa politique d'arrivée vivante ou de mortalité en transit sans qu'on ait à insister.",
          },
        ],
      },
      {
        heading: { en: "How pickup works once you've bought one in Montreal", fr: "Comment se passe la remise une fois l'achat fait à Montréal" },
        body: [
          {
            en: "We don't run a walk-in storefront — every order ships in insulated, climate-stable packaging and is handed to you in person, either at a free partner pickup point, at a metro station meetup near you, or at a custom location we agree on together. It keeps overhead (and prices) down and keeps the spider out of a hot or cold car trunk. Zones, fees and typical timing are on our Pickup & Meetup page, linked below.",
            fr: "Nous n'avons pas de comptoir physique — chaque commande voyage dans un emballage isolé et thermostable et vous est remise en main propre, soit dans un point de remise partenaire gratuit, soit lors d'une rencontre en station de métro près de chez vous, soit à un endroit convenu ensemble. Cela garde les coûts (et les prix) bas et évite à la mygale de passer par un coffre de voiture trop chaud ou trop froid. Les zones, les frais et les délais habituels se trouvent sur notre page Remise et rencontre, liée ci-dessous.",
          },
        ],
      },
    ],
    relatedLinks: [
      { label: { en: "Verified Origin", fr: "Origine Vérifiée" }, href: "/verified-origin" },
      { label: { en: "Pickup & Meetup", fr: "Remise et rencontre" }, href: "/delivery" },
      { label: { en: "Shop tarantulas", fr: "Voir les mygales" }, href: "/shop" },
    ],
  },
  {
    slug: "tarantula-pickup-points-metro-meetups-montreal",
    minRead: 6,
    publishedAt: "2026-09-04",
    updatedAt: "2026-09-04",
    title: {
      en: "Tarantula for Sale Near Me: How Pickup Points & Metro Meetups Work in Montreal",
      fr: "Mygale à vendre près de moi : comment fonctionnent les points de remise et les rencontres en métro à Montréal",
    },
    category: { en: "Local Guide", fr: "Guide local" },
    summary: {
      en: "No storefront to walk into — here's exactly how you get your spider in hand, whether you're on the Plateau, in Laval, or on the South Shore.",
      fr: "Pas de boutique où entrer — voici exactement comment récupérer votre mygale, que vous soyez sur le Plateau, à Laval ou sur la Rive-Sud.",
    },
    sections: [
      {
        heading: { en: "Why there's no storefront", fr: "Pourquoi il n'y a pas de boutique" },
        body: [
          {
            en: "Rent for a public-facing retail space in Montreal is expensive, and a busy storefront isn't actually a great environment for animals that prefer quiet, stable enclosures. Selling online and handing off in person — rather than displaying spiders on a shop floor — lets us keep prices competitive and keeps every animal in a controlled environment until it's in your hands.",
            fr: "Le loyer d'un local commercial à Montréal est coûteux, et une boutique achalandée n'est pas vraiment un environnement idéal pour des animaux qui préfèrent des enclos calmes et stables. Vendre en ligne et remettre en personne — plutôt que d'exposer les mygales en vitrine — nous permet de garder des prix compétitifs tout en gardant chaque animal dans un environnement contrôlé jusqu'à sa remise.",
          },
        ],
      },
      {
        heading: { en: "Option 1: Free pickup points", fr: "Option 1 : points de remise gratuits" },
        body: [
          {
            en: "Pickup points are trusted partner locations across Montreal and the surrounding area — not pet shops reselling our animals, but secure hand-off spots with set hours. Choose one at checkout and we'll message you once your order is ready to collect, usually within 3–7 days.",
            fr: "Les points de remise sont des emplacements partenaires de confiance à Montréal et dans les environs — ce ne sont pas des animaleries qui revendent nos animaux, mais des points de remise sécurisés avec des heures fixes. Choisissez-en un à la caisse et nous vous écrirons dès que votre commande est prête à récupérer, habituellement en 3 à 7 jours.",
          },
        ],
      },
      {
        heading: { en: "Option 2: Metro station meetups", fr: "Option 2 : rencontres en station de métro" },
        body: [
          {
            en: "Prefer to meet closer to home? Pick your area and station on our interactive metro map at checkout — coverage runs from the Southwest through Central Montreal, the North & East, and out to Laval and the South Shore, Monday to Saturday, 9:30 AM–4:30 PM. Fees scale with distance and are waived automatically once your order passes that zone's free threshold.",
            fr: "Vous préférez vous rencontrer plus près de chez vous? Choisissez votre secteur et votre station sur notre carte de métro interactive à la caisse — la couverture s'étend du Sud-Ouest au centre de Montréal, jusqu'au Nord-Est, à Laval et à la Rive-Sud, du lundi au samedi de 9h30 à 16h30. Les frais varient selon la distance et sont automatiquement annulés une fois le seuil gratuit de votre zone atteint.",
          },
        ],
      },
      {
        heading: { en: "Option 3: Custom meetup", fr: "Option 3 : rencontre sur mesure" },
        body: [
          {
            en: "Somewhere else entirely? Request a custom location at checkout and we'll confirm any extra fee before your order is fulfilled — useful if you're outside the mapped metro zones but still reasonably close to the city.",
            fr: "Ailleurs qu'à ces endroits? Demandez un lieu sur mesure à la caisse et nous confirmerons tout supplément avant que votre commande ne soit préparée — utile si vous êtes hors des zones de métro cartographiées, mais tout de même raisonnablement près de la ville.",
          },
        ],
      },
      {
        heading: { en: "Every hand-off is covered", fr: "Chaque remise est couverte" },
        body: [
          {
            en: "Whichever option you choose, transport happens in insulated, climate-stable packaging and every pickup or meetup is covered by our live-arrival guarantee. Full zone maps, fees and hours are on our Pickup & Meetup and Pickup Points pages, linked below.",
            fr: "Peu importe l'option choisie, le transport se fait dans un emballage isolé et thermostable, et chaque remise est couverte par notre garantie d'arrivée vivante. Les cartes complètes des zones, les frais et les heures se trouvent sur nos pages Remise et rencontre et Points de remise, liées ci-dessous.",
          },
        ],
      },
    ],
    relatedLinks: [
      { label: { en: "Pickup & Meetup", fr: "Remise et rencontre" }, href: "/delivery" },
      { label: { en: "Pickup Points", fr: "Points de remise" }, href: "/pickup-points" },
      { label: { en: "Shop tarantulas", fr: "Voir les mygales" }, href: "/shop" },
    ],
  },
  {
    slug: "best-beginner-tarantula-canada",
    minRead: 8,
    publishedAt: "2026-09-06",
    updatedAt: "2026-09-06",
    title: {
      en: "Best Beginner Tarantula Species for First-Time Owners in Canada",
      fr: "Meilleures mygales pour débutants au Canada",
    },
    category: { en: "Species Guide", fr: "Guide des espèces" },
    summary: {
      en: "Slow, docile, and forgiving of the odd husbandry mistake — these are the species Canadian keepers reach for first, and a few that should wait.",
      fr: "Lentes, dociles et tolérantes aux petites erreurs d'élevage — voici les espèces vers lesquelles se tournent d'abord les éleveurs canadiens, et quelques-unes à réserver pour plus tard.",
    },
    sections: [
      {
        heading: { en: "What actually makes a species \"beginner-friendly\"", fr: "Ce qui rend une espèce vraiment « débutant »" },
        body: [
          {
            en: "It's not just temperament. A good first species is also ground-dwelling (a fall from height is far more dangerous to a tarantula than most people expect), grows at a manageable pace, and tolerates a range of humidity and temperature without needing precision equipment. Availability matters too — a beginner species that's widely captive-bred is easier to source responsibly than a rare import.",
            fr: "Ce n'est pas qu'une question de tempérament. Une bonne première espèce vit au sol (une chute de hauteur est bien plus dangereuse pour une mygale que la plupart des gens ne le pensent), grandit à un rythme gérable, et tolère une plage d'humidité et de température sans exiger d'équipement de précision. La disponibilité compte aussi — une espèce débutante largement reproduite en captivité est plus facile à trouver de façon responsable qu'un import rare.",
          },
        ],
      },
      {
        heading: { en: "Four classic starter species", fr: "Quatre espèces classiques pour débuter" },
        body: [
          {
            en: "Grammostola pulchripes (Chaco golden knee) and Grammostola pulchra (Brazilian black) are famously calm, slow-moving terrestrial giants that rarely show defensive behaviour. Tliltocatl albopilosus (curly hair) is nearly as forgiving and tends to be more readily available. Brachypelma hamorii (Mexican redknee) is the classic \"textbook tarantula\" look — docile and long-lived, though as a CITES-listed genus it's worth confirming captive-bred, documented origin before you buy, which is exactly what our Verified Origin badge is built to confirm.",
            fr: "Grammostola pulchripes (genou doré du Chaco) et Grammostola pulchra (noire du Brésil) sont des géantes terrestres réputées calmes et lentes, montrant rarement un comportement défensif. Tliltocatl albopilosus (curly hair) est presque aussi tolérante et souvent plus facile à trouver. Brachypelma hamorii (genou rouge du Mexique) a l'allure classique de la « mygale de manuel » — docile et longévive, mais comme genre inscrit à la CITES, il vaut la peine de confirmer une origine captive documentée avant l'achat, exactement ce que vérifie notre badge Origine Vérifiée.",
          },
        ],
      },
      {
        heading: { en: "Species to hold off on for now", fr: "Espèces à remettre à plus tard" },
        body: [
          {
            en: "Fast, defensive Old World genera — Poecilotheria, Pterinochilus, and Monocentropus among them — lack urticating hairs and rely on speed and a medically significant bite instead. They're not \"more dangerous\" in a life-threatening sense for a healthy adult, but they demand faster reflexes, stricter enclosure security, and zero hands-in-enclosure habits. Worth working toward, not starting with — our advanced-husbandry guide, linked below, covers what changes once you get there.",
            fr: "Les genres rapides et défensifs de l'Ancien Monde — Poecilotheria, Pterinochilus et Monocentropus notamment — n'ont pas de poils urticants et comptent plutôt sur leur vitesse et une morsure médicalement notable. Ils ne sont pas « plus dangereux » au sens potentiellement mortel pour un adulte en santé, mais exigent des réflexes plus vifs, une sécurité d'enclos plus stricte et aucune manipulation à main nue. À viser plus tard, pas pour commencer — notre guide sur les espèces avancées, lié ci-dessous, couvre ce qui change une fois rendu là.",
          },
        ],
      },
      {
        heading: { en: "Where to go from here", fr: "Et ensuite?" },
        body: [
          {
            en: "Pair your first species with our beginner enclosure guide, and filter the shop to beginner-friendly, captive-bred specimens with current Montreal availability.",
            fr: "Associez votre première espèce à notre guide de montage pour débutants, et filtrez la boutique pour ne voir que les spécimens débutants, nés en captivité et actuellement disponibles à Montréal.",
          },
        ],
      },
    ],
    relatedLinks: [
      { label: { en: "Verified Origin", fr: "Origine Vérifiée" }, href: "/verified-origin" },
      { label: { en: "Beginner setup guide", fr: "Guide de montage débutant" }, href: "/care/beginner-setup" },
      { label: { en: "Advanced husbandry guide", fr: "Guide espèces avancées" }, href: "/care/advanced-husbandry" },
      { label: { en: "Shop beginner tarantulas", fr: "Voir les mygales débutantes" }, href: "/shop?experience=beginner" },
    ],
  },
  {
    slug: "are-tarantulas-good-pets-montreal",
    minRead: 6,
    publishedAt: "2026-09-08",
    updatedAt: "2026-09-08",
    title: {
      en: "Are Tarantulas Good Pets? What First-Time Owners in Montreal Should Know",
      fr: "Les mygales sont-elles de bons animaux de compagnie? Ce que les nouveaux propriétaires à Montréal devraient savoir",
    },
    category: { en: "Getting Started", fr: "Pour commencer" },
    summary: {
      en: "Quiet, low-maintenance, and apartment-friendly — tarantulas make an unusual amount of sense for Montreal renters. Here's the honest case, and the trade-offs.",
      fr: "Discrètes, peu exigeantes et parfaitement adaptées aux appartements — les mygales ont plus de sens qu'on le croit pour les locataires montréalais. Voici le portrait honnête, avantages et compromis.",
    },
    sections: [
      {
        heading: { en: "The case for a tarantula as a first exotic pet", fr: "Pourquoi une mygale comme premier animal exotique" },
        body: [
          {
            en: "A tarantula doesn't bark, doesn't need walks, and most beginner species eat once a week or less. For Montreal's many apartment and condo dwellers, that's a real advantage over a cat or dog — no noise complaints, no lease-breaking fur, and an enclosure that fits on a bookshelf. Lifespans vary a lot by species and sex: males of most species live only a few years, while unmated females of the calmer terrestrial species can live well over a decade, sometimes two.",
            fr: "Une mygale n'aboie pas, n'a pas besoin de sorties, et la plupart des espèces débutantes mangent une fois par semaine ou moins. Pour les nombreux locataires d'appartements et de condos à Montréal, c'est un réel avantage par rapport à un chat ou un chien — pas de plaintes de bruit, pas de poils qui posent problème au bail, et un enclos qui tient sur une étagère. La longévité varie énormément selon l'espèce et le sexe : les mâles de la plupart des espèces ne vivent que quelques années, tandis que les femelles non accouplées des espèces terrestres calmes peuvent vivre bien au-delà d'une décennie, parfois deux.",
          },
        ],
      },
      {
        heading: { en: "The honest trade-offs", fr: "Les compromis, honnêtement" },
        body: [
          {
            en: "Most beginner-friendly species aren't cuddly and don't want to be handled — the goal is a calm animal to observe, not one that sits in your palm. Molting can make a spider refuse food and hide for weeks at a time, which can worry a first-time keeper who doesn't know it's normal. And a long-lived female is a real multi-year (occasionally multi-decade) commitment, not an impulse purchase to reconsider next season.",
            fr: "La plupart des espèces débutantes ne sont pas câlines et ne veulent pas être manipulées — l'objectif est un animal calme à observer, pas un compagnon qui s'installe dans la paume. La mue peut faire refuser la nourriture et pousser une mygale à se cacher pendant des semaines, ce qui peut inquiéter un débutant qui ignore que c'est normal. Et une femelle longévive représente un engagement réel de plusieurs années (parfois plusieurs décennies), pas un achat impulsif à reconsidérer la saison suivante.",
          },
        ],
      },
      {
        heading: { en: "Is it actually legal to keep one here?", fr: "Est-ce vraiment légal d'en garder une ici?" },
        body: [
          {
            en: "Short answer: generally yes across Québec, with the usual caveat that lease and condo-board rules can be stricter than municipal law. We cover the details — permits, borough rules, and what to check with your landlord — on our dedicated Tarantula Laws in Québec page before you buy.",
            fr: "Réponse courte : généralement oui partout au Québec, avec la mise en garde habituelle que le bail ou le règlement de copropriété peut être plus strict que la loi municipale. Nous détaillons tout ça — permis, règles d'arrondissement, et ce qu'il faut vérifier avec votre propriétaire — sur notre page dédiée Lois sur les mygales au Québec avant d'acheter.",
          },
        ],
      },
      {
        heading: { en: "Ready to pick one out?", fr: "Prêt à en choisir une?" },
        body: [
          {
            en: "Start with our beginner species guide, then browse captive-bred, Verified Origin tarantulas currently available for pickup or metro meetup across Montreal.",
            fr: "Commencez par notre guide des espèces pour débutants, puis parcourez nos mygales nées en captivité, à origine vérifiée, actuellement disponibles en point de remise ou en rencontre de métro partout à Montréal.",
          },
        ],
      },
    ],
    relatedLinks: [
      { label: { en: "Tarantula Laws in Québec", fr: "Lois sur les mygales au Québec" }, href: "/legal" },
      { label: { en: "Best beginner species", fr: "Meilleures espèces débutantes" }, href: "/blog/best-beginner-tarantula-canada" },
      { label: { en: "Shop tarantulas", fr: "Voir les mygales" }, href: "/shop" },
    ],
  },
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}
