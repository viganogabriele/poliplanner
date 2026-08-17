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
    content: "Gli esami già frequentati e non ancora verbalizzati vanno reinseriti nel piano nuovo prima di aggiungere nuove frequenze. Vale anche per i corsi del secondo semestre che pensi di recuperare a gennaio o febbraio.",
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
    content: "Il totale del gruppo a scelta è attestato dal Manifesto, ma il momento in cui lo raggiungi no. Poiché le tabelle contengono insegnamenti del secondo semestre, un ammanco colmabile con quelli è un avviso e non un errore: puoi completarlo nella presentazione annuale oppure nella finestra di modifica semestrale. Per I3I, Logica e Algebra (5 CFU) e Algoritmi e Principi dell'Informatica (10 CFU), se non acquisiti al secondo anno, vanno recuperati in TABREC e contribuiscono a quei 15 CFU.",
  },
  {
    title: "Manifesto, prassi e ipotesi",
    content: "Ogni segnalazione dice da dove viene. \"Manifesto\": vincolo attestato dal Regolamento o dal Manifesto. \"Da verificare\": regola operativa plausibile ma da confermare nei Servizi Online, come le finestre di presentazione o i moduli associati a un recupero. \"Simulazione\": un'ipotesi che hai introdotto tu nel simulatore.",
  },
  {
    title: "Simulatore",
    content: "Gli scenari sono ipotesi: mostrano come cambierebbero reinserimenti, nuove frequenze e vincoli se passassi o non passassi un esame. Non modificano la carriera reale finché non li applichi esplicitamente.",
  },
  {
    title: "Errori, avvisi e consigli",
    content: "Un errore blocca la compilazione: il piano così non sta in piedi. Un avviso segnala qualcosa da controllare, spesso un dato non verificabile offline. Un consiglio riguarda la proiezione verso la laurea o la magistrale e non blocca nulla.",
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
