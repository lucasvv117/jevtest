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
    description: 'For a user request, which bundles and tools will the FRA agent use? One Yes/No question per bundle (7) and per tool (18).',
    view: 'fra-agent',
    questions: {
      documents: {
        type: 'boolean',
        instructions:
          "Will the FRA agent use the Documents bundle (tools: load_documents, search_in_documents) to handle this user request? This bundle is for reading documents the user uploaded in this conversation.",
        criteria: {
          true: "The request involves a document the user uploaded (read, summarize, search inside it).",
          false: "No uploaded document is involved.",
        },
      },
      history: {
        type: 'boolean',
        instructions:
          "Will the FRA agent use the History bundle (tools: get_turn_answer) to handle this user request? This bundle is for looking back at earlier answers in the conversation.",
        criteria: {
          true: "The request refers back to an earlier answer in the conversation.",
          false: "The request is self-contained.",
        },
      },
      follow_up: {
        type: 'boolean',
        instructions:
          "Will the FRA agent use the FollowUp bundle (tools: propose_follow_ups) to handle this user request? This bundle is for suggesting next steps at the end of the answer.",
        criteria: {
          true: "The agent gives a substantive answer after which next steps can be suggested.",
          false: "The request is a pure acknowledgement or needs no follow-up.",
        },
      },
      legal_search: {
        type: 'boolean',
        instructions:
          "Will the FRA agent use the LegalSearch bundle (tools: research (delegates to the FRA Researcher sub-agent)) to handle this user request? This bundle is for searching French legal sources: legislation, case law, doctrine, tax commentary.",
        criteria: {
          true: "Answering needs French legal sources (statutes, case law, doctrine, tax positions).",
          false: "No legal source is needed.",
        },
      },
      synchronized_documents: {
        type: 'boolean',
        instructions:
          "Will the FRA agent use the SynchronizedDocuments bundle (tools: search_synchronized_documents) to handle this user request? This bundle is for searching the user's synchronized drives (Google Drive, SharePoint…).",
        criteria: {
          true: "The user wants something found in their own synchronized drives or internal documents.",
          false: "The user's synchronized drives are not involved.",
        },
      },
      knowledge_bases_and_matters: {
        type: 'boolean',
        instructions:
          "Will the FRA agent use the KB & Matters bundle (tools: search_knowledge_bases_and_matters, load_knowledge_bases_and_matters_documents) to handle this user request? This bundle is for searching or opening the user's knowledge bases and matters (case files, firm templates).",
        criteria: {
          true: "The request involves the user's knowledge bases, matters/case files or firm templates.",
          false: "The user's knowledge bases and matters are not involved.",
        },
      },
      drafting: {
        type: 'boolean',
        instructions:
          "Will the FRA agent use the Drafting bundle (tools: draft_document (delegates to the Drafting Agent)) to handle this user request? This bundle is for writing, redrafting or editing a document.",
        criteria: {
          true: "The user asks to write, redraft, edit or produce a document, clause, letter or submission.",
          false: "The user only wants information or an analysis, not a drafted document.",
        },
      },
      load_documents: {
        type: 'boolean',
        instructions:
          "Will the FRA agent need to call the tool `load_documents` to handle this user request? Tool: Load the full text of documents the user uploaded in this conversation.",
        criteria: {
          true: "The request is about a document the user uploaded and needs its full content (short document, full read, summary).",
          false: "No uploaded document is involved, or only a targeted passage is needed.",
        },
      },
      search_in_documents: {
        type: 'boolean',
        instructions:
          "Will the FRA agent need to call the tool `search_in_documents` to handle this user request? Tool: Search for relevant passages inside long uploaded documents.",
        criteria: {
          true: "The request targets a specific point inside a long uploaded document.",
          false: "No uploaded document is involved, or the whole document must be read.",
        },
      },
      get_turn_answer: {
        type: 'boolean',
        instructions:
          "Will the FRA agent need to call the tool `get_turn_answer` to handle this user request? Tool: Retrieve the assistant's answer from a previous turn of the conversation.",
        criteria: {
          true: "The request refers back to an earlier answer in the conversation (“your previous answer”, “as you said above”).",
          false: "The request is self-contained and does not refer to earlier turns.",
        },
      },
      propose_follow_ups: {
        type: 'boolean',
        instructions:
          "Will the FRA agent need to call the tool `propose_follow_ups` to handle this user request? Tool: Propose 2–5 follow-up suggestions at the very end of the turn.",
        criteria: {
          true: "The agent answers the request and can suggest next steps (almost every substantive answer).",
          false: "The request is a pure acknowledgement or needs no follow-up suggestions.",
        },
      },
      research: {
        type: 'boolean',
        instructions:
          "Will the FRA agent need to call the tool `research` to handle this user request? Tool: Delegate a French legal research question (legislation, case law…) to the FRA Researcher sub-agent.",
        criteria: {
          true: "Answering needs French legal sources: statutes, case law, doctrine or tax commentary.",
          false: "No legal source is needed (pure drafting from provided text, small talk, document-only question).",
        },
      },
      search_synchronized_documents: {
        type: 'boolean',
        instructions:
          "Will the FRA agent need to call the tool `search_synchronized_documents` to handle this user request? Tool: Search the user's synchronized private documents (Google Drive, SharePoint…).",
        criteria: {
          true: "The user asks to find something in their own synchronized drives or internal documents.",
          false: "The request does not involve the user's synchronized drives.",
        },
      },
      search_knowledge_bases_and_matters: {
        type: 'boolean',
        instructions:
          "Will the FRA agent need to call the tool `search_knowledge_bases_and_matters` to handle this user request? Tool: Search the user's knowledge bases and matters (their document collections).",
        criteria: {
          true: "The user refers to their knowledge base, a matter/case file or firm templates without naming a specific document.",
          false: "The request does not involve the user's knowledge bases or matters.",
        },
      },
      load_knowledge_bases_and_matters_documents: {
        type: 'boolean',
        instructions:
          "Will the FRA agent need to call the tool `load_knowledge_bases_and_matters_documents` to handle this user request? Tool: Open specific, already identified knowledge base or matter documents.",
        criteria: {
          true: "The user names a specific document from a matter or knowledge base to open in full.",
          false: "No specific matter or knowledge base document is named.",
        },
      },
      draft_document: {
        type: 'boolean',
        instructions:
          "Will the FRA agent need to call the tool `draft_document` to handle this user request? Tool: Delegate to the Drafting Agent to generate, modify or extract from a document.",
        criteria: {
          true: "The user asks to write, redraft, edit or produce a document, clause, letter or submission.",
          false: "The user only wants information or an analysis, not a drafted document.",
        },
      },
      search_legislation: {
        type: 'boolean',
        instructions:
          "Will the FRA agent need to call the tool `search_legislation` to handle this user request? Tool: (Researcher) Search legislation articles relevant to a legal question.",
        criteria: {
          true: "Statutory provisions must be found without knowing the exact article.",
          false: "No legislation is needed, or the exact article is already named.",
        },
      },
      search_decisions: {
        type: 'boolean',
        instructions:
          "Will the FRA agent need to call the tool `search_decisions` to handle this user request? Tool: (Researcher) Search court decisions relevant to a legal question.",
        criteria: {
          true: "Case law must be found on a legal issue (e.g. recent rulings, how courts apply a rule).",
          false: "No case law is needed, or a single decision is precisely identified.",
        },
      },
      lookup_legislation: {
        type: 'boolean',
        instructions:
          "Will the FRA agent need to call the tool `lookup_legislation` to handle this user request? Tool: (Researcher) Fetch the text of a precisely named article (e.g. article L1232-1 code du travail).",
        criteria: {
          true: "The request names a specific article of a code or statute.",
          false: "No specific article is named.",
        },
      },
      lookup_decision: {
        type: 'boolean',
        instructions:
          "Will the FRA agent need to call the tool `lookup_decision` to handle this user request? Tool: (Researcher) Fetch one decision named by a precise identifier (pourvoi number, ECLI, court + date + parties).",
        criteria: {
          true: "The request identifies one specific decision precisely.",
          false: "No specific decision is identified.",
        },
      },
      read_decision: {
        type: 'boolean',
        instructions:
          "Will the FRA agent need to call the tool `read_decision` to handle this user request? Tool: (Researcher) Read a range of sentences from a previously retrieved decision.",
        criteria: {
          true: "A retrieved decision must be read in detail (reasoning, exact wording of a passage).",
          false: "No decision needs to be read in depth.",
        },
      },
      search_tax_treatise: {
        type: 'boolean',
        instructions:
          "Will the FRA agent need to call the tool `search_tax_treatise` to handle this user request? Tool: (Researcher) Search expert tax doctrine (tax treatise).",
        criteria: {
          true: "The question is a tax-law question needing expert doctrine.",
          false: "The question is not about tax law.",
        },
      },
      search_tax_commentary: {
        type: 'boolean',
        instructions:
          "Will the FRA agent need to call the tool `search_tax_commentary` to handle this user request? Tool: (Researcher) Search BOFiP: official positions of the French tax administration.",
        criteria: {
          true: "The question is about tax and needs the tax administration's official position (BOFiP).",
          false: "The question is not about tax law.",
        },
      },
      search_enterprise_documents: {
        type: 'boolean',
        instructions:
          "Will the FRA agent need to call the tool `search_enterprise_documents` to handle this user request? Tool: (Researcher) Search documents about a selected company (bylaws, corporate filings…). Only available when a company is selected.",
        criteria: {
          true: "The request is about a specific named company and its own documents (bylaws, filings, officers).",
          false: "No specific company is the subject of the request.",
        },
      },
      search_enterprise_decisions: {
        type: 'boolean',
        instructions:
          "Will the FRA agent need to call the tool `search_enterprise_decisions` to handle this user request? Tool: (Researcher) Search court decisions and litigation involving a selected company. Only available when a company is selected.",
        criteria: {
          true: "The request explicitly asks about disputes or litigation involving a specific named company.",
          false: "No litigation involving a specific company is asked about.",
        },
      },
    },
    examples: [
      'Quel est le taux de TVA applicable aux travaux de rénovation énergétique dans un logement ancien ?',
      'Peux-tu résumer le contrat que je viens de joindre et lister les clauses de résiliation ?',
      'Rédige une clause de non-concurrence pour un commercial, conforme à la jurisprudence récente.',
      'Que dit l’article L1232-1 du code du travail ?',
      'Quels sont les litiges en cours impliquant la société Carrefour ?',
    ],
  },
];
