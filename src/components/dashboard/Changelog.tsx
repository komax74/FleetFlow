interface ChangelogEntry {
  version: string;
  changes: string[];
}

export const changelog: ChangelogEntry[] = [
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
