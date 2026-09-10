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
  {
    slug: "how-long-do-tarantulas-live",
    minRead: 7,
    publishedAt: "2026-09-10",
    updatedAt: "2026-09-10",
    title: {
      en: "How Long Do Tarantulas Live? Longer Than You Think",
      fr: "Combien de temps vivent les mygales? Bien plus longtemps qu'on ne le croit",
    },
    category: { en: "Tarantula 101", fr: "Mygale 101" },
    summary: {
      en: "Lifespan swings wildly by species and sex — but some of the most common pet tarantulas are widely reported to live 20 to 30 years, occasionally longer.",
      fr: "L'espérance de vie varie énormément selon l'espèce et le sexe — mais certaines des mygales de compagnie les plus courantes sont largement reconnues pour vivre de 20 à 30 ans, parfois plus.",
    },
    sections: [
      {
        heading: { en: "It depends — a lot — on species and sex", fr: "Ça dépend — beaucoup — de l'espèce et du sexe" },
        body: [
          {
            en: "\"How long does a tarantula live?\" doesn't have one answer, and that's the first thing that surprises new keepers. Depending on the species and whether you're holding a male or a female (not sure which you have? see our guide on how to sex a tarantula), the honest range runs from under two years to over three decades in the same family of animals. It's less like asking how long a \"dog\" lives and more like asking how long a \"mammal\" lives — the category is doing a lot of hiding.",
            fr: "« Combien de temps vit une mygale? » n'a pas une seule réponse, et c'est la première chose qui surprend les nouveaux éleveurs. Selon l'espèce et selon qu'on parle d'un mâle ou d'une femelle (vous ne savez pas lequel vous avez? voyez notre guide pour sexer une mygale), la fourchette honnête va de moins de deux ans à plus de trois décennies, au sein de la même famille d'animaux. C'est moins comme demander combien de temps vit un « chien » et plus comme demander combien de temps vit un « mammifère » — la catégorie cache énormément de variation.",
          },
        ],
      },
      {
        heading: { en: "Meet the true veterans", fr: "Les vraies vétéranes" },
        body: [
          {
            en: "A handful of genera have built the hobby's reputation for longevity. Female Brachypelma (Mexican redknee and relatives), Aphonopelma (several North American species), and Grammostola (Chaco golden knee, Brazilian black) are widely reported by long-time keepers to reach 20 to 30 years in captivity, with some well-documented individuals reportedly living longer still. These are exactly the calm, slow-growing terrestrial species that also tend to top beginner recommendation lists — longevity and easy temperament tend to travel together.",
            fr: "Une poignée de genres ont bâti la réputation de longévité du loisir. Les femelles Brachypelma (genou rouge du Mexique et espèces apparentées), Aphonopelma (plusieurs espèces nord-américaines) et Grammostola (genou doré du Chaco, noire du Brésil) sont largement reconnues par les éleveurs chevronnés pour atteindre 20 à 30 ans en captivité, certains individus bien documentés ayant apparemment vécu encore plus longtemps. Ce sont justement les espèces terrestres calmes et à croissance lente qui dominent aussi les listes de recommandations pour débutants — longévité et tempérament facile ont tendance à aller de pair.",
          },
        ],
      },
      {
        heading: { en: "Why males live so much shorter", fr: "Pourquoi les mâles vivent tellement moins longtemps" },
        body: [
          {
            en: "Here's the twist that catches almost everyone off guard: in most species, males stop molting once they reach maturity — you can usually tell by hook-like structures on their front legs — and from that point on, it's a countdown. A mature male typically has somewhere between six months and two years left, driven by an internal clock built entirely around finding a mate before time runs out. Females, by contrast, keep molting and growing for years, which is a big part of why they live so much longer.",
            fr: "Voici le détail qui surprend presque tout le monde : chez la plupart des espèces, les mâles cessent de muer une fois matures — on le remarque souvent à des crochets sur leurs pattes avant — et à partir de là, c'est un compte à rebours. Un mâle mature a généralement entre six mois et deux ans devant lui, poussé par une horloge interne entièrement tournée vers la recherche d'une partenaire avant la fin du temps imparti. Les femelles, elles, continuent de muer et de grandir pendant des années, ce qui explique en grande partie leur bien plus grande longévité.",
          },
        ],
      },
      {
        heading: { en: "What actually determines a long life", fr: "Ce qui détermine vraiment une longue vie" },
        body: [
          {
            en: "Three things stack the odds in your favour: picking a naturally long-lived species to begin with, keeping a female rather than a male if longevity is the goal, and stable, low-stress husbandry — consistent temperature, appropriately spaced feeding, and an enclosure sized and set up correctly for that species. None of it requires special equipment; it's closer to \"don't overthink it\" than \"buy more gear.\"",
            fr: "Trois choses jouent en votre faveur : choisir dès le départ une espèce naturellement longévive, garder une femelle plutôt qu'un mâle si la longévité est l'objectif, et offrir un élevage stable et peu stressant — température constante, alimentation bien espacée et enclos correctement dimensionné et aménagé pour l'espèce. Rien de tout ça n'exige d'équipement spécial; c'est plus proche de « ne pas trop compliquer les choses » que de « acheter plus de matériel ».",
          },
        ],
      },
      {
        heading: { en: "So which one do you actually have?", fr: "Alors, lequel avez-vous vraiment?" },
        body: [
          {
            en: "Since a male and a female of the same species can have wildly different futures ahead of them, sexing matters — and it's its own small skill inside the hobby, with a genuinely safe method and a few unreliable shortcuts to avoid. We break down exactly how it's done in our dedicated guide, linked below.",
            fr: "Puisqu'un mâle et une femelle de la même espèce peuvent avoir des avenirs radicalement différents, le sexage compte — et c'est tout un petit savoir-faire du loisir, avec une méthode réellement sûre et quelques raccourcis peu fiables à éviter. Nous détaillons exactement comment procéder dans notre guide dédié, lié ci-dessous.",
          },
        ],
      },
    ],
    relatedLinks: [
      { label: { en: "How to sex a tarantula", fr: "Comment sexer une mygale" }, href: "/blog/how-to-sex-a-tarantula-molt-method" },
      { label: { en: "Best beginner species", fr: "Meilleures espèces débutantes" }, href: "/blog/best-beginner-tarantula-canada" },
      { label: { en: "Beginner setup guide", fr: "Guide de montage débutant" }, href: "/care/beginner-setup" },
      { label: { en: "Shop tarantulas", fr: "Voir les mygales" }, href: "/shop" },
    ],
  },
  {
    slug: "how-big-do-tarantulas-get-dwarf-vs-giant-species",
    minRead: 8,
    publishedAt: "2026-09-11",
    updatedAt: "2026-09-11",
    title: {
      en: "How Big Do Tarantulas Get? Dwarf Species, Giants, and Wildly Different Growth Rates",
      fr: "Quelle taille atteignent les mygales? Espèces naines, géantes et croissances radicalement différentes",
    },
    category: { en: "Tarantula 101", fr: "Mygale 101" },
    summary: {
      en: "From coin-sized dwarfs to dinner-plate giants — and from species that grow up in two years to species that take a decade. Size and speed are two very different questions.",
      fr: "Des naines de la taille d'une pièce de monnaie aux géantes grandes comme une assiette — et des espèces qui atteignent l'âge adulte en deux ans à celles qui prennent une décennie. Taille et vitesse de croissance sont deux questions bien différentes.",
    },
    sections: [
      {
        heading: { en: "From coin-sized to dinner-plate", fr: "De la pièce de monnaie à l'assiette" },
        body: [
          {
            en: "Keepers measure tarantula size as diagonal leg span (DLS) — tip of one front leg to tip of the opposite back leg — not body length, since the legs do most of the visual work. At the small end, dwarf genera like Cyriocosmus and Hapalotremus top out around 2–4 cm DLS as adults — some of the smallest are barely bigger than a housefly. At the other extreme, Theraphosa (the Goliath birdeater) can reach roughly 28–30 cm DLS and is, by mass, the heaviest spider on Earth.",
            fr: "Les éleveurs mesurent la taille d'une mygale par l'envergure diagonale des pattes (DLS) — de la pointe d'une patte avant à la pointe de la patte arrière opposée — plutôt que par la longueur du corps, car ce sont les pattes qui font l'essentiel de l'effet visuel. Du côté miniature, des genres nains comme Cyriocosmus et Hapalotremus plafonnent autour de 2 à 4 cm de DLS à l'âge adulte — certaines des plus petites sont à peine plus grosses qu'une mouche domestique. À l'autre extrême, Theraphosa (la mygale Goliath) peut atteindre environ 28 à 30 cm de DLS et est, en masse, l'araignée la plus lourde sur Terre.",
          },
        ],
      },
      {
        heading: { en: "Fast growers vs. slow growers", fr: "Croissance rapide vs. croissance lente" },
        body: [
          {
            en: "Final size and growth speed are separate traits, and mixing them up trips up a lot of new keepers. Acanthoscurria geniculata (Brazilian Giant Whiteknee) is a genuine giant that's also famous for growing up fast — a well-fed specimen can reach an impressive adult size in as little as two to three years, making it a favourite for keepers who want a big spider without a decade of waiting. Compare that to many Aphonopelma or Brachypelma species, which grow at a fraction of that pace and can take eight to ten years — sometimes longer — to reach full maturity.",
            fr: "Taille finale et vitesse de croissance sont deux caractéristiques distinctes, et les confondre déroute beaucoup de nouveaux éleveurs. Acanthoscurria geniculata (la géante à genoux blancs du Brésil) est une vraie géante réputée aussi pour sa croissance rapide — un spécimen bien nourri peut atteindre une taille adulte impressionnante en seulement deux à trois ans, ce qui en fait une favorite pour ceux qui veulent une grosse mygale sans attendre une décennie. À comparer avec plusieurs espèces d'Aphonopelma ou de Brachypelma, qui grandissent à une fraction de ce rythme et peuvent prendre huit à dix ans — parfois plus — avant d'atteindre leur pleine maturité.",
          },
        ],
      },
      {
        heading: { en: "Why growth speed varies so much", fr: "Pourquoi la vitesse de croissance varie autant" },
        body: [
          {
            en: "Species biology sets the baseline metabolic rate, but feeding frequency, temperature, and sex all shift the timeline. Warmer conditions and more frequent meals speed things up within a species' natural range (never past it); males of most species race toward maturity because their post-maturity clock is short, while females can afford to grow at a more leisurely pace since they have years, not months, ahead of them.",
            fr: "La biologie de l'espèce fixe le métabolisme de base, mais la fréquence des repas, la température et le sexe modifient tous le calendrier. Des conditions plus chaudes et des repas plus fréquents accélèrent les choses à l'intérieur de la plage naturelle de l'espèce (jamais au-delà); les mâles de la plupart des espèces se précipitent vers la maturité parce que leur horloge post-maturité est courte, tandis que les femelles peuvent se permettre une croissance plus tranquille puisqu'elles ont des années, pas des mois, devant elles.",
          },
        ],
      },
      {
        heading: { en: "Picking a species by size expectations", fr: "Choisir une espèce selon la taille attendue" },
        body: [
          {
            en: "Before you fall for a photo, think about what full-grown actually means for enclosure size, feeding cost, and how long you'll wait to see it. A dwarf species is a tiny, long-term commitment that never needs much room; a fast-growing giant like A. geniculata delivers dramatic size within a few years; a slow giant asks for patience over the better part of a decade. All three are valid choices — they're just very different experiences.",
            fr: "Avant de craquer pour une photo, réfléchissez à ce que « taille adulte » signifie vraiment pour la taille de l'enclos, le coût de l'alimentation et le temps d'attente avant d'en profiter pleinement. Une espèce naine est un engagement minuscule et à long terme qui ne demande jamais beaucoup d'espace; une géante à croissance rapide comme A. geniculata offre une taille spectaculaire en quelques années; une géante à croissance lente demande de la patience pendant près d'une décennie. Les trois sont des choix valables — ce sont simplement des expériences très différentes.",
          },
        ],
      },
    ],
    relatedLinks: [
      { label: { en: "Best beginner species", fr: "Meilleures espèces débutantes" }, href: "/blog/best-beginner-tarantula-canada" },
      { label: { en: "Beginner setup guide", fr: "Guide de montage débutant" }, href: "/care/beginner-setup" },
      { label: { en: "Arboreal setup guide", fr: "Guide de montage arboricole" }, href: "/care/arboreal-setup" },
      { label: { en: "Shop tarantulas", fr: "Voir les mygales" }, href: "/shop" },
    ],
  },
  {
    slug: "do-tarantula-keepers-handle-their-tarantulas",
    minRead: 7,
    publishedAt: "2026-09-12",
    updatedAt: "2026-09-12",
    title: {
      en: "Do Tarantula Keepers Actually Handle Their Spiders?",
      fr: "Les éleveurs manipulent-ils vraiment leurs mygales?",
    },
    category: { en: "Myth-Busting", fr: "Mythes déconstruits" },
    summary: {
      en: "Rarely — and that's the point. A tarantula is less a pet you cuddle and more a piece of another part of the world you keep and observe.",
      fr: "Rarement — et c'est justement le but. Une mygale, ce n'est pas tant un animal qu'on câline qu'un fragment d'ailleurs qu'on héberge et qu'on observe.",
    },
    sections: [
      {
        heading: { en: "The short answer: rarely, and mostly no", fr: "Réponse courte : rarement, et souvent non" },
        body: [
          {
            en: "Most experienced keepers handle their tarantulas occasionally at most — some, especially with faster or more defensive species, never do. That surprises people who picture a tarantula as something you pick up and let walk across your hand. In practice, the hobby is built around a different kind of relationship: you watch, you maintain the enclosure, and the spider does its own thing.",
            fr: "La plupart des éleveurs expérimentés manipulent leurs mygales tout au plus occasionnellement — certains, surtout avec des espèces plus rapides ou défensives, ne le font jamais. Ça surprend les gens qui imaginent une mygale comme quelque chose qu'on ramasse et qu'on laisse marcher sur sa main. En pratique, le loisir repose sur un tout autre type de relation : on observe, on entretient l'enclos, et la mygale vaque à ses occupations.",
          },
        ],
      },
      {
        heading: { en: "It's not about fear — it's what's good for the spider", fr: "Ce n'est pas une question de peur — c'est ce qui convient à la mygale" },
        body: [
          {
            en: "Rare bites aside, the bigger reason keepers keep hands out of the enclosure is the animal's own safety. A tarantula's exoskeleton is surprisingly fragile — a fall of even a modest height can rupture the abdomen and be fatal, and there's no vet fix for that. Many New World species also flick urticating hairs when stressed, which is unpleasant for you and taxing for them. Minimal handling isn't caution for caution's sake; it's the actual best practice.",
            fr: "Les morsures, rares, mises à part, la principale raison pour laquelle les éleveurs gardent leurs mains hors de l'enclos est la sécurité de l'animal lui-même. L'exosquelette d'une mygale est étonnamment fragile — une chute même modeste peut rompre l'abdomen et être fatale, et il n'existe aucun remède vétérinaire pour ça. Beaucoup d'espèces du Nouveau Monde projettent aussi des poils urticants quand elles sont stressées, ce qui est désagréable pour vous et éprouvant pour elles. Le peu de manipulation n'est pas de la prudence pour la prudence; c'est réellement la meilleure pratique.",
          },
        ],
      },
      {
        heading: { en: "Think \"living art,\" not \"cuddly pet\"", fr: "Pensez « œuvre vivante », pas « animal câlin »" },
        body: [
          {
            en: "The keepers who love this hobby most tend to describe it less like owning a dog and more like bringing a small, living piece of another part of the world into their home — something to give the best possible care to, then sit back and watch. There's no neediness to manage, no affection to earn. The reward is different: a quiet, self-contained animal doing exactly what its wild ancestors have done for millions of years, a few feet from your couch.",
            fr: "Les éleveurs les plus passionnés décrivent souvent ce loisir moins comme posséder un chien que comme accueillir chez soi un petit fragment vivant d'ailleurs — un être à qui offrir les meilleurs soins possibles, puis à observer tranquillement. Pas de besoin affectif à combler, pas d'affection à mériter. La récompense est différente : un animal discret et autosuffisant qui fait exactement ce que ses ancêtres sauvages font depuis des millions d'années, à quelques pas de votre salon.",
          },
        ],
      },
      {
        heading: { en: "The behaviours that make it worth watching", fr: "Les comportements qui valent le coup d'œil" },
        body: [
          {
            en: "This is where the hobby gets genuinely fascinating, because \"tarantula\" hides an enormous amount of variety. Arboreal species like Avicularia spin elaborate silk tube nests high in their enclosure; fossorial species dig extensive burrow systems and are rarely seen above ground; some dwarf species spend nearly their whole lives tucked under bark or leaf litter; bold terrestrial species patrol the surface and web-line every surface they touch. No two enclosures behave quite the same way, and that's before you've picked a favourite.",
            fr: "C'est ici que le loisir devient vraiment fascinant, car le mot « mygale » cache une variété impressionnante. Les espèces arboricoles comme Avicularia tissent d'élaborats tubes de soie en hauteur dans leur enclos; les espèces fouisseuses creusent de vastes réseaux de terriers et se montrent rarement en surface; certaines espèces naines passent presque toute leur vie cachées sous l'écorce ou la litière; les espèces terrestres audacieuses patrouillent en surface et tapissent de soie chaque recoin qu'elles touchent. Aucun enclos ne se comporte tout à fait comme un autre, et ça, c'est avant même d'avoir une préférée.",
          },
        ],
      },
    ],
    relatedLinks: [
      { label: { en: "Best beginner species", fr: "Meilleures espèces débutantes" }, href: "/blog/best-beginner-tarantula-canada" },
      { label: { en: "Care Guides", fr: "Guides de soins" }, href: "/care" },
      { label: { en: "Shop tarantulas", fr: "Voir les mygales" }, href: "/shop" },
    ],
  },
  {
    slug: "tarantulas-vs-other-pets-no-smell-no-mess",
    minRead: 6,
    publishedAt: "2026-09-13",
    updatedAt: "2026-09-13",
    title: {
      en: "Tarantulas vs. Traditional Pets: No Smell, No Mess, No Wasted Space",
      fr: "Mygales vs animaux de compagnie traditionnels : sans odeur, sans dégât, sans perte d'espace",
    },
    category: { en: "Getting Started", fr: "Pour commencer" },
    summary: {
      en: "Odourless, low-footprint, and about as low-maintenance as a pet gets — here's the honest, practical case for a tarantula over a dog, cat, or small mammal.",
      fr: "Sans odeur, peu encombrantes et aussi peu exigeantes qu'un animal peut l'être — voici le portrait honnête et pratique d'une mygale face à un chien, un chat ou un petit mammifère.",
    },
    sections: [
      {
        heading: { en: "No smell", fr: "Sans odeur" },
        body: [
          {
            en: "This is the one that surprises people most. A properly kept tarantula enclosure — dry substrate, spot-cleaned as needed — produces essentially no odour, unlike the ammonia smell that comes with small mammals like hamsters or guinea pigs, or the litter box smell that comes with cats. Nothing to mask, nothing for a roommate or landlord to notice.",
            fr: "C'est ce qui surprend le plus les gens. Un enclos de mygale bien entretenu — substrat sec, nettoyé au besoin — ne dégage essentiellement aucune odeur, contrairement à l'odeur d'ammoniac des petits mammifères comme les hamsters ou les cochons d'Inde, ou à celle de la litière des chats. Rien à masquer, rien qu'un colocataire ou un propriétaire pourrait remarquer.",
          },
        ],
      },
      {
        heading: { en: "Minimal space, minimal cleaning", fr: "Espace minimal, entretien minimal" },
        body: [
          {
            en: "Even a giant species lives comfortably in an enclosure that fits on a shelf or desk — nothing close to the footprint a cage, tank, or litter box demands for most traditional pets. Maintenance is occasional spot-cleaning and a water dish top-up, not a daily chore. For renters juggling a small apartment, that space savings is real.",
            fr: "Même une espèce géante vit confortablement dans un enclos qui tient sur une étagère ou un bureau — rien à voir avec l'espace qu'exigent une cage, un terrarium ou une litière pour la plupart des animaux traditionnels. L'entretien se limite à un nettoyage ponctuel et à remplir l'abreuvoir, pas à une corvée quotidienne. Pour les locataires qui jonglent avec un petit appartement, cette économie d'espace est bien réelle.",
          },
        ],
      },
      {
        heading: { en: "No walks, no daycare, no noise complaints", fr: "Pas de sorties, pas de garderie, pas de plaintes pour le bruit" },
        body: [
          {
            en: "Most beginner species eat once a week or less and need zero exercise, so there's no daily walk, no dog-walker to book when you travel, and no barking to worry a neighbour behind a shared wall. A tarantula is also entirely silent — genuinely one of the quietest pets you can keep in a building with thin walls.",
            fr: "La plupart des espèces débutantes mangent une fois par semaine ou moins et n'ont besoin d'aucun exercice, donc pas de sortie quotidienne, pas de promeneur à réserver en voyage, et pas d'aboiements pour inquiéter un voisin derrière un mur mitoyen. Une mygale est aussi totalement silencieuse — sincèrement l'un des animaux les plus discrets qu'on puisse garder dans un immeuble aux murs minces.",
          },
        ],
      },
      {
        heading: { en: "The trade-off, stated plainly", fr: "Le compromis, dit franchement" },
        body: [
          {
            en: "None of this makes a tarantula \"better\" than a dog or cat — it makes it a genuinely different kind of pet, closer to a living display piece than a companion animal. If what you want is affection and daily interaction, a tarantula won't give you that. If what you want is a fascinating, low-impact animal that asks very little of your space, time, or budget, it's hard to beat.",
            fr: "Rien de tout ça ne rend une mygale « meilleure » qu'un chien ou un chat — ça en fait un type d'animal réellement différent, plus proche d'une pièce vivante à contempler que d'un compagnon. Si vous cherchez de l'affection et une interaction quotidienne, une mygale ne vous l'offrira pas. Si vous cherchez un animal fascinant et peu contraignant, qui demande très peu de votre espace, de votre temps ou de votre budget, c'est difficile à battre.",
          },
        ],
      },
    ],
    relatedLinks: [
      { label: { en: "Are tarantulas good pets?", fr: "Les mygales sont-elles de bons animaux?" }, href: "/blog/are-tarantulas-good-pets-montreal" },
      { label: { en: "Best beginner species", fr: "Meilleures espèces débutantes" }, href: "/blog/best-beginner-tarantula-canada" },
      { label: { en: "Shop tarantulas", fr: "Voir les mygales" }, href: "/shop" },
    ],
  },
  {
    slug: "how-to-sex-a-tarantula-molt-method",
    minRead: 7,
    publishedAt: "2026-09-14",
    updatedAt: "2026-09-14",
    title: {
      en: "How to Sex a Tarantula: The Molt Method, Explained",
      fr: "Comment sexer une mygale : la méthode de la mue expliquée",
    },
    category: { en: "Tarantula 101", fr: "Mygale 101" },
    summary: {
      en: "The safest, most reliable way to tell male from female doesn't involve touching your spider at all — it involves reading its shed skin. Here's how it's done, and why it isn't always quick.",
      fr: "La façon la plus sûre et la plus fiable de distinguer un mâle d'une femelle n'implique pas de toucher votre mygale — mais de lire sa mue. Voici comment ça fonctionne, et pourquoi ce n'est pas toujours rapide.",
    },
    sections: [
      {
        heading: { en: "Why sexing matters", fr: "Pourquoi le sexage compte" },
        body: [
          {
            en: "As we cover in our piece on tarantula lifespan, males and females of the same species can have dramatically different futures — a mature male may have only months left, while a female of the same species can live for decades. Sex also affects price, temperament expectations for some species, and whether an animal is suitable for breeding down the line. It's worth getting right, and worth getting right honestly rather than guessed.",
            fr: "Comme nous l'expliquons dans notre article sur l'espérance de vie des mygales, un mâle et une femelle de la même espèce peuvent avoir des avenirs radicalement différents — un mâle mature peut n'avoir que quelques mois devant lui, tandis qu'une femelle de la même espèce peut vivre des décennies. Le sexe influence aussi le prix, les attentes de tempérament pour certaines espèces, et l'aptitude d'un animal à la reproduction plus tard. Ça vaut la peine de bien faire les choses — et de les faire honnêtement plutôt qu'en devinant.",
          },
        ],
      },
      {
        heading: { en: "The safest method: reading a shed exoskeleton", fr: "La méthode la plus sûre : lire un exosquelette mué" },
        body: [
          {
            en: "The gold standard is a molt exam, and its biggest advantage is that it requires zero contact with the live animal — you're examining a shed exoskeleton (the exuvia), not the spider itself. Once a molt is retrieved intact, the inside of the abdomen near the book lung openings is checked for the spermathecae: small, sclerotized (hardened) structures females use to store sperm. Present, distinct spermathecae generally mean female; their absence generally points to male. It's precise, it's evidence-based, and it never puts the spider at risk.",
            fr: "La méthode de référence est l'examen de la mue, et son plus grand avantage est qu'il ne nécessite aucun contact avec l'animal vivant — on examine un exosquelette mué (l'exuvie), pas la mygale elle-même. Une fois la mue récupérée intacte, on vérifie l'intérieur de l'abdomen près des ouvertures des poumons en livre pour repérer les spermathèques : de petites structures sclérifiées (durcies) que les femelles utilisent pour stocker le sperme. Des spermathèques présentes et bien visibles indiquent généralement une femelle; leur absence pointe généralement vers un mâle. C'est précis, fondé sur des preuves, et ça ne met jamais la mygale en danger.",
          },
        ],
      },
      {
        heading: { en: "The shortcuts worth being wary of", fr: "Les raccourcis à surveiller" },
        body: [
          {
            en: "\"Eyeballing\" a spider — guessing from leg thickness, boldness, or size — is popular in comment sections and unreliable in practice; plenty of confident guesses turn out wrong. There's also \"popping,\" a manual probing technique some very experienced breeders use on mature males, but it's invasive, requires real expertise, and carries real risk to the animal in less practiced hands. For the overwhelming majority of keepers, a molt exam is the only method worth trusting.",
            fr: "« Deviner à l'œil » — estimer selon l'épaisseur des pattes, l'assurance ou la taille — est populaire dans les commentaires en ligne et peu fiable en pratique; beaucoup de suppositions confiantes se révèlent fausses. Il existe aussi le « popping », une technique de sondage manuel que certains éleveurs très expérimentés utilisent sur des mâles matures, mais elle est invasive, exige une réelle expertise et comporte un vrai risque pour l'animal entre des mains moins expérimentées. Pour l'immense majorité des éleveurs, l'examen de la mue reste la seule méthode digne de confiance.",
          },
        ],
      },
      {
        heading: { en: "Why it varies so much — even within the same eggsac", fr: "Pourquoi ça varie tant — même au sein du même sac d'œufs" },
        body: [
          {
            en: "Here's what surprises new keepers: sexing confidence isn't just about species, it's about the individual molt in front of you. Some specimens shed a clean, fully intact molt early — occasionally young enough to sex within the first year — making the spermathecae easy to find. Others, including siblings from the very same eggsac, consistently produce torn or balled-up molts that hide the very structures you need to see, or bury and eat their shed skin before anyone can retrieve it. That can push a confirmed answer out by months, sometimes much longer, purely down to that one animal's habits.",
            fr: "Voici ce qui surprend les nouveaux éleveurs : la fiabilité du sexage ne dépend pas que de l'espèce, mais de la mue précise qu'on a sous les yeux. Certains spécimens produisent une mue propre et parfaitement intacte tôt — parfois assez jeunes pour être sexés dès la première année — ce qui facilite le repérage des spermathèques. D'autres, y compris des individus issus du même sac d'œufs, produisent systématiquement des mues déchirées ou en boule qui cachent justement les structures recherchées, ou enterrent et mangent leur peau avant qu'on puisse la récupérer. Cela peut retarder une réponse confirmée de plusieurs mois, parfois bien davantage, uniquement à cause des habitudes propres à cet animal.",
          },
        ],
      },
      {
        heading: { en: "Our honesty policy on sexing", fr: "Notre politique d'honnêteté sur le sexage" },
        body: [
          {
            en: "We never guess a sex on a listing. If a specimen's page doesn't show a sex, it means exactly that — we haven't retrieved and confirmed a clean molt for that individual yet, not that we're hiding a guess. As soon as a molt gives us a confirmed answer, the listing is updated. It's slower than eyeballing it, but it's the only honest way to sell an animal whose future genuinely depends on the answer.",
            fr: "Nous ne devinons jamais un sexe sur une fiche. Si la fiche d'un spécimen n'indique pas de sexe, cela signifie exactement ça — nous n'avons pas encore récupéré et confirmé une mue propre pour cet individu, pas que nous cachons une supposition. Dès qu'une mue nous donne une réponse confirmée, la fiche est mise à jour. C'est plus lent que de deviner à l'œil, mais c'est la seule façon honnête de vendre un animal dont l'avenir dépend réellement de cette réponse.",
          },
        ],
      },
    ],
    relatedLinks: [
      { label: { en: "How long do tarantulas live?", fr: "Combien de temps vivent les mygales?" }, href: "/blog/how-long-do-tarantulas-live" },
      { label: { en: "Best beginner species", fr: "Meilleures espèces débutantes" }, href: "/blog/best-beginner-tarantula-canada" },
      { label: { en: "Shop tarantulas", fr: "Voir les mygales" }, href: "/shop" },
    ],
  },
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}
