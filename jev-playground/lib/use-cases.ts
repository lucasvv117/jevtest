import type { UseCase } from './types';

/**
 * Cas d'usage proposés dans l'app.
 *
 * Pour en ajouter un : copier un bloc, changer id / name / description /
 * questions / examples, puis commit + push (Vercel redéploie tout seul).
 * Les questions peuvent aussi être modifiées à la volée dans l'interface,
 * sans sauvegarde, pour itérer vite sur les libellés.
 *
 * Types de questions Jev :
 * - choice  : criteria = { cléOption: 'description' }  (2 à 255 options)
 * - score   : criteria = ['niveau le plus bas', ..., 'niveau le plus haut'] (2 à 10)
 * - boolean : criteria optionnel = { true: '...', false: '...' }
 *
 * Conseil Vercel : décrire les options plutôt que de simplement les nommer
 * ("Bloquant sans contournement" plutôt que "haut").
 */
export const USE_CASES: UseCase[] = [
  {
    id: 'classification-documents',
    name: 'Classification de documents juridiques',
    description: 'Type de document, matière, présence d’un délai.',
    questions: {
      typeDocument: {
        type: 'choice',
        instructions: 'Quel est le type de ce document juridique ?',
        criteria: {
          decision: 'Décision de justice : jugement, arrêt, ordonnance',
          ecritures: 'Écritures d’avocat : conclusions, assignation, requête, mémoire',
          contrat: 'Contrat, avenant, conditions générales, statuts',
          courrier: 'Courrier, e-mail, mise en demeure, lettre de licenciement',
          consultation: 'Note, consultation ou analyse juridique',
          autre: 'Document qui n’entre dans aucune autre catégorie',
        },
      },
      matiere: {
        type: 'choice',
        instructions: 'Quelle est la matière juridique principale ?',
        criteria: {
          civil: 'Droit civil : obligations, famille, immobilier, responsabilité',
          commercial: 'Droit commercial et des affaires : sociétés, baux commerciaux, procédures collectives',
          social: 'Droit du travail et de la sécurité sociale',
          penal: 'Droit pénal et procédure pénale',
          administratif: 'Droit public et administratif, urbanisme',
          fiscal: 'Droit fiscal',
          autre: 'Autre matière, ou matière impossible à déterminer',
        },
      },
      delai: {
        type: 'boolean',
        instructions: 'Le document mentionne-t-il un délai ou une date limite à respecter ?',
        criteria: {
          true: 'Un délai, une date d’audience ou une date limite d’action est mentionné.',
          false: 'Aucun délai ni date limite à respecter.',
        },
      },
    },
    examples: [
      'Par ces motifs, la cour d’appel de Paris, statuant publiquement, infirme le jugement du conseil de prud’hommes en ce qu’il a dit le licenciement fondé sur une cause réelle et sérieuse, et condamne la société X à verser à M. Y la somme de 25 000 euros.',
      'Madame, nous vous mettons en demeure de régler la somme de 4 300 € correspondant aux loyers impayés du local commercial sous un délai de 8 jours à compter de la réception du présent courrier.',
      'Article 4 – Durée. Le présent contrat de prestation de services est conclu pour une durée de 12 mois à compter de sa signature, renouvelable par tacite reconduction.',
    ],
  },
  {
    id: 'routage-requetes',
    name: 'Routage de requêtes utilisateur',
    description: 'Intention, complexité, besoin d’un document joint.',
    questions: {
      intention: {
        type: 'choice',
        instructions: 'Que cherche à faire l’utilisateur ?',
        criteria: {
          recherche: 'Trouver de la jurisprudence, des textes ou de la doctrine',
          redaction: 'Rédiger ou reformuler un acte, un courrier ou une clause',
          analyse: 'Analyser, résumer ou comparer un document fourni',
          procedure: 'Question pratique de procédure : délais, compétence, formalités',
          horsPerimetre: 'Demande sans rapport avec le droit',
        },
      },
      complexite: {
        type: 'score',
        instructions: 'Quelle est la complexité juridique de la demande ?',
        criteria: [
          'Réponse factuelle simple, une seule source suffit',
          'Plusieurs sources ou une qualification à opérer',
          'Raisonnement en plusieurs étapes, questions de droit imbriquées',
        ],
      },
      documentRequis: {
        type: 'boolean',
        instructions: 'La demande fait-elle référence à un document que l’utilisateur doit fournir ?',
      },
    },
    examples: [
      'Quel est le délai pour faire appel d’un jugement du tribunal judiciaire en matière civile ?',
      'Peux-tu résumer les points clés du contrat ci-joint et identifier les clauses à risque pour mon client ?',
      'Trouve-moi des arrêts récents de la Cour de cassation sur la faute inexcusable de l’employeur en cas de harcèlement moral.',
    ],
  },
];
