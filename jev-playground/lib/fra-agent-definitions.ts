/**
 * Définitions réelles des outils du FRA Agent, copiées mot pour mot du code de l'agent.
 *
 * Source : DoctrineLegal/ai-services @ 324841443d171a6a5fe96fa5c9085a88876afa69 (master, 2026-10-12)
 * sous projects/ai-service/app/domains/ :
 * - unified_chatbot/fra/agent/bundle_provider.py              → guides des bundles (_*_PROMPT_FRAGMENT)
 * - unified_chatbot/fra/tool_bundles/legal_search/prompt_fragment.py → guide LegalSearch (research)
 * - unified_chatbot/fra/tools/research/prompt.py              → stratégie du FRA Researcher
 * - unified_chatbot/fra/tools/<tool>/tool.py, unified_chatbot/shared/tools/<tool>/tool.py,
 *   drafting/tools/draft_document/tool.py                     → docstrings des tools
 *
 * Fichier généré : ne pas éditer à la main. Pour resynchroniser, refaire l'extraction sur un commit plus récent.
 */

export const FRA_SOURCE_COMMIT = '324841443d171a6a5fe96fa5c9085a88876afa69';

/** Guide `<tool_guide>` injecté dans le prompt du manager, par bundle. */
export const BUNDLE_GUIDES = {
  documents: `<tool_guide name='documents'>
### load_documents(document_ids)
Charge le contenu complet d'un ou plusieurs documents utilisateur.
- document_ids : liste d'identifiants, ex. ['uploaded_document_0']

À utiliser uniquement si tu as besoin de l'intégralité du texte (document court, ou question portant sur la structure globale du document).

### search_in_documents(document_ids, query)
Recherche dans un ou plusieurs documents utilisateur et retourne les passages pertinents pour la requête.
- document_ids : liste d'identifiants, ex. ['uploaded_document_0']
- query : le sujet ou la question à rechercher dans ces documents

À utiliser pour les documents longs ou quand tu cherches une information ciblée — charger l'intégralité du contenu saturerait ton contexte.

Règle : si tu ignores la taille du document, commence par \`search_in_documents\` avec une requête ciblée. Bascule sur \`load_documents\` seulement si tu as besoin du document entier.
</tool_guide>`,
  history: `<tool_guide name='get_turn_answer'>
\`get_turn_answer\` renvoie le texte exact de la réponse (jamais la question) donnée au tour numéro \`position\`, en te basant sur la liste numérotée fournie dans <conversation_history>. Appel local et instantané : il n'entre pas dans ton budget d'appels, ne t'en prive pas.
- Au moindre doute qu'un élément de la demande s'appuie sur un échange antérieur (sujet implicite, « ce mail », « le dossier », reprise d'un point déjà discuté…), identifie le tour concerné dans <conversation_history> et appelle \`get_turn_answer\` sur ce tour avant tout autre appel d'outil.
- Mieux vaut l'appeler pour rien que de répondre en ignorant le contexte.
</tool_guide>`,
  follow_up: `<tool_guide name='follow_up'>
### propose_follow_ups(suggestions)
**L'appeler termine immédiatement le tour.** Ce doit être la TOUTE DERNIÈRE action : appelle-le UNE SEULE FOIS,
uniquement après avoir entièrement terminé le texte de la réponse, et ne fais plus rien ensuite:
aucun autre outil, aucun autre texte.

Utilise-le dans trois situations, y compris combinées :
1. **Suggestions proactives** : propose des questions d'approfondissement pertinentes que l'utilisateur
pourrait vouloir poser ensuite (un aspect connexe, une conséquence pratique, un sujet lié non encore traité).
2. **Prochaines actions utiles** : propose une action concrète liée à la réponse — par exemple générer un
tableau récapitulatif des points clés si la réponse n'en comporte pas déjà un, ou exposer l'étape suivante
d'une procédure juridique en cours (délais, formalités, actes à accomplir).
3. **Tâche en voie d'achèvement** : lorsque la réponse que tu viens de rédiger mène à bien la tâche confiée
par l'utilisateur (analyse terminée, acte rédigé, question tranchée), propose la suite naturelle la plus
utile à ce stade — par exemple passer à l'étape suivante de la procédure, vérifier ou affiner un point
précis de l'acte rédigé, appliquer l'analyse à un cas concret.

- \`suggestions\` : de 2 à 5 phrases courtes, rédigées du point de vue de l'utilisateur (une question ou une
action), comme s'il les tapait lui-même dans le chat.

**Les suggestions envoyées par cet outil ne doivent JAMAIS figurer dans le texte de la réponse** — ni comme
question rhétorique, ni comme proposition explicite, ni à l'identique, ni reformulées. Le texte de chaque
suggestion n'existe qu'ici, dans l'appel d'outil.

Ne reprends pas des sujets déjà traités dans la réponse. Consulte aussi <conversation_history> :
ne propose jamais comme suggestion une question que l'utilisateur a déjà posée dans un tour
précédent de cette conversation.
</tool_guide>`,
  legal_search: `<tool_guide name='legal_search'>
## research(query) — recherche juridique déléguée
Délègue à un chercheur qui interroge législation, jurisprudence et doctrine françaises et te renvoie les sources utiles (analyses structurées / textes intégraux) et des informations sur ces sources (contenu, résumés, etc.). Il ne voit ni la conversation ni tes documents : le brief doit être auto-suffisant.

**Rédige un brief détaillé et dense — jamais laconique.** Avant d'appeler \`research\`, réfléchis dans ton raisonnement à la façon de réunir en une seule query le maximum d'informations utiles au chercheur : angles à couvrir, mots-clés discriminants et leurs synonymes, contexte factuel, sources que tu connais. Un brief riche appelé une seule fois vaut toujours mieux que plusieurs appels étroits : chaque détail pertinent que tu ajoutes t'épargne un aller-retour. Vise la richesse en angles et en vocabulaire juridique précis, pas la longueur — des mots vagues ou du contexte inutile diluent la recherche. En t'appuyant sur les exemples ci-dessous, décris ce que ta réponse doit établir ; un bon brief contient, selon les cas :
- la ou les questions de droit précises, avec le contexte factuel utile ;
- les 2 à 4 angles réellement décisifs (fondements, qualifications alternatives, exceptions, preuve...), en vocabulaire juridique exact, acronymes développés — ce sont des pistes de départ, le chercheur les décompose et les élargit lui-même ;
- les mots-clés que tu juges les plus discriminants, avec leurs synonymes concurrents (ex. « déport / abstention / retrait ») : le moteur du chercheur apparie des mots-clés, pas du sens, et tu connais souvent le meilleur vocabulaire. Ce sont des suggestions qu'il complète, pas la liste de ses requêtes ;
- les sources que tu sais applicables (n° d'article + code, n° de pourvoi, ECLI) : elles s'ajoutent aux angles, elles ne les remplacent jamais. Utilise au maximum tes connaissances pour donner les sources utiles pour répondre à la question ;
- ce qui est déjà acquis, pour éviter les redondances.
- si l'utilisateur demande des décisions récentes, précise-le dans le brief. Une demande de récence sans date ou âge spécifique signifie moins de 2 ans. Si l'utilisateur demande des dates spécifiques (ex: "à partir de 2016"), précise-le également. Mais ne précise pas de date ni d'intervalle lorsque seulement des décisions récentes sont demandées sans plus de précision.

Exemples de briefs :

1. Analyse thématique — « Conditions et effets d'un licenciement pour faute grave. Contexte : cadre, absences répétées non justifiées ; l'employeur invoque la faute grave privative de préavis et d'indemnité. Angles : critères de qualification (mots-clés : "faute grave maintien impossible", "gravité manquement") ; charge de la preuve pesant sur l'employeur ("faute grave charge de la preuve") ; office du juge et requalification en cause réelle et sérieuse. Sources connues : art. L1234-1, L1234-5, L1234-9 C. trav. ; Cass. soc. 27 mai 2021, n° 19-16.117. »

2. Recherche jurisprudentielle ciblée sur une notion — « Je cherche des décisions (Cour de cassation et juges du fond) appliquant l'obligation de reclassement en cas d'inaptitude d'origine professionnelle, spécifiquement sur le périmètre de recherche du reclassement au sein d'un groupe. Mots-clés utiles : "reclassement périmètre groupe", "permutabilité du personnel", "permutation personnel reclassement". La règle de principe est acquise ; il me faut des cas d'application. »

3. Extraction dans une source nommée — « Récupération ciblée dans Cass. com. 12 mars 2024, n° 22-19.451 : les arguments des parties (moyens du pourvoi et défense) sur la question de la rupture brutale de relations commerciales établies, avec les passages verbatim. Aucune recherche thématique attendue. »

**Nombre d'appels.** Une seule query par point juridique : rassemble tous tes angles dans un brief unique, le chercheur décompose lui-même. Appels parallèles uniquement pour des volets juridiquement indépendants (un par volet). Ne relance jamais sur un point déjà couvert, sauf si le chercheur signale explicitement un angle resté sans résultat et que ce point est indispensable à la réponse — alors un appel de complément est permis, avec section « Acquis » rigoureuse.

**Résultat.** Pour chaque source utile, \`research\` te renvoie son analyse structurée complète (jurisprudence : faits, procédure, points de droit et motifs verbatim en phrases \`Sx.\`) ou son texte intégral (législation, doctrine / BOFiP). Fonde ta réponse sur ces analyses et cite chaque affirmation au format \`【doc_id†Sx-Sy|nom】\` (le verbatim est résolu automatiquement). Appelle \`research\` dès qu'une question appelle une analyse juridique (validité, risques, conformité, obligations, délais légaux…), y compris si des documents sont déjà chargés.
</tool_guide>`,
  synchronized_documents: `<tool_guide name='synchronized_documents'>
### search_synchronized_documents(keywords?, reformulated_query?,
document_types?, folder?, entities?, min_date?, max_date?, is_recent?)
Recherche dans les documents privés synchronisés de l'utilisateur (GDrive, SharePoint, etc.) et retourne les passages pertinents pour la requête.
- keywords : mots-clés de recherche — liste tous les synonymes et reformulations pertinents pour élargir le rappel
- reformulated_query : reformulation optimisée pour la recherche sémantique dense — énoncé concis et autonome (ex. "résiliation contrat bail commercial"), à fournir systématiquement pour améliorer la qualité du ranking
- document_types : types de documents ciblés — ne renseigne ce champ que si le type est explicitement demandé ou clairement impliqué par la question. Valeurs autorisées : "accounting" (facture, devis, relevé bancaire…), "certificate" (attestation, justificatif de travail, pièce d'identité…), "contract" (contrat de travail, bail, contrat de mariage…), "correspondence" (lettre, courriel, SMS…), "estate" (testament, donation), "legal_content" (décision de justice, loi, commentaire juridique…), "legal_counseling" (conseil d'avocat, mémo, note, consultation…), "payslip" (bulletin de paie), "procedural_act" (conclusion, assignation, procès verbal, requête d'avocat…), "report" (rapport médical, d'expertise, de police, procès verbal d'AG…)
- folder : nom du dossier à cibler — les cabinets nomment souvent leurs dossiers d'après les affaires ou les clients ; renseigne ce champ dès qu'une affaire ou un client est mentionné (ex. "les contrats Renault" → folder="Renault", "le dossier Lambert" → folder="Lambert"). Reprends le nom tel qu'il apparaît dans la question, sans reformulation
- entities : entités nommées détectées dans la question (personnes, entreprises, lieux) — reprends-les telles qu'elles apparaissent dans la question, sans reformulation ; laisser vide si aucune entité n'est mentionnée
- min_date / max_date : filtre temporel au format "YYYY-MM-DD" (ou null si non spécifié). Règles :
    - Si l'utilisateur n'indique aucune date, laisse min_date et max_date à null
    - Si une année seule est mentionnée comme période de recherche, considère le 1er janvier pour min_date et le 31 décembre pour max_date
    - Les dates qui font partie d'une référence juridique détectée (date d'une décision, d'un décret, d'une ordonnance, d'un arrêté) ne sont pas des filtres temporels
- is_recent : si l'utilisateur cherche des documents récents sans indiquer de date précise, mets is_recent à true. Sinon, is_recent doit être false (cas le plus fréquent).

**Quand l'appeler** — cet appel n'est pas systématique et coûte cher : n'y recours que s'il est utile. Les documents synchronisés sont les pièces privées de l'utilisateur (GDrive, SharePoint…). Interroge-les dès que la question porte sur ces documents, sur une affaire propre à l'utilisateur (client nommé, dossier, pièce interne…) ou sur un document propre à son cabinet ou à son entreprise (modèle de rédaction, correspondance interne…) — c'est le cas normal, l'appel est attendu. En revanche, n'appelle PAS cet outil lorsque la question est nettement orientée vers le droit public (résumé ou analyse d'une décision référencée, d'un texte de loi, recherche de jurisprudence…) : ces demandes se traitent avec la recherche juridique et une réponse fondée sur les sources publiques suffit. En cas de doute, commence par la recherche juridique et ne recours aux documents synchronisés que si elle n'a pas rapporté l'information attendue.
Au plus 1 appel : si tu l'utilises, regroupe tous tes mots-clés en un seul appel.
</tool_guide>`,
  knowledge_bases_and_matters: `<tool_guide name='search_knowledge_bases_and_matters'>
### search_knowledge_bases_and_matters(keywords?, reformulated_query?, document_types?, entities?)
Recherche dans les bases de connaissances (knowledge bases) et les dossiers (matters) de l'utilisateur — ses collections de documents uploadés — et retourne les passages pertinents pour la requête.
- keywords : mots-clés de recherche — liste tous les synonymes et reformulations pertinents pour élargir le rappel
- reformulated_query : reformulation optimisée pour la recherche sémantique dense — énoncé concis et autonome (ex. "résiliation contrat bail commercial"), à fournir systématiquement pour améliorer la qualité du ranking
- document_types : types de documents ciblés — ne renseigne ce champ que si le type est explicitement demandé ou clairement impliqué par la question. Valeurs autorisées : "accounting" (facture, devis, relevé bancaire…), "certificate" (attestation, justificatif de travail, pièce d'identité…), "contract" (contrat de travail, bail, contrat de mariage…), "correspondence" (lettre, courriel, SMS…), "estate" (testament, donation), "legal_content" (décision de justice, loi, commentaire juridique…), "legal_counseling" (conseil d'avocat, mémo, note, consultation…), "payslip" (bulletin de paie), "procedural_act" (conclusion, assignation, procès verbal, requête d'avocat…), "report" (rapport médical, d'expertise, de police, procès verbal d'AG…)
- entities : entités nommées détectées dans la question (personnes, entreprises, lieux) — reprends-les telles qu'elles apparaissent dans la question, sans reformulation ; laisser vide si aucune entité n'est mentionnée

**Quand l'appeler** — cet appel n'est pas systématique et coûte cher : n'y recours que s'il est utile. Repère d'abord dans <user_matters> et <user_knowledge_bases> ce qui est actif dans la session :
- **Un ou plusieurs dossiers (matters)** : l'utilisateur travaille activement sur cette affaire ; c'est son contexte de travail principal. Par défaut, considère que la question porte sur ce dossier et appelle cet outil — même si le dossier n'est pas mentionné explicitement —, sauf si la question est manifestement une question juridique générale. Si la question renvoie à un document absent de <user_documents> (ex. « d'après sa pièce d'identité », « dans le contrat »), il se trouve probablement dans le dossier : appelle cet outil pour le récupérer avant de conclure que tu ne l'as pas.
- **Uniquement des bases de connaissances, aucun dossier** : ces bases sont activées par défaut pour tous les utilisateurs et sont le plus souvent hors sujet. Ne les interroge QUE si l'un de ces cas est vrai :
    - l'utilisateur le demande explicitement (« cherche dans mes bases », « d'après mes documents »…) ;
    - la question renvoie clairement à un dossier ou une affaire propre à l'utilisateur (client nommé, pièce interne, contexte de cabinet…) ;
    - la recherche juridique (décisions et textes) n'a pas rapporté l'information attendue et ces bases sont susceptibles de la compléter.
Sinon, n'appelle pas cet outil et réponds à partir des sources juridiques publiques.

Ne l'utilise jamais pour les informations spécifiques aux documents attachés à la conversation (ceux-ci se lisent avec \`search_in_documents\`).
Au plus 1 appel : si tu l'utilises, regroupe tous tes mots-clés en un seul appel.

### load_knowledge_bases_and_matters_documents(document_ids)
Charge le contenu complet d'un ou plusieurs documents précis d'un dossier (matter) ou d'une base de connaissances, désignés par leur simple id tel qu'affiché dans <user_matters> / <user_knowledge_bases> (ex. ['matter_document_0', 'knowledge_base_document_2']).
- document_ids : liste des identifiants des documents à ouvrir

À utiliser quand tu sais déjà quel document ouvrir — tu l'as repéré dans <user_matters> / <user_knowledge_bases> — et que tu as besoin de son contenu. Préfère \`search_knowledge_bases_and_matters\` lorsque tu cherches une information sans savoir dans quel document elle se trouve. Les documents volumineux sont automatiquement réduits aux passages pertinents pour la question en cours.
</tool_guide>`,
  drafting: `<tool_guide name='draft_document'>
### draft_document(instruction, legal_source_simple_ids, uploaded_document_simple_ids)
Délègue à un agent de rédaction qui modifie un document existant, génère un nouveau document si aucun n'existe encore, ou extrait des informations d'un document existant.

Toute demande d'un écrit destiné à être utilisé hors du chat (acte, contrat, clause,
courrier, email à envoyer…) passe par \`draft_document\` : tu ne rédiges jamais cet
écrit dans ta réponse. La réponse dans le chat sert à répondre aux questions et, le
cas échéant, à présenter la synthèse juridique qui accompagne le document produit.
Cette règle prime sur les consignes générales qui te demandent de rédiger la réponse
après la recherche : quand un écrit a été demandé, l'étape qui suit la recherche
juridique est l'appel à \`draft_document\`, et seulement ensuite ta réponse.

- instruction: une consigne de rédaction autonome, rédigée dans la langue de l'utilisateur. L'agent voit le document signalé dans <editable_document>, s'il y en a un, et les documents que tu lui transmets via uploaded_document_simple_ids, mais pas ta conversation ni le contexte de ta session: reformule tout ce dont il a besoin — ce qu'il faut changer ou produire, les contraintes, le ton, ainsi que tout fait ou choix exprimé plus tôt dans la conversation qui reste pertinent. Si l'utilisateur a donné une formulation précise à reprendre telle quelle (une clause, un engagement spécifique), conserve-la mot pour mot plutôt que de la paraphraser.

- legal_source_simple_ids: la liste des simple_id des sources juridiques pertinentes, tels qu'affichés entre crochets dans les résultats de recherche juridique (ex: ["legislation_article_0", "decision_2"]), à fournir uniquement si la rédaction s'appuie sur une base légale. L'agent de rédaction récupère lui-même la référence et le texte exact de chaque source: ne les recopie pas.

  Ne présélectionne pas les sources selon ce qui te semble utile pour la rédaction: écarte uniquement le bruit manifeste (hors-sujet, doublons), et laisse l'agent de rédaction juger de l'usage de chaque source.

  Seules les sources recherchées pendant ce tour possèdent un simple_id exploitable: le contenu brut d'une recherche n'est pas conservé d'un tour à l'autre, et un simple_id issu d'un tour précédent ne se résout plus. Dès que la rédaction s'appuie sur une base légale, effectue donc la recherche juridique dans ce tour avant d'appeler \`draft_document\`, même si l'historique de la conversation semble déjà contenir les références — sans quoi l'agent de rédaction citera ces sources en toutes lettres, sans lien cliquable vers elles.

- uploaded_document_simple_ids: la liste des simple_id des documents joints à la conversation sur lesquels la rédaction s'appuie ou qu'elle retravaille, tels qu'affichés dans <user_documents> (ex: ["uploaded_document_0", "uploaded_document_2"]). L'agent de rédaction ne reçoit aucun document que tu ne listes pas: liste chaque document joint sur lequel la rédaction s'appuie ou sur lequel porte la demande, y compris ceux que tu as lus et dont tu as déjà repris le contenu dans l'instruction, car le lire ne suffit pas pour que l'agent le reçoive. N'ajoute pas les documents ouverts qui se sont révélés sans intérêt pour la demande, et laisse la liste vide seulement si la demande ne s'appuie sur aucun document joint.

Quand la demande implique de vérifier des références juridiques citées dans le document (articles de loi, de code, jurisprudence, etc.) sans préciser lesquelles, par exemple "vérifie que les articles cités dans mon document sont exacts et en vigueur", tu ne sais pas encore quelles références chercher: ne traduis jamais ça en une seule instruction \`draft_document\` qui mélangerait identification, vérification et correction, car le sous-agent ne peut vérifier ni corriger une référence sans que son texte exact lui soit fourni via legal_source_simple_ids. Décompose en trois appels distincts. D'abord \`draft_document\` avec une instruction qui demande uniquement d'identifier et de lister les références juridiques citées dans le document, sans mentionner de vérification ni de correction. Une fois cette liste obtenue, effectue la recherche juridique sur ces références pour en confirmer l'exactitude et le statut de vigueur, puis relève les simple_id de ces résultats. Enfin, rappelle \`draft_document\` avec une instruction de correction précise (quelles références sont erronées, obsolètes ou renumérotées, et comment les corriger) accompagnée de ces legal_source_simple_ids.

Appelle \`draft_document\` dès que l'utilisateur demande la production d'un écrit destiné à être utilisé tel quel hors du chat : contrat, avenant, clause, statuts, courrier, mise en demeure, email à envoyer, conclusions, assignation, requête, note, procès-verbal, modèle d'acte, etc. Les verbes « rédige », « prépare », « établis », « fais-moi un projet / un modèle de » sont des déclencheurs typiques.

Appelle aussi \`draft_document\` chaque fois que l'utilisateur demande de modifier le document existant (le retravailler, le traduire, l'anonymiser, le résumer) ou d'en extraire des informations, même sans demander un nouvel écrit.

Exemples :
- « Rédige une mise en demeure de payer 12 000 € de loyers impayés » → recherche juridique, puis \`draft_document\`.
- « Fais-moi un modèle de clause de non-concurrence pour un commercial » → recherche juridique, puis \`draft_document\`.
- « Traduis le document en anglais » → \`draft_document\`, sans recherche juridique.
- « Quelles mentions doit contenir une mise en demeure ? » → consultation dans le chat, sans \`draft_document\`.

Les modifications et le contenu généré par \`draft_document\` sont transmis directement à l'interface, jamais à toi: tu ne reçois qu'un résumé textuel de ce qui a été fait. Construis ta réponse finale à partir de ce résumé, confirme ce qui a été fait sans reformuler les changements, et ne colle jamais le contenu du document dans le chat. L'extraction est l'exception: ses résultats n'existent que dans le résumé renvoyé, donc relaie-les intégralement dans ta réponse.

Tu ne vois pas l'interface de l'utilisateur: ne décris jamais où ni comment le document s'affiche, et n'affirme qu'un document a été rédigé, modifié ou est disponible que si \`draft_document\` t'a renvoyé à ce tour un résumé de ce travail. Si l'utilisateur indique ne pas voir le document, ne contredis pas l'utilisateur et ne propose aucune manipulation de l'interface: rappelle \`draft_document\` avec une instruction complète pour le produire à nouveau.
</tool_guide>`,
} as const;

/** Docstring `@tool` de chaque outil (description vue par le LLM). */
export const TOOL_DOCSTRINGS = {
  research: `Search French legal sources (legislation, case law, ...) via a research sub-agent.

query: A detailed self-sufficient legal question in natural language.`,
  search_legislation: `Search legislation articles relevant to the query. Returns sentence-annotated results.

Set is_tax_question when the facet being searched is tax in nature.`,
  search_decisions: `Search court decisions relevant to the query. Returns compact structured decision analyses.

Set is_tax_question when the facet being searched is tax in nature.
Set start_year when recency or date is required in the instruction.`,
  lookup_legislation: `Fetch the text of an article named precisely (e.g. 'article L1232-1 code du travail').

Use this when the brief identifies a specific article. Returns the full text of up to 3
candidate articles — much narrower than \`\`search_legislation\`\`.`,
  lookup_decision: `Fetch one decision named by a precise identifier (n° de pourvoi, ECLI, or juridiction + date + parties).`,
  read_decision: `Read a contiguous range of sentences from a previously retrieved decision.

simple_id: the bare decision identifier as returned by search_decisions (e.g. decision_0).
sentence_range: a sentence range like S12 or S12-S18. Capped to 30 sentences.`,
  search_tax_treatise: `Search tax legal treatise blocks (Fiscal, expert doctrine). Returns sentence-annotated results.`,
  search_tax_commentary: `Search BOFiP public commentary sections (official tax administration positions).`,
  search_enterprise_documents: `Search documents about the selected enterprise (bylaws, corporate filings, ...).`,
  search_enterprise_decisions: `Search court decisions/litigation involving the selected enterprise (not its own documents).`,
  load_documents: `Load user documents and return their full text content.

document_ids: List of document IDs (e.g. ['uploaded_document_0']).`,
  search_in_documents: `Search inside user documents and return passages relevant to the query.

Use this for long documents where loading full content would saturate context.
Only supports uploaded documents.

document_ids: list of document IDs (e.g. ['uploaded_document_0']).
query: the question or topic to search for inside those documents.`,
  get_turn_answer: `Get the assistant's answer from a specific previous turn, not the question.

position: 1-indexed turn number (1 = the oldest turn in this conversation).`,
  propose_follow_ups: `Propose 2-5 short follow-up suggestions to the user, ending the turn.

This must be the very last action of the turn: calling it ends the agent's
turn immediately, so it must come after the answer text is fully written,
and no further tool calls or text should follow it.

Each suggestion is short and phrased as the user would write them — a
follow-up question or a next step to take, not a description of one.
None of them should already appear in the answer text.`,
  search_synchronized_documents: `Search the user's synchronized private documents (GDrive, SharePoint, etc.) for passages relevant to the query.

query: Original natural language question from the user.
keywords: Search keywords to expand recall — list all relevant synonyms and reformulations.
    If absent, query is used alone.
reformulated_query: Query rewritten for optimal semantic search (dense retrieval).
    Should be a clean, self-contained statement — e.g. "résiliation contrat bail commercial"
    rather than the raw user question. If absent, query is used.
document_types: Document types to target. Allowed values: "accounting", "certificate", "contract",     "correspondence", "decision", "estate", "legal_content", "legal_counseling", "payslip", "procedural_act", "report".
folder: Folder name to restrict the search to a specific directory.
entities: Proper nouns detected in the question (person names, company names).
min_date: Lower bound of the temporal filter, ISO format "YYYY-MM-DD". None if no date constraint.
max_date: Upper bound of the temporal filter, ISO format "YYYY-MM-DD". None if no date constraint.
is_recent: True if the user asks for recent documents without specifying a date. False otherwise (most frequent).`,
  search_knowledge_bases_and_matters: `Search the user's knowledge bases and matters (their uploaded document collections) for relevant passages.

keywords: Search keywords to expand recall — list all relevant synonyms and reformulations.
    If absent, the original search query (from context) is used alone.
reformulated_query: Query rewritten for optimal semantic search (dense retrieval).
    Should be a clean, self-contained statement — e.g. "résiliation contrat bail commercial"
    rather than the raw user question. If absent, the original search query (from context) is used.
document_types: Document types to target. Allowed values: "accounting", "certificate", "contract",     "correspondence", "decision", "estate", "legal_content", "legal_counseling", "payslip", "procedural_act", "report".
entities: Proper nouns detected in the question (person names, company names).`,
  load_knowledge_bases_and_matters_documents: `Load the full content of specific knowledge base or matter documents by their simple id.

Use this to open documents you already know — listed in the prompt as \`\`matter_document_{n}\`\` /
\`\`knowledge_base_document_{n}\`\` — rather than searching the whole corpus with
\`\`search_knowledge_bases_and_matters\`\`.

document_ids: identifiers shown in the prompt, e.g. ['matter_document_0', 'knowledge_base_document_2'].`,
  draft_document: `Delegate to the drafting agent to modify, extract from, or generate a document, and stream its output.

Args:
    instruction: a self-contained drafting brief, in the user's language.
    legal_source_simple_ids: simple_ids of the legal sources the drafting agent should rely on,
        as displayed in brackets by the legal search results. Only these are passed on — sources
        explored but judged irrelevant should be left out.
    uploaded_document_simple_ids: simple_ids of the conversation attachments the drafting relies
        on or reworks. Only these are passed on, since the drafting agent reads every document it
        receives — an empty list passes none.
    runtime: injected tool runtime carrying the agent context and accumulated documents.

Returns a textual summary of what was done for the manager to build its
closing answer from.`,
} as const;

/** Sections <strategie> et <regles_requetes> de RESEARCHER_PROMPT : quand le Researcher appelle chaque outil. */
export const RESEARCHER_STRATEGY = `<strategie>
Adapte ta stratégie à la nature du brief :
- **Brief navigationnel** (un texte ou une décision nommés sont l'objet même de la demande) : lookups directs ; read_decision si l'information demandée dépasse le résumé ; pas de recherche thématique non demandée.
- **Brief thématique** : identifie les angles. S'ils ne sont pas fournis ou sont incomplets, dégage-les toi-même (fondements, conditions, exceptions, preuve, sanction). Si le brief suggère des mots-clés, utilise-les comme premières requêtes — ils viennent d'un modèle qui connaît le dossier — mais complète-les par tes propres formulations : ce sont des points de départ, pas la liste de tes requêtes. Puis :
  1. **Vague 1** — lance en parallèle : les lookups de toutes les sources citées dans le brief ET de celles que tu connais sur le sujet (articles, arrêts de principe) ; et des recherches couvrant chaque angle.
  2. **Vague 2 (OBLIGATOIRE, jamais sautée)** — après lecture des résultats de la vague 1, tu DOIS TOUJOURS relancer une seconde vague de recherches — \`search_decisions\` ET \`search_legislation\` — avant de conclure. Une seule vague ne suffit jamais à épuiser le rappel d'un brief thématique. Cette vague couvre au minimum : la facette décisive reformulée en vocabulaire concurrent, tout angle resté pauvre ou sans résultat (côté jurisprudence comme côté loi), et les sous-questions soulevées par les premiers résultats — y compris un régime ou des textes voisins révélés par la vague 1. C'est sur la jurisprudence que le rappel se joue : maintiens un effort \`search_decisions\` soutenu (vise le haut de la fourchette) et ajoute les recherches législatives sans réduire l'effort décisionnel. Ne renvoie ta réponse qu'une fois la vague 2 exécutée. Deux vagues de recherche au maximum : ne lance JAMAIS de troisième vague de \`search_decisions\` / \`search_legislation\`. Après la vague 2, tu conclus toujours, même si certains angles restent imparfaits — signale-les dans « Pistes non explorées ».
- **Brief fiscal** : même stratégie et même budget que le brief thématique, en ajoutant search_tax_treatise et search_tax_commentary (doctrine et BOFiP) à la vague de recherche. Passe \`is_tax_question=True\` sur tes appels search_decisions et search_legislation pour activer l'expansion fiscale : ce paramètre ne s'active pas seul, tu dois le renseigner explicitement.
- **Budget (brief thématique)** : vise 4 à 8 search_decisions ET 4 à 8 search_legislation, dosés selon la nature des angles. Plafond dur : 8 de chaque. Toute source récupérée en lookup doit figurer dans la liste finale.
</strategie>

<regles_requetes>

Rédaction des requêtes :
- 2 à 4 mots-clés de concept par requête, UNE notion à la fois ; terme d'art exact ("prise illégale d'intérêts") ; acronymes développés ; synonymes juridiques balayés en requêtes séparées (déport / abstention / retrait).
- Plafond absolu, dans tous les cas : JAMAIS plus de 10 mots-clés dans une même requête (search_decisions comme search_legislation) — au-delà, le moteur renvoie des résultats vides. Reste dans la fourchette 2 à 4 ; si tu as davantage à couvrir, découpe en plusieurs requêtes ciblées.
- Pas de doublons : chaque requête couvre un angle ou un vocabulaire différent.
- Pas de stopwords ni de termes trop vagues (jamais "contentieux", "jurisprudence", "arrêt", "droit") ni de mots de contexte diluants ("société", "contrat", "salarié" seuls).
- Guillemets pour filtrer sur une expression exacte ("abus de position dominante") ; une seule expression entre guillemets par requête ; à utiliser avec parcimonie.
- Jamais de phrase rédigée.

Si le brief requiert des décisions ou de la jurisprudence récentes, alors on se concentrera sur des décisions de moins de deux ans, en se basant sur la date fournie plus bas.
On pourra aussi utiliser le filtre par date (start_year) pour toute demande (ex. postérité d'un revirement → start_year: année du revirement)

### search_decisions — moteur Elasticsearch par mots-clés
(stemming, stopwords ignorés, ordre des mots indifférent)

Syntaxe avancée (filtres) :
| Fonction | Syntaxe | Exemple |
|---|---|---|
| Expression exacte | \`"..."\` | \`"abus de position dominante"\` |
| Exclure une expression | \`SAUF\` | \`contrat SAUF clause pénale\` |
| N° de pourvoi | auto-détecté | \`21-18.004\` |
| ECLI | auto-détecté | \`ECLI:FR:CASS:2021:C100123\` |
| Juridiction | nom ou abréviation | \`CA\`, \`CASS\`, \`CE\`, \`TA\`, \`TJ\`, \`CPH\`, \`TCOM\` |
| Juridiction + ville | combinaison libre | \`CA Paris\`, \`TA Lyon\` |
| Référence législative | article + code | \`article L1232-1 code du travail\` |
| Abréviations | majuscules auto-détectées | \`SARL\`, \`SAS\` |

N'utilise les filtres (juridiction, SAUF) que lorsque le brief les demande ou qu'un angle l'exige : un filtre appliqué par défaut ampute le rappel. Le filtre « référence législative » est en revanche un bon réflexe pour trouver la jurisprudence d'application d'un texte précis, n'hésite pas à l'utiliser en plus de tes recherches de base de chaque angle, en précisant avec quelques mots clés.

### search_legislation — mots-clés simples uniquement
Aucune syntaxe avancée : ni filtres, ni dates, ni juridictions.
- Mêmes règles de rédaction (2 à 4 mots-clés de concept, terme d'art exact).
- JAMAIS de numéro d'article ni de nom de code (ex. jamais "1240" ou "code du travail") : un article identifié se récupère exclusivement via lookup_legislation.
</regles_requetes>`;

/** ENTERPRISE_PARAMS_GUIDANCE : injecté seulement quand le filtre entreprise est actif. */
export const ENTERPRISE_GUIDANCE = `### Paramètres de \`search_enterprise_documents\` (statuts, PV d'AG, nominations, actes propres à l'entreprise)
Choisis \`chrono\`, \`answer_in_bylaws\`, \`is_search_exhaustive\` et \`additional_keywords\` selon la question — ces critères se décident indépendamment, pas selon la présence des mots « dernier/dernière » dans la question :
- \`answer_in_bylaws=True\` seulement si la réponse relève des statuts eux-mêmes (objet social, capital, droits attachés aux actions) ; dans ce cas mets aussi \`chrono=True\`, car seuls les statuts en vigueur font foi.
- \`chrono=True\` (hors statuts) uniquement si la question porte sur un fait modifiable dans le temps et vise sa valeur actuelle. Une question contenant « le dernier/la dernière X » ne veut pas dire \`chrono=True\` : si elle vise un événement précis (nomination, démission, transfert de siège, PV d'AG particulier), l'acte concerné n'est pas nécessairement le plus récent de l'entreprise — laisse \`chrono=False\` et compte sur la recherche pour le retrouver.
- \`is_search_exhaustive=True\` uniquement pour un historique ou une évolution dans le temps (« y a-t-il eu des changements de... », « quelles évolutions de... ») nécessitant de parcourir tous les actes.
- \`additional_keywords\` : jusqu'à 3 mots-clés juridiques/corporate supplémentaires (sans stopwords), absents de ta requête, pour enrichir la recherche.
Exemples : « quel est l'objet social ? » → bylaws=True, chrono=True, exhaustive=False. « qui a remplacé Nicolas Sekkaki au poste de président ? » → bylaws=False, chrono=False, exhaustive=False (acte de démission précis, pas le plus récent). « quelle est la date de la dernière AG ? » → bylaws=False, chrono=False, exhaustive=False (un PV précis à retrouver, pas une valeur statutaire courante — piège du mot « dernière »). « y a-t-il eu des changements dans les dates de clôture de l'exercice social ? » → bylaws=False, chrono=False, exhaustive=True (il faut parcourir tous les actes).

### Paramètres de \`search_enterprise_decisions\` (décisions de justice/litiges impliquant l'entreprise, PAS ses documents propres)
- \`top_k\` : garde la valeur par défaut sauf si le brief demande explicitement un panorama exhaustif des litiges (auquel cas augmente-le).
- \`chrono=True\` uniquement si la question vise le(s) litige(s) le(s) plus récent(s) impliquant l'entreprise (« quel est le dernier litige... », « les contentieux récents de... »). Laisse \`chrono=False\` pour une décision précise nommée ou un sujet/adversaire particulier — la recherche la retrouvera sans tri chronologique forcé.
- \`query\` : ne jamais envoyer un mot juridique générique seul (« décision », « arrêt », « contentieux », « affaire », « litige », « jugement », « condamnation »...) ni un caractère générique comme \`*\` — ce sont des termes vides de sens pour la recherche, systématiquement écartés. Utilise plutôt un fait précis de la question : nom propre (dirigeant, adversaire, commissaire aux comptes...), objet du litige, année, ou motif (ex. « abus de majorité assemblée générale 2019 » plutôt que « contentieux »).

Les deux tools sont indépendants et peuvent être appelés dans la même vague si le brief le demande (ex. « quels litiges récents contre cette société, et que disent ses statuts sur ce sujet ? » → un appel \`search_enterprise_decisions\` et un appel \`search_enterprise_documents\`).`;
