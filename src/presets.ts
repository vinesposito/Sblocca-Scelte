export interface PresetTemplate {
  title: string;
  context: string;
  options: string[];
  emoji: string;
}

export const PRESET_DECISIONS: PresetTemplate[] = [
  {
    title: "Comprare un'auto elettrica",
    context: "Sostituire la mia vettura diesel attuale con un'auto elettrica per percorsi giornalieri di 45 km, ricaricando principalmente a casa di notte.",
    options: ["Acquistare auto elettrica", "Tenere auto diesel attuale"],
    emoji: "⚡"
  },
  {
    title: "Accettare un lavoro in una startup",
    context: "Ho un posto stabile in una grande azienda, ma mi è stato offerto un ruolo di leadership in una startup innovativa con orario flessibile, stock options e alto rischio.",
    options: ["Passare alla Startup", "Restare nella grande azienda"],
    emoji: "🚀"
  },
  {
    title: "Trasferirsi a Milano per fare carriera",
    context: "Abito in una cittadina di provincia confortevole con affitti bassi, ma sto pensando di trasferirmi a Milano per sbloccare più opportunità lavorative e network.",
    options: ["Trasferirsi a Milano", "Rimanere in provincia"],
    emoji: "🌆"
  },
  {
    title: "Investire in un Master Specialistico",
    context: "Ho concluso la laurea triennale e non so se accettare subito un'offerta di lavoro entry-level o investire 6.000€ nell'iscrizione a un Master intensivo di 1 anno.",
    options: ["Fidarsi del Master", "Lavorare subito"],
    emoji: "🎓"
  }
];
