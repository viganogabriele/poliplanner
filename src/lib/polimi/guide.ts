export const PIANO_GUIDE_SECTIONS = [
  {
    title: "Il piano è annuale, non la laurea",
    content: "Il Piano degli Studi si presenta ogni anno e vale un anno. Qui pianifichi un anno accademico alla volta: prima gli esami da reinserire, poi le nuove frequenze. I 180 CFU della triennale si leggono dalla carriera, non da questo piano.",
  },
  {
    title: "Carriera, frequenza ed esame superato",
    content: "Frequenza acquisita significa che l'insegnamento era nel piano di un anno precedente. Esame superato significa verbalizzato. Sono due cose diverse: un esame passato ma non ancora registrato in carriera, per PoliMi, non è superato.",
  },
  {
    title: "Da reinserire",
    content: "Gli esami già frequentati e non ancora verbalizzati vanno reinseriti nel piano nuovo prima di aggiungere nuove frequenze. Vale anche per i corsi del secondo semestre che pensi di recuperare a gennaio o febbraio. Un reinserimento riporta la riga com'era: stesso blocco, stesso anno di offerta.",
  },
  {
    title: "\"Non scelto\" non vuol dire \"non superato\"",
    content: "Il Regolamento dice che Logica e Algebra e Algoritmi e Principi dell'Informatica, obbligatori per I3I, «se non scelti al secondo anno devono essere scelti al terzo anno (TABREC)». La condizione è sulla scelta, non sull'esito. Da qui due casi opposti. Se l'insegnamento era nel tuo piano del secondo anno e l'esame non è verbalizzato, è un reinserimento: resta nel blocco in cui l'avevi scelto e non consuma una seconda volta i CFU del gruppo a scelta del terzo anno. Se invece non l'avevi mai scelto, adesso lo scegli nella tabella dei recuperi: è una nuova frequenza e i suoi CFU pesano su quel gruppo. Logica e Algoritmi seguono ciascuno la propria storia: puoi averne uno reinserito e l'altro da scegliere.",
  },
  {
    title: "Verbalizzato dopo la presentazione",
    content: "Se superi e verbalizzi l'esame dopo aver presentato il piano, l'attività si chiude in carriera ma la riga resta nel piano presentato: non conta più per la contribuzione. Nella finestra di modifica del secondo semestre non puoi togliere quella riga se è del primo semestre, nemmeno se l'hai superata.",
  },
  {
    title: "Nuove frequenze e contribuzione",
    content: "Solo le nuove frequenze contano nei CFU di nuova frequenza e quindi nella contribuzione: un reinserimento è già stato pagato. Se passi l'esame all'appello di recupero, l'insegnamento esce dalle nuove frequenze.",
  },
  {
    title: "Modifica del secondo semestre",
    content: "Nella finestra di modifica puoi aggiungere o togliere solo insegnamenti del secondo semestre dello stesso anno accademico. Non puoi cambiare percorso/PSPA, non puoi toccare il primo semestre e non puoi autocertificare esami non ancora registrati in carriera.",
  },
  {
    title: "Il gruppo da 15 CFU non si chiude necessariamente subito",
    content: "Il totale del gruppo a scelta è attestato dal Regolamento, ma il momento in cui lo raggiungi no. Poiché le tabelle contengono insegnamenti del secondo semestre, un ammanco colmabile con quelli è un avviso e non un errore: puoi completarlo nella presentazione annuale oppure nella finestra di modifica semestrale. Attenzione a cosa entra nel conteggio: un insegnamento conta in quel gruppo solo se lo hai scelto in una di quelle tabelle. Lo stesso codice scelto in un blocco obbligatorio del secondo anno non ci rientra.",
  },
  {
    title: "Manifesto, prassi e ipotesi",
    content: "Ogni segnalazione dice da dove viene. \"Regolamento\": vincolo attestato dal Regolamento didattico del corso. \"Da verificare\": regola operativa plausibile ma da confermare nei Servizi Online, come le finestre di presentazione, l'intervallo di CFU per anno o i moduli di progetto associati a una scelta in tabella di recupero. \"Simulazione\": un'ipotesi che hai introdotto tu nel simulatore. Un anno accademico può inoltre essere marcato \"dati da riconfermare\" quando il Regolamento pubblicato è ancora una bozza informativa: i dati ci sono e sono ufficiali, ma possono cambiare.",
  },
  {
    title: "Simulatore",
    content: "Gli scenari sono ipotesi: mostrano come cambierebbero reinserimenti, nuove frequenze e vincoli se passassi o non passassi un esame. Non modificano la carriera reale finché non li applichi esplicitamente.",
  },
  {
    title: "Errori, avvisi e consigli",
    content: "Un errore blocca la compilazione: il piano così non sta in piedi. Un avviso segnala qualcosa da controllare, spesso un dato non verificabile offline. Un consiglio riguarda la proiezione verso la laurea o la magistrale e non blocca nulla. Le regole di anni di corso successivi a quello che stai pianificando non compaiono mai come errori o avvisi: le trovi in \"Anteprima anni successivi\".",
  },
  {
    title: "Questo non è un servizio ufficiale",
    content: "Poliplanner è un assistente offline: non dialoga con i Servizi Online e non può dichiarare che un piano sia conforme. Prima di presentare il piano confronta ogni riga sul Manifesto e sui Servizi Online PoliMi.",
  },
];

export const ACTIVITY_CATEGORY_DETAILS: Record<string, { label: string; description: string }> = {
  A: { label: "Attività di base", description: "Matematica, informatica, fisica e chimica (min 50 CFU per laurearsi)" },
  B: { label: "Caratterizzanti", description: "Ingegneria informatica, elettronica e telecomunicazioni (min 60 CFU)" },
  C: { label: "Affini/integrative", description: "Corsi affini al percorso (min 18 CFU)" },
  D: { label: "Scelta studente", description: "Corsi delle tabelle a scelta (12-18 CFU, di norma 15)" },
  V: { label: "Prova finale", description: "Moduli progettuali collegati a un insegnamento (5 CFU in totale)" },
  T: { label: "Tirocinio", description: "Facoltativo, dentro le attività a scelta (5 o 10 CFU)" },
};
