export const PIANO_GUIDE_SECTIONS = [
  {
    title: "Cos'è il Piano di Studi",
    content: "Il Piano degli Studi è il documento ufficiale con cui dichiari a PoliMi quali esami intendi sostenere. Va compilato ogni anno nei Servizi Online.",
  },
  {
    title: "Flusso: Bozza → Pronto → Compilato",
    content: "1) Pianifica liberamente nella Bozza. 2) Quando tutti i vincoli sono soddisfatti, marcalo Pronto. 3) Copia i corsi nei Servizi Online PoliMi. 4) Torna qui e clicca 'Ho copiato su PoliMi' per congelare lo storico.",
  },
  {
    title: "CFU Tassa Anno",
    content: "CFU per cui paghi la tassa di iscrizione nell'anno corrente. Include i corsi effettivi dell'anno + i recuperi non ancora verbalizzati.",
  },
  {
    title: "Recuperi Scalati",
    content: "CFU di corsi recuperati che hai già verbalizzato. Vengono scalati dalla tassa perché già pagati in anni precedenti.",
  },
  {
    title: "Soprannumero",
    content: "Corsi in eccesso rispetto ai 180 CFU. Non contano per la laurea, limite massimo 32 CFU.",
  },
  {
    title: "Reinserimenti obbligatori",
    content: "Se un esame era nel piano dell'anno scorso ma non l'hai ancora superato, PoliMi richiede di reinserirlo nel piano dell'anno corrente.",
  },
  {
    title: "Categorie (A/B/C/D/V/T)",
    content: "A=Attività di base (min 50 CFU), B=Caratterizzanti (min 60 CFU), C=Affini/integrative (min 18 CFU), D=Scelta studente (12-18 CFU), V=Prova finale (5 CFU), T=Tirocinio.",
  },
  {
    title: "Approvazione automatica vs commissione",
    content: "Il piano approvato dopo la scadenza del periodo di revisione è automaticamente approvato. Se inviato prima, può richiedere la commissione didattica.",
  },
];

export const ACTIVITY_CATEGORY_DETAILS: Record<string, { label: string; description: string }> = {
  A: { label: "Attività di base", description: "Matematica, informatica, fisica (min 50 CFU)" },
  B: { label: "Caratterizzanti", description: "Ingegneria informatica (min 60 CFU)" },
  C: { label: "Affini/integrative", description: "Corsi affini al percorso (min 18 CFU)" },
  D: { label: "Scelta studente", description: "Corsi a scelta libera (12-18 CFU)" },
  V: { label: "Prova finale", description: "Tesi/elaborato finale (5 CFU)" },
  T: { label: "Tirocinio", description: "Stage/tirocinio curriculare" },
};
