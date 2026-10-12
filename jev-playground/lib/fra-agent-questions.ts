import { BUNDLE_GUIDES, ENTERPRISE_GUIDANCE, RESEARCHER_STRATEGY, TOOL_DOCSTRINGS } from './fra-agent-definitions';
import { FRA_RESEARCHER_TOOLS } from './fra-agent';
import type { Questions } from './types';

/**
 * Questions Jev du cas « Agent tool calling » : une par bundle et par tool du FRA Agent.
 * Le corps de chaque question est la définition réelle du code (voir fra-agent-definitions.ts) ;
 * seules la phrase d'introduction (anglais) et les critères oui/non (résumés des règles du guide) sont écrits ici.
 */

type Bundle = keyof typeof BUNDLE_GUIDES;
type Tool = keyof typeof TOOL_DOCSTRINGS;
type YesNo = { true: string; false: string };

/** Conditions d'activation, d'après FraToolBundleProvider._active_members. */
const BUNDLES: Record<Bundle, { label: string; tools: Tool[]; activation: string; criteria: YesNo }> = {
  documents: {
    label: 'Documents',
    tools: ['load_documents', 'search_in_documents'],
    activation: 'Actif seulement si l’utilisateur a joint des documents à la conversation (ctx.user_uploaded_documents).',
    criteria: {
      true: 'La demande porte sur un document joint par l’utilisateur à la conversation (le lire, le résumer, y chercher une information).',
      false: 'Aucun document joint à la conversation n’est concerné.',
    },
  },
  history: {
    label: 'History',
    tools: ['get_turn_answer'],
    activation: 'Toujours actif.',
    criteria: {
      true: 'Un élément de la demande s’appuie sur un échange antérieur (sujet implicite, « ce mail », « le dossier », reprise d’un point déjà discuté).',
      false: 'La demande est autonome et ne renvoie à aucun tour précédent.',
    },
  },
  follow_up: {
    label: 'FollowUp',
    tools: ['propose_follow_ups'],
    activation: 'Toujours actif.',
    criteria: {
      true: 'La réponse permet de proposer des suggestions d’approfondissement, une prochaine action utile ou la suite naturelle de la tâche.',
      false: 'Aucune suggestion de suite n’est pertinente après la réponse.',
    },
  },
  legal_search: {
    label: 'LegalSearch',
    tools: ['research'],
    activation: 'Toujours actif.',
    criteria: {
      true: 'La question appelle une analyse juridique (validité, risques, conformité, obligations, délais légaux…) ou des sources de droit français.',
      false: 'Aucune source juridique n’est nécessaire (ex. traduction ou simple modification d’un document).',
    },
  },
  synchronized_documents: {
    label: 'SynchronizedDocuments',
    tools: ['search_synchronized_documents'],
    activation: 'Actif seulement si l’utilisateur a synchronisé des espaces de stockage (ctx.storage_ids).',
    criteria: {
      true: 'La question porte sur les documents privés de l’utilisateur, une affaire qui lui est propre (client nommé, dossier, pièce interne) ou un document de son cabinet ou de son entreprise.',
      false: 'La question est nettement orientée droit public (décision référencée, texte de loi, recherche de jurisprudence) : les sources publiques suffisent.',
    },
  },
  knowledge_bases_and_matters: {
    label: 'KB & Matters',
    tools: ['search_knowledge_bases_and_matters', 'load_knowledge_bases_and_matters_documents'],
    activation:
      'Actif seulement si des bases de connaissances ou des dossiers (matters) sont disponibles dans la session (groupes de documents hors SELECTED_GROUP_TYPES).',
    criteria: {
      true: 'La question porte sur un dossier (matter) actif, un document de ce dossier, ou l’utilisateur demande explicitement de chercher dans ses bases.',
      false: 'Question juridique générale, ou portant sur les documents joints à la conversation.',
    },
  },
  drafting: {
    label: 'Drafting',
    tools: ['draft_document'],
    activation:
      'Actif seulement si un document éditable est ouvert ou si la rédaction est activée (ctx.has_editable_document() ou ctx.enable_chatbot_drafting).',
    criteria: {
      true: 'L’utilisateur demande un écrit destiné à être utilisé hors du chat (acte, contrat, clause, courrier, email…), ou de modifier, traduire, résumer un document existant ou d’en extraire des informations.',
      false: 'L’utilisateur demande une consultation dans le chat, sans produire ni modifier de document.',
    },
  },
};

const TOOL_CRITERIA: Record<Tool, YesNo> = {
  load_documents: {
    true: 'Il faut l’intégralité du texte d’un document joint (document court, ou question sur sa structure globale).',
    false: 'Aucun document joint n’est concerné, ou une recherche ciblée suffit.',
  },
  search_in_documents: {
    true: 'Il faut une information ciblée dans un document joint, ou un document long / de taille inconnue.',
    false: 'Aucun document joint n’est concerné.',
  },
  get_turn_answer: BUNDLES.history.criteria,
  propose_follow_ups: BUNDLES.follow_up.criteria,
  research: BUNDLES.legal_search.criteria,
  search_synchronized_documents: BUNDLES.synchronized_documents.criteria,
  search_knowledge_bases_and_matters: {
    true: 'Il faut chercher une information dans les dossiers ou bases de connaissances sans savoir dans quel document elle se trouve.',
    false: 'Question juridique générale, ou portant sur les documents joints à la conversation.',
  },
  load_knowledge_bases_and_matters_documents: {
    true: 'Un document précis d’un dossier ou d’une base de connaissances est déjà identifié et il faut son contenu.',
    false: 'Aucun document précis de dossier ou de base de connaissances n’est visé.',
  },
  draft_document: BUNDLES.drafting.criteria,
  search_legislation: {
    true: 'Brief thématique ou fiscal : il faut trouver des textes de loi par mots-clés (sans numéro d’article connu).',
    false: 'Brief purement navigationnel (texte ou décision nommés), ou aucune recherche juridique.',
  },
  search_decisions: {
    true: 'Brief thématique ou fiscal : il faut trouver de la jurisprudence par mots-clés.',
    false: 'Brief purement navigationnel (texte ou décision nommés), ou aucune recherche juridique.',
  },
  lookup_legislation: {
    true: 'Un article précis est cité dans la demande ou connu comme applicable (n° d’article + code).',
    false: 'Aucun article précis n’est identifiable.',
  },
  lookup_decision: {
    true: 'Une décision précise est citée ou connue comme applicable (n° de pourvoi, ECLI, juridiction + date + parties).',
    false: 'Aucune décision précise n’est identifiable.',
  },
  read_decision: {
    true: 'L’information demandée dépasse le résumé d’une décision (moyens des parties, motifs détaillés, verbatim).',
    false: 'Le résumé des décisions suffit, ou aucune décision n’est concernée.',
  },
  search_tax_treatise: {
    true: 'Brief fiscal : la question relève du droit fiscal.',
    false: 'La question ne relève pas du droit fiscal.',
  },
  search_tax_commentary: {
    true: 'Brief fiscal : la question relève du droit fiscal (doctrine administrative, BOFiP).',
    false: 'La question ne relève pas du droit fiscal.',
  },
  search_enterprise_documents: {
    true: 'La question porte sur une entreprise précise et ses actes propres (statuts, PV d’AG, nominations, objet social, capital).',
    false: 'Aucune entreprise précise n’est visée, ou seuls ses litiges sont demandés.',
  },
  search_enterprise_decisions: {
    true: 'La question porte sur les décisions de justice ou litiges impliquant une entreprise précise.',
    false: 'Aucun litige impliquant une entreprise précise n’est demandé.',
  },
};

const ENTERPRISE_TOOLS: Tool[] = ['search_enterprise_documents', 'search_enterprise_decisions'];

const section = (title: string, body: string) => `## ${title}\n${body}`;

function bundleQuestion(id: Bundle) {
  const b = BUNDLES[id];
  return {
    type: 'boolean' as const,
    instructions: [
      `Will the FRA manager use the ${b.label} bundle (tools: ${b.tools.join(', ')}) to handle this user request? Below is the exact definition the manager receives in its prompt.`,
      section('Activation', b.activation),
      section('Guide du bundle (prompt du manager)', BUNDLE_GUIDES[id]),
    ].join('\n\n'),
    criteria: b.criteria,
  };
}

function managerToolQuestion(tool: Tool, bundle: Bundle) {
  return {
    type: 'boolean' as const,
    instructions: [
      `Will the FRA manager call the tool \`${tool}\` to handle this user request? Below is the tool's exact definition and the guide of its bundle (${BUNDLES[bundle].label}) as the manager receives them.`,
      section('Activation du bundle', BUNDLES[bundle].activation),
      section('Description du tool (docstring)', TOOL_DOCSTRINGS[tool]),
      section('Guide du bundle (prompt du manager)', BUNDLE_GUIDES[bundle]),
    ].join('\n\n'),
    criteria: TOOL_CRITERIA[tool],
  };
}

function researcherToolQuestion(tool: Tool) {
  const enterprise = ENTERPRISE_TOOLS.includes(tool);
  return {
    type: 'boolean' as const,
    instructions: [
      `Will the FRA Researcher sub-agent call the tool \`${tool}\` to handle this user request? The Researcher only runs when the manager delegates a legal research brief through \`research\`. Below is the tool's exact definition and the Researcher's strategy.`,
      ...(enterprise
        ? [section('Activation', 'Disponible seulement quand le filtre entreprise est actif (ctx.enterprise) ; il n’existe alors que search_enterprise_documents et search_enterprise_decisions.')]
        : []),
      section('Description du tool (docstring)', TOOL_DOCSTRINGS[tool]),
      section('Stratégie du Researcher (RESEARCHER_PROMPT)', RESEARCHER_STRATEGY),
      ...(enterprise ? [section('ENTERPRISE_PARAMS_GUIDANCE', ENTERPRISE_GUIDANCE)] : []),
    ].join('\n\n'),
    criteria: TOOL_CRITERIA[tool],
  };
}

export function buildFraAgentQuestions(): Questions {
  const questions: Questions = {};
  for (const id of Object.keys(BUNDLES) as Bundle[]) questions[id] = bundleQuestion(id);
  for (const [bundle, b] of Object.entries(BUNDLES) as [Bundle, (typeof BUNDLES)[Bundle]][]) {
    for (const tool of b.tools) questions[tool] = managerToolQuestion(tool, bundle);
  }
  for (const tool of FRA_RESEARCHER_TOOLS) questions[tool] = researcherToolQuestion(tool);
  return questions;
}
