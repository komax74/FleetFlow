interface ChangelogEntry {
  version: string;
  changes: string[];
}

export const changelog: ChangelogEntry[] = [
  {
    version: "0.9",
    changes: [
      "Migliorata visualizzazione prenotazioni",
      "Aggiunto bordo colorato per stato prenotazioni",
      "Corretto ordinamento prenotazioni",
      "Migliorata logica di gestione prenotazioni",
      "Preparazione per integrazione Firebase",
    ],
  },
  {
    version: "0.8",
    changes: [
      "Migliorato sistema di notifiche",
      "Aggiunto supporto HTML nei messaggi",
      "Ottimizzata visualizzazione mobile",
      "Migliorata UI delle notifiche",
      "Aggiunto sistema di apertura diretta notifiche",
    ],
  },
  {
    version: "0.7",
    changes: [
      "Aggiunto menu hamburger per dispositivi mobili",
      "Migliorata visualizzazione storico prenotazioni",
      "Aggiunta posizione veicoli nelle card",
      "Implementato footer personalizzabile",
      "Aggiunta sezione impostazioni per amministratori",
    ],
  },
  {
    version: "0.6",
    changes: [
      "Modernizzato calendario prenotazioni",
      "Migliorata visualizzazione prenotazioni multi-giorno",
      "Ottimizzata visualizzazione mobile",
      "Risolti problemi di sovrapposizione eventi",
    ],
  },
  {
    version: "0.5",
    changes: [
      "Migliorata gestione immagini veicoli",
      "Aggiunto supporto per upload immagini",
      "Ottimizzata interfaccia gestione veicoli",
    ],
  },
  {
    version: "0.4",
    changes: [
      "Supporto per prenotazioni multiple nella stessa giornata",
      "Visualizzazione orari in formato HH:mm",
      "Migliorata visualizzazione utenti nelle prenotazioni",
    ],
  },
  {
    version: "0.3",
    changes: [
      "Aggiunta gestione manutenzione veicoli",
      "Migliorata visualizzazione calendario",
      "Aggiunto supporto per prenotazioni ricorrenti",
    ],
  },
  {
    version: "0.2",
    changes: ["Aggiunta vista calendario", "Sistema di prenotazione veicoli"],
  },
  {
    version: "0.1",
    changes: ["Rilascio iniziale", "Gestione base dei veicoli"],
  },
];
