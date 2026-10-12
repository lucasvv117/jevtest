import { buildFraAgentQuestions } from './fra-agent-questions';
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
    name: 'Legal document classification',
    description: 'Document type, area of law, whether a deadline is mentioned.',
    questions: {
      documentType: {
        type: 'choice',
        instructions: 'What type of legal document is this?',
        criteria: {
          courtDecision: 'Court decision: judgment, appellate ruling, order',
          pleading: 'Lawyer filing: submissions, summons, motion, brief',
          contract: 'Contract, amendment, terms and conditions, articles of association',
          letter: 'Letter, email, formal notice, dismissal letter',
          memo: 'Legal memo, opinion or analysis',
          other: 'Document that fits no other category',
        },
      },
      areaOfLaw: {
        type: 'choice',
        instructions: 'What is the main area of law?',
        criteria: {
          civil: 'Civil law: obligations, family, real estate, liability',
          commercial: 'Commercial and business law: companies, commercial leases, insolvency',
          employment: 'Employment and social security law',
          criminal: 'Criminal law and criminal procedure',
          administrative: 'Public and administrative law, zoning',
          tax: 'Tax law',
          other: 'Another area, or impossible to determine',
        },
      },
      hasDeadline: {
        type: 'boolean',
        instructions: 'Does the document mention a deadline or time limit to meet?',
        criteria: {
          true: 'A time limit, hearing date or filing deadline is mentioned.',
          false: 'No deadline or time limit to meet.',
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
    name: 'User request routing',
    description: 'Intent, complexity, whether an attached document is needed.',
    questions: {
      intent: {
        type: 'choice',
        instructions: 'What is the user trying to do?',
        criteria: {
          research: 'Find case law, statutes or legal commentary',
          drafting: 'Draft or rephrase a deed, a letter or a clause',
          analysis: 'Analyze, summarize or compare a provided document',
          procedure: 'Practical procedure question: time limits, jurisdiction, formalities',
          outOfScope: 'Request unrelated to law',
        },
      },
      complexity: {
        type: 'score',
        instructions: 'How legally complex is the request?',
        criteria: [
          'Simple factual answer, one source is enough',
          'Several sources, or a legal characterization is needed',
          'Multi-step reasoning, intertwined legal issues',
        ],
      },
      needsDocument: {
        type: 'boolean',
        instructions: 'Does the request refer to a document the user must provide?',
      },
    },
    examples: [
      'Quel est le délai pour faire appel d’un jugement du tribunal judiciaire en matière civile ?',
      'Peux-tu résumer les points clés du contrat ci-joint et identifier les clauses à risque pour mon client ?',
      'Trouve-moi des arrêts récents de la Cour de cassation sur la faute inexcusable de l’employeur en cas de harcèlement moral.',
    ],
  },
  {
    id: 'agent-tool-calling',
    name: 'Agent tool calling — FRA Agent',
    description: 'For a user request, which bundles and tools will the FRA agent use? One Yes/No question per bundle (7) and per tool (18), built from the agent’s real tool definitions.',
    view: 'fra-agent',
    questions: buildFraAgentQuestions(),
    examples: [
      'Quel est le taux de TVA applicable aux travaux de rénovation énergétique dans un logement ancien ?',
      'Peux-tu résumer le contrat que je viens de joindre et lister les clauses de résiliation ?',
      'Rédige une clause de non-concurrence pour un commercial, conforme à la jurisprudence récente.',
      'Que dit l’article L1232-1 du code du travail ?',
      'Quels sont les litiges en cours impliquant la société Carrefour ?',
      'Retrouve sur notre SharePoint la dernière version du contrat de prestation signé avec le client Lambert et dis-moi quand il arrive à échéance.',
      'Rédige un contrat de prestation de services informatiques entre ma société et un client, avec des clauses de confidentialité, de responsabilité et de résiliation.',
      'D’après les documents de notre base de connaissances, quelle est la procédure interne du cabinet pour l’ouverture d’un nouveau dossier client ?',
      'Retrouve dans notre SharePoint les échanges avec Axa France sur le sinistre de l’entrepôt, puis donne-moi les informations clés sur la société Axa France : dirigeants, capital et litiges en cours.',
    ],
  },
  {
    id: 'decision-relevance',
    name: 'Court decision relevance',
    description: 'Upload court decisions (PDF) and a user question: Jev rates how relevant each decision is to the question.',
    view: 'decision-relevance',
    questions: {
      relevance: {
        type: 'score',
        instructions:
          'The text contains a user question followed by a court decision. How relevant is this decision for answering the user question?',
        criteria: [
          'Not relevant: the decision deals with another legal issue or another area of law.',
          'Marginally relevant: same area of law, but the decision does not help answer the question.',
          'Relevant: the decision addresses the legal issue raised by the question and can support the answer.',
          'Highly relevant: the decision directly rules on the exact question asked, it is a key source for the answer.',
        ],
      },
      sameLegalIssue: {
        type: 'boolean',
        instructions: 'Does the court decision rule on the same legal issue as the one raised by the user question?',
        criteria: {
          true: 'The court decides the legal point the user asks about (same rule, same condition or same qualification).',
          false: 'The legal point decided by the court is different, or only mentioned in passing.',
        },
      },
      similarFacts: {
        type: 'boolean',
        instructions: 'Are the facts of the case comparable to the situation described in the user question?',
        criteria: {
          true: 'The factual situation is close to the one in the question (same type of parties, contract, event or dispute).',
          false: 'The facts are different, or the question describes no concrete situation.',
        },
      },
    },
    examples: [
      'Un salarié peut-il être licencié pour faute grave en raison de propos tenus sur les réseaux sociaux ?',
      'Quelles sont les conditions de la rupture brutale d’une relation commerciale établie ?',
      'Le bailleur peut-il refuser le renouvellement d’un bail commercial sans indemnité d’éviction ?',
      'Quelle est la responsabilité d’un constructeur pour des désordres apparus après la réception des travaux ?',
    ],
  },
];
