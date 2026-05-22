import React, { useState, useEffect, useMemo } from "react";
import {
  Scale,
  Table,
  Flame,
  PlusCircle,
  Trash2,
  HelpCircle,
  Activity,
  ArrowRight,
  Sparkles,
  Plus,
  X,
  Check,
  ChevronRight,
  History,
  AlertCircle,
  ChevronLeft,
  LifeBuoy,
  Sliders,
  Sparkle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { PRESET_DECISIONS, PresetTemplate } from "./presets";
import {
  AnalysisResponseData,
  ProConItem,
  ComparisonCriterion,
  SWOTItem,
  UserDecision
} from "./types";

export default function App() {
  // Decision lists persisted in LocalStorage
  const [decisions, setDecisions] = useState<UserDecision[]>(() => {
    const saved = localStorage.getItem("sblocca_scelte_decisions");
    return saved ? JSON.parse(saved) : [];
  });

  // UI States
  const [selectedDecisionId, setSelectedDecisionId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [activeTab, setActiveTab] = useState<"pros-cons" | "comparison" | "swot">("pros-cons");

  // Form input states
  const [newTitle, setNewTitle] = useState("");
  const [newContext, setNewContext] = useState("");
  const [optA, setOptA] = useState("Sì, procedere");
  const [optB, setOptB] = useState("No, rinunciare");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // States to add custom Pro/Con during analysis
  const [customText, setCustomText] = useState("");
  const [customType, setCustomType] = useState<"pros" | "cons">("pros");
  const [customWeight, setCustomWeight] = useState(3);

  // Sync with LocalStorage on any change to decisions
  useEffect(() => {
    localStorage.setItem("sblocca_scelte_decisions", JSON.stringify(decisions));
  }, [decisions]);

  // Loading indicator messages
  const loadingMessages = [
    "Sintetizzando il contesto della tua scelta...",
    "Bilanciando le forze economiche e personali...",
    "Costruendo la matrice strategica SWOT...",
    "Definendo i criteri ideali nella tabella comparativa...",
    "Connettendo i neuroni dell'IA di Sblocca-Scelte..."
  ];

  // Cycle loading messages when isLoading is true
  useEffect(() => {
    let interval: any;
    if (isLoading) {
      setLoadingStep(0);
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % loadingMessages.length);
      }, 2500);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  // Retrieve current active decision
  const activeDecision = useMemo(() => {
    return decisions.find((d) => d.id === selectedDecisionId) || null;
  }, [decisions, selectedDecisionId]);

  // Apply a preset template to the form inputs
  const handleApplyPreset = (preset: PresetTemplate) => {
    setNewTitle(preset.title);
    setNewContext(preset.context);
    if (preset.options && preset.options.length >= 2) {
      setOptA(preset.options[0]);
      setOptB(preset.options[1]);
    } else {
      setOptA("Sì, procedere");
      setOptB("No, rinunciare");
    }
    // Scroll smoothly to form
    const element = document.getElementById("decision-form");
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  // Triggers backend call to fetch complex analysis from Gemini
  const handleGenerateAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      setErrorMsg("Per favore, inserisci un titolo per la decisione che devi prendere.");
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);

    const targetOptions = [optA.trim() || "Sì", optB.trim() || "No"];

    try {
      const res = await fetch("/api/analyze-decision", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: newTitle.trim(),
          context: newContext.trim() || undefined,
          options: targetOptions,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Impossibile ottenere l'analisi dall'IA.");
      }

      const data: AnalysisResponseData = await res.json();

      const newDecision: UserDecision = {
        id: "dec_" + Date.now(),
        title: newTitle.trim(),
        context: newContext.trim() || undefined,
        customOptions: targetOptions,
        createdAt: new Date().toLocaleDateString("it-IT", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit"
        }),
        analysis: data
      };

      setDecisions((prev) => [newDecision, ...prev]);
      setSelectedDecisionId(newDecision.id);
      setActiveTab("pros-cons");

      // Reset form states
      setNewTitle("");
      setNewContext("");
      setOptA("Sì, procedere");
      setOptB("No, rinunciare");
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err?.message || "Errore di connessione al server. Verifica che la chiave GEMINI_API_KEY sia configurata.");
    } finally {
      setIsLoading(false);
    }
  };

  // Interactive state helpers for custom calculations
  const handleUpdateItemWeight = (itemText: string, newWeight: number) => {
    if (!selectedDecisionId) return;
    setDecisions((prev) =>
      prev.map((d) => {
        if (d.id !== selectedDecisionId) return d;
        const currentWeights = d.userWeights || {};
        return {
          ...d,
          userWeights: {
            ...currentWeights,
            [itemText]: newWeight
          }
        };
      })
    );
  };

  const handleToggleItemDisabled = (itemText: string) => {
    if (!selectedDecisionId) return;
    setDecisions((prev) =>
      prev.map((d) => {
        if (d.id !== selectedDecisionId) return d;
        const currentDisabled = d.userDisabledItems || {};
        return {
          ...d,
          userDisabledItems: {
            ...currentDisabled,
            [itemText]: !currentDisabled[itemText]
          }
        };
      })
    );
  };

  const handleAddCustomProCon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDecisionId || !customText.trim()) return;

    setDecisions((prev) =>
      prev.map((d) => {
        if (d.id !== selectedDecisionId) return d;
        const currentCustom = d.customProsCons || { pros: [], cons: [] };
        const listToUpdate = customType === "pros" ? "pros" : "cons";

        // Avoid duplication
        const newItem = {
          text: customText.trim(),
          weight: customWeight,
          explanation: "Elemento aggiunto manualmente da te."
        };

        return {
          ...d,
          customProsCons: {
            ...currentCustom,
            [listToUpdate]: [...currentCustom[listToUpdate], newItem]
          }
        };
      })
    );

    // Reset fields
    setCustomText("");
    setCustomWeight(3);
  };

  const handleRemoveCustomProCon = (textToRemove: string, type: "pros" | "cons") => {
    if (!selectedDecisionId) return;
    setDecisions((prev) =>
      prev.map((d) => {
        if (d.id !== selectedDecisionId) return d;
        const currentCustom = d.customProsCons || { pros: [], cons: [] };
        return {
          ...d,
          customProsCons: {
            ...currentCustom,
            [type]: currentCustom[type].filter((item) => item.text !== textToRemove)
          }
        };
      })
    );
  };

  const handleDeleteDecision = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (window.confirm("Sei sicuro di voler eliminare questa decisione dalla cronologia?")) {
      setDecisions((prev) => prev.filter((d) => d.id !== id));
      if (selectedDecisionId === id) {
        setSelectedDecisionId(null);
      }
    }
  };

  const selectedDecision = activeDecision;

  // Reactively compute pros and cons with adjusted sliders and manual items
  const combinedProsAndCons = useMemo(() => {
    if (!selectedDecision || !selectedDecision.analysis) {
      return { pros: [], cons: [], prosTotal: 0, consTotal: 0, netScore: 0, tendency: "" };
    }

    const basePros = selectedDecision.analysis.proAndCons.pros;
    const baseCons = selectedDecision.analysis.proAndCons.cons;
    const userWeights = selectedDecision.userWeights || {};
    const userDisabled = selectedDecision.userDisabledItems || {};
    const customPros = selectedDecision.customProsCons?.pros || [];
    const customCons = selectedDecision.customProsCons?.cons || [];

    // Map base elements
    const processedPros = basePros.map((p, idx) => {
      const finalWeight = userWeights[p.text] !== undefined ? userWeights[p.text] : p.weight;
      const isActive = !userDisabled[p.text];
      return {
        ...p,
        id: `pro_b_${idx}`,
        weight: finalWeight,
        isActive,
        isCustom: false
      };
    });

    // Map custom elements
    const mappedCustomPros = customPros.map((p, idx) => {
      const finalWeight = userWeights[p.text] !== undefined ? userWeights[p.text] : p.weight;
      const isActive = !userDisabled[p.text];
      return {
        ...p,
        category: "Mio Valore",
        id: `pro_c_${idx}`,
        weight: finalWeight,
        isActive,
        isCustom: true
      };
    });

    const allPros = [...processedPros, ...mappedCustomPros];

    const processedCons = baseCons.map((c, idx) => {
      const finalWeight = userWeights[c.text] !== undefined ? userWeights[c.text] : c.weight;
      const isActive = !userDisabled[c.text];
      return {
        ...c,
        id: `con_b_${idx}`,
        weight: finalWeight,
        isActive,
        isCustom: false
      };
    });

    const mappedCustomCons = customCons.map((c, idx) => {
      const finalWeight = userWeights[c.text] !== undefined ? userWeights[c.text] : c.weight;
      const isActive = !userDisabled[c.text];
      return {
        ...c,
        category: "Mio Valore",
        id: `con_c_${idx}`,
        weight: finalWeight,
        isActive,
        isCustom: true
      };
    });

    const allCons = [...processedCons, ...mappedCustomCons];

    // Calculate totals based on active elements
    const prosTotal = allPros.reduce((sum, item) => sum + (item.isActive ? item.weight : 0), 0);
    const consTotal = allCons.reduce((sum, item) => sum + (item.isActive ? item.weight : 0), 0);
    const netScore = prosTotal - consTotal;

    const optNameA = selectedDecision.customOptions?.[0] || "Opzione A";
    const optNameB = selectedDecision.customOptions?.[1] || "Opzione B";

    let tendency = "Perfettamente in equilibrio";
    if (netScore > 0) {
      tendency = `Pende verso: ${optNameA}`;
    } else if (netScore < 0) {
      tendency = `Pende verso: ${optNameB}`;
    }

    return {
      pros: allPros,
      cons: allCons,
      prosTotal,
      consTotal,
      netScore,
      tendency
    };
  }, [selectedDecision]);

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-100 font-sans text-slate-900 overflow-hidden">
      
      {/* Sidebar - consistent with high density theme */}
      <aside className="w-full md:w-72 bg-slate-900 shrink-0 border-r border-slate-800 flex flex-col px-4 text-slate-300">
        <div className="py-5 border-b border-slate-800 flex items-center justify-between">
          <button
            onClick={() => setSelectedDecisionId(null)}
            className="flex items-center gap-2.5 text-left focus:outline-none"
          >
            <div className="w-6.5 h-6.5 bg-indigo-500 rounded-md flex items-center justify-center text-white">
              <Scale className="h-4 w-4" />
            </div>
            <h1 className="text-white text-md font-extrabold tracking-tight">
              Sblocca-scelte
            </h1>
          </button>
          <span className="px-2 py-0.5 bg-slate-800 text-indigo-400 text-[9px] font-bold rounded font-mono select-none">
            AI DECIDE
          </span>
        </div>

        {/* Sidebar Navigation & History */}
        <nav className="flex-1 py-4 space-y-4 overflow-y-auto min-h-0">
          <div>
            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-3 px-2 flex items-center justify-between">
              <span>Decisioni Recenti</span>
              <span className="bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded text-[8px] font-mono">
                {decisions.length}
              </span>
            </p>
            
            <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
              {decisions.map((dec) => {
                const isActive = dec.id === selectedDecisionId;
                return (
                  <div
                    key={dec.id}
                    onClick={() => {
                      setSelectedDecisionId(dec.id);
                      setActiveTab("pros-cons");
                    }}
                    className={`group relative px-3 py-2.5 rounded-lg text-xs font-semibold select-none cursor-pointer transition flex items-center justify-between ${
                      isActive
                        ? "bg-slate-800 text-white"
                        : "text-slate-400 hover:bg-slate-800/50 hover:text-white"
                    }`}
                  >
                    <div className="min-w-0 flex-1 pr-2 space-y-0.5">
                      <span className={`text-[9px] block ${isActive ? "text-indigo-300" : "text-slate-500"} font-mono`}>
                        {dec.createdAt}
                      </span>
                      <p className="truncate font-semibold">{dec.title}</p>
                    </div>
                    <button
                      onClick={(e) => handleDeleteDecision(dec.id, e)}
                      className={`p-1 rounded opacity-0 group-hover:opacity-100 hover:text-rose-400 transition shrink-0 ${
                        isActive ? "text-indigo-300" : "text-slate-500"
                      }`}
                      title="Elimina"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}

              {decisions.length === 0 && (
                <p className="text-[11px] text-slate-600 italic p-3 text-center border border-dashed border-slate-800 rounded-lg">
                  Nessuna scelta salvata.
                </p>
              )}
            </div>
          </div>

          {/* Saggi Widget inside sidebar */}
          <div className="pt-4 border-t border-slate-800">
            <p className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-2 px-2 flex items-center gap-1">
              <LifeBuoy className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
              <span>Consigli Pratici</span>
            </p>
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800/80 space-y-2 text-[10.5px] leading-relaxed text-slate-400">
              <p>• <b>Sottopesa ciò che non conta</b>: Usa gli slider per ridimensionare i timori marginali.</p>
              <p>• <b>SWOT Matrix</b>: Individua i rischi attuali (debolezze) rispetto a quelli futuri (minacce).</p>
            </div>
          </div>
        </nav>

        {/* Sidebar Footer triggers new decision setup */}
        <div className="py-4 border-t border-slate-800">
          <button
            onClick={() => {
              setSelectedDecisionId(null);
              setTimeout(() => {
                const element = document.getElementById("decision-form");
                if (element) element.scrollIntoView({ behavior: "smooth" });
              }, 100);
            }}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-2 px-4 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>+ Nuova Scelta</span>
          </button>
        </div>
      </aside>

      {/* Main Content Workspace viewport */}
      <main className="flex-1 flex flex-col min-w-0 overflow-y-auto bg-slate-100">
        
        {/* Header - sleek & high density */}
        <header className="h-16 shrink-0 bg-white border-b border-slate-200 px-6 md:px-8 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xs shrink-0 select-none">
              {selectedDecision ? "01" : "00"}
            </div>
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide truncate max-w-lg">
              {selectedDecision ? `Analisi: ${selectedDecision.title}` : "AI Decision-Making Hub"}
            </h2>
          </div>
          
          <div className="flex gap-2 shrink-0">
            <span className={`px-2.5 py-1 text-[10px] font-black tracking-wide rounded-full ${selectedDecision ? "bg-green-100 text-green-700" : "bg-indigo-50 text-indigo-700"}`}>
              {selectedDecision ? "AI PRONTA" : "MODULO INPUT"}
            </span>
            <span className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[10px] font-bold rounded-full font-mono">
              ID: #{selectedDecision ? selectedDecision.id.replace("dec_", "").slice(-4) : "NEW"}
            </span>
          </div>
        </header>

        {/* Body Workspace Grid */}
        <div className="flex-1 p-6 space-y-6">
          <AnimatePresence mode="wait">
            {!selectedDecision ? (
              <motion.div
                key="welcome-form"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6 max-w-4xl mx-auto"
              >
                {/* Hero Box inside main header */}
                <div className="bg-slate-900 rounded-xl p-6 text-white relative overflow-hidden shadow-sm">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-2xl" />
                  <div className="relative z-10 space-y-2">
                    <span className="inline-block bg-indigo-600/30 text-indigo-300 text-[9px] font-extrabold uppercase tracking-widest px-2.5 py-1 rounded-full border border-indigo-500/20">
                      SBLOCCARE LE DECISIONI NON È MAI STATO COSÌ SEMPLICE
                    </span>
                    <h2 className="text-xl md:text-2xl font-bold tracking-tight">
                      Trasforma i dubbi in pianificazione logica
                    </h2>
                    <p className="text-slate-300 text-xs md:text-sm leading-relaxed max-w-2xl">
                      L'intelligenza artificiale estrae e ordina per te i pro, contro,SWOT strutturati e genera una matrice di confronto dettagliata in base al tuo contesto d'uso.
                    </p>
                  </div>
                </div>

                {/* Preset templates section */}
                <div className="space-y-3">
                  <h3 className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5 px-0.5">
                    <Sparkle className="h-3.5 w-3.5 text-indigo-500" />
                    Modelli rapidi di esempio da testare
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {PRESET_DECISIONS.map((preset, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleApplyPreset(preset)}
                        className="p-3.5 bg-white border border-slate-200 hover:border-indigo-400 hover:bg-slate-50/50 rounded-xl text-left transition text-xs space-y-1.5 group"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-base">{preset.emoji}</span>
                          <span className="font-extrabold text-slate-800 group-hover:text-indigo-600 transition">
                            {preset.title}
                          </span>
                        </div>
                        <p className="text-slate-500 text-[11px] leading-relaxed line-clamp-2">
                          {preset.context}
                        </p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Main Submit Form */}
                <div id="decision-form" className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
                  <h3 className="text-xs font-black uppercase text-slate-500 tracking-widest flex items-center gap-2 mb-4 border-b border-slate-100 pb-3">
                    <div className="w-1.5 h-3.5 bg-indigo-500 rounded-sm"></div> Inserisci la tua Scelta da Prendere
                  </h3>

                  {errorMsg && (
                    <div className="mb-4 p-3.5 bg-rose-50 border border-rose-100 text-rose-700 text-xs rounded-lg flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 shrink-0 text-rose-500 mt-0.5" />
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <form onSubmit={handleGenerateAnalysis} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1.5 ml-1">
                        Qual è il quesito o la scelta da valutare? <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newTitle}
                        onChange={(e) => setNewTitle(e.target.value)}
                        placeholder="es. Accettare l'offerta alle Canarie, Comprare un SUV ibrido, Cambiare facoltà..."
                        className="w-full bg-slate-50/60 border border-slate-250 rounded-lg py-2.5 px-3.5 text-xs focus:bg-white focus:border-indigo-500 focus:outline-none transition font-medium"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1.5 ml-1">
                        Descrivi la situazione o i vincoli particolari (Opzionale)
                      </label>
                      <textarea
                        value={newContext}
                        onChange={(e) => setNewContext(e.target.value)}
                        placeholder="es. Ci sono di mezzo figli piccoli, un mutuo residuo, ho paura della solitudine, ecc..."
                        rows={3}
                        className="w-full bg-slate-50/60 border border-slate-250 rounded-lg py-2.5 px-3.5 text-xs focus:bg-white focus:border-indigo-500 focus:outline-none transition leading-relaxed resize-none font-medium"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-2.5 ml-1">
                        Definisci i due scenari alternativi
                      </label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <span className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest pl-1 mb-1">
                            Scenario A (Favorito / Innovativo)
                          </span>
                          <input
                            type="text"
                            value={optA}
                            onChange={(e) => setOptA(e.target.value)}
                            placeholder="es. Cambiare lavoro"
                            className="w-full bg-slate-50/60 border border-slate-250 rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-indigo-500 focus:outline-none transition"
                          />
                        </div>
                        <div>
                          <span className="block text-[9px] font-extrabold text-slate-400 uppercase tracking-widest pl-1 mb-1">
                            Scenario B (Conservativo / Status quo)
                          </span>
                          <input
                            type="text"
                            value={optB}
                            onChange={(e) => setOptB(e.target.value)}
                            placeholder="es. Rimanere dove sono"
                            className="w-full bg-slate-50/60 border border-slate-250 rounded-lg py-2 px-3 text-xs focus:bg-white focus:border-indigo-500 focus:outline-none transition"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="pt-2">
                      <button
                        type="submit"
                        disabled={isLoading}
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-lg text-xs tracking-wider uppercase transition-colors shrink-0 flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
                      >
                        <Sparkles className="h-4.5 w-4.5" />
                        <span>Avvia Analisi Decisionale AI</span>
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            ) : (
              // ACTIVE SELECTED DECISION DASHBOARD GRID - HIGH DENSITY
              <motion.div
                key="active-analysis"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
                className="space-y-6 max-w-6xl mx-auto"
              >
                
                {/* 1. Summary / AI Verdict with exact layout pattern from requested theme */}
                <section className="bg-white border border-slate-200 rounded-xl p-4.5 flex flex-col md:flex-row items-stretch shadow-sm gap-4">
                  <div className="flex-1 md:pr-4 md:border-r border-slate-100 flex flex-col justify-center py-1">
                    <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-1 leading-none">
                      Quesito Scelto
                    </p>
                    <p className="text-sm font-bold text-slate-800 mb-2">
                      "{selectedDecision.title}"
                    </p>
                    {selectedDecision.context && (
                      <p className="text-xs text-slate-500 italic max-w-2xl leading-relaxed">
                        Le tue note: "{selectedDecision.context}"
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-3 bg-indigo-50 p-3.5 rounded-lg border border-indigo-100/70 shrink-0">
                    <div className="h-8.5 w-8.5 bg-indigo-600 rounded flex items-center justify-center text-white font-black text-xs italic">
                      AI
                    </div>
                    <div>
                      <p className="text-[10px] text-indigo-400 uppercase font-bold tracking-widest leading-none mb-1">
                        Verdetto Consigliato
                      </p>
                      <p className="text-xs font-bold text-indigo-900 uppercase">
                        {selectedDecision.analysis?.comparisonTable.winner || "Analisi Positiva"}
                      </p>
                    </div>
                  </div>
                </section>

                {/* Real-time Balanced Opinion Indicator Meter built into main workspace */}
                <section className="bg-slate-900 text-white rounded-xl p-4 md:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest">
                      PULSAZIONE DELLE TUE VALUTAZIONI RICALCOLATE
                    </span>
                    <div className="flex items-baseline gap-2 mt-1">
                      <p className="text-sm font-bold text-white uppercase">
                        {combinedProsAndCons.tendency}
                      </p>
                      <p className={`text-xs font-mono font-bold ${combinedProsAndCons.netScore >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                        ({combinedProsAndCons.netScore > 0 ? `+${combinedProsAndCons.netScore}` : combinedProsAndCons.netScore} punti netti)
                      </p>
                    </div>
                  </div>

                  {/* Interactive Score Slider Display */}
                  <div className="w-full md:w-72 space-y-1.5 shrink-0">
                    <div className="flex justify-between text-[9px] font-bold text-slate-400 uppercase tracking-tight">
                      <span>{selectedDecision.customOptions?.[1] || "Opzione B"}</span>
                      <span>{selectedDecision.customOptions?.[0] || "Opzione A"}</span>
                    </div>
                    <div className="h-3 w-full bg-slate-800 rounded-full overflow-hidden relative border border-slate-700">
                      {(() => {
                        const total = (combinedProsAndCons.prosTotal + combinedProsAndCons.consTotal) || 1;
                        const prosPercent = Math.min(100, Math.max(0, (combinedProsAndCons.prosTotal / total) * 100));
                        return (
                          <div
                            style={{ width: `${prosPercent}%` }}
                            className="h-full bg-indigo-500 rounded-r-md transition-all duration-300 float-right"
                          />
                        );
                      })()}
                      <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-slate-650" />
                    </div>
                    <div className="flex justify-between text-[9px] text-slate-400 font-mono">
                      <span>Prudenza: {combinedProsAndCons.consTotal} pt</span>
                      <span>Spinta: {combinedProsAndCons.prosTotal} pt</span>
                    </div>
                  </div>
                </section>

                {/* Integrated general summary card from AI Verdict response */}
                {selectedDecision.analysis?.conclusion.verdict && (
                  <div className="bg-amber-50/60 border border-amber-100 p-4 rounded-xl text-xs text-amber-900 leading-relaxed flex items-start gap-3">
                    <Activity className="h-4.5 w-4.5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <span className="font-extrabold uppercase text-[10px] tracking-wide block">
                        ORIENTAMENTO STRATEGICO DELL'INTELLIGENZA ARTIFICIALE
                      </span>
                      <p className="font-medium text-slate-750">
                        {selectedDecision.analysis.conclusion.verdict}
                      </p>
                      <div className="pt-2 flex items-baseline gap-1 bg-white/50 p-2.5 rounded-lg border border-amber-200/50 w-fit">
                        <span className="font-extrabold text-[9.5px] uppercase text-indigo-700 font-mono">
                          STRATEGIA IMMEDIATA RACCOMANDATA:
                        </span>
                        <span className="font-bold text-slate-850">
                          {selectedDecision.analysis.conclusion.actionableFirstStep}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Dashboard view Switcher Tabbed Menu */}
                <div className="flex border border-slate-200 bg-white rounded-xl p-1 shadow-xs">
                  <button
                    onClick={() => setActiveTab("pros-cons")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                      activeTab === "pros-cons"
                        ? "bg-slate-900 text-white"
                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    <Scale className="h-3.5 w-3.5" />
                    <span>✓✕ PRO & CONTRO ({combinedProsAndCons.pros.length + combinedProsAndCons.cons.length})</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("comparison")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                      activeTab === "comparison"
                        ? "bg-slate-900 text-white"
                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    <Table className="h-3.5 w-3.5" />
                    <span>📊 TABELLE CONFRONTO</span>
                  </button>
                  <button
                    onClick={() => setActiveTab("swot")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                      activeTab === "swot"
                        ? "bg-slate-900 text-white"
                        : "text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    <Flame className="h-3.5 w-3.5" />
                    <span>🔥 ANALISI SWOT RISCHI</span>
                  </button>
                </div>

                {/* Tab content area */}
                <div className="pt-1">
                  <AnimatePresence mode="wait">
                    
                    {/* 1. Pro & Cons Tab View */}
                    {activeTab === "pros-cons" && (
                      <motion.div
                        key="pros-cons-sub"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-6"
                      >
                        {/* Interactive adjustment alert */}
                        <div className="p-3.5 bg-slate-50 border border-slate-250/90 rounded-lg text-slate-600 text-[11px] leading-relaxed flex items-start gap-2 max-w-none">
                          <Sliders className="h-4.5 w-4.5 text-indigo-500 shrink-0 mt-0.5" />
                          <div>
                            <span className="font-extrabold text-slate-800">INTERAZIONE DINAMICA DISPONIBILE:</span> Puoi variare il peso di rilievo (da 1 a 5) trascinando lo slider di ciascun punto. Disabilita un punto deselezionando il checkbox a sinistra se non lo consideri idoneo alla tua situazione. I punteggi cambiano all'istante!
                          </div>
                        </div>

                        {/* Pros and Cons Column Flex Grid */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          
                          {/* Advantages */}
                          <div className="bg-white border border-slate-200 rounded-xl p-4.5 space-y-3.5 shadow-sm">
                            <h3 className="text-[10px] font-black uppercase text-green-700 tracking-widest flex items-center justify-between pb-2 border-b border-green-50">
                              <span>✓ PROS (Vantaggi della Spinta)</span>
                              <span className="bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-bold font-mono text-[9px]">
                                Peso Totale: {combinedProsAndCons.prosTotal} pt
                              </span>
                            </h3>

                            <div className="space-y-2.5">
                              {combinedProsAndCons.pros.map((pro) => (
                                <div
                                  key={pro.id}
                                  className={`p-3 rounded-xl border transition-all ${
                                    pro.isActive
                                      ? "bg-green-50/40 border-green-100 hover:border-green-200"
                                      : "opacity-45 bg-slate-50 border-slate-100"
                                  }`}
                                >
                                  <div className="flex items-start gap-3">
                                    <input
                                      type="checkbox"
                                      checked={pro.isActive}
                                      onChange={() => handleToggleItemDisabled(pro.text)}
                                      className="rounded border-slate-300 text-indigo-600 accent-indigo-600 focus:ring-indigo-500 h-4 w-4 shrink-0 mt-0.5"
                                    />
                                    <div className="flex-1 space-y-1 min-w-0">
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        <h5 className="font-extrabold text-xs text-slate-800 truncate">
                                          {pro.text}
                                        </h5>
                                        <span className="bg-white px-2 py-0.5 text-[8px] font-mono font-bold text-slate-500 rounded border border-slate-150 uppercase tracking-wider">
                                          {pro.category}
                                        </span>
                                      </div>
                                      <p className="text-[11px] text-slate-600 leading-relaxed font-sans">
                                        {pro.explanation}
                                      </p>

                                      {pro.isActive && (
                                        <div className="pt-2 flex items-center gap-3">
                                          <span className="text-[9px] font-bold text-slate-400 uppercase font-mono shrink-0">
                                            Rilevanza: {pro.weight}/5
                                          </span>
                                          <input
                                            type="range"
                                            min="1"
                                            max="5"
                                            value={pro.weight}
                                            onChange={(e) => handleUpdateItemWeight(pro.text, parseInt(e.target.value))}
                                            className="w-full accent-green-600 h-1 bg-slate-200 rounded cursor-pointer"
                                          />
                                        </div>
                                      )}
                                    </div>

                                    {pro.isCustom && (
                                      <button
                                        onClick={() => handleRemoveCustomProCon(pro.text, "pros")}
                                        className="text-slate-300 hover:text-rose-500 p-1 rounded-sm transition"
                                        title="Rimuovi"
                                      >
                                        <X className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}

                              {combinedProsAndCons.pros.length === 0 && (
                                <p className="text-xs text-slate-400 text-center py-6 italic">
                                  Nessun Pro analizzato.
                                </p>
                              )}
                            </div>
                          </div>

                          {/* Disadvantages */}
                          <div className="bg-white border border-slate-200 rounded-xl p-4.5 space-y-3.5 shadow-sm">
                            <h3 className="text-[10px] font-black uppercase text-red-700 tracking-widest flex items-center justify-between pb-2 border-b border-rose-50">
                              <span>✕ CONS (Svantaggi della Scelta)</span>
                              <span className="bg-rose-50 text-red-700 px-2 py-0.5 rounded-full font-bold font-mono text-[9px]">
                                Peso Totale: {combinedProsAndCons.consTotal} pt
                              </span>
                            </h3>

                            <div className="space-y-2.5">
                              {combinedProsAndCons.cons.map((con) => (
                                <div
                                  key={con.id}
                                  className={`p-3 rounded-xl border transition-all ${
                                    con.isActive
                                      ? "bg-rose-50/40 border-rose-100 hover:border-rose-200"
                                      : "opacity-45 bg-slate-50 border-slate-100"
                                  }`}
                                >
                                  <div className="flex items-start gap-3">
                                    <input
                                      type="checkbox"
                                      checked={con.isActive}
                                      onChange={() => handleToggleItemDisabled(con.text)}
                                      className="rounded border-slate-300 text-indigo-600 accent-indigo-600 focus:ring-indigo-500 h-4 w-4 shrink-0 mt-0.5"
                                    />
                                    <div className="flex-1 space-y-1 min-w-0">
                                      <div className="flex flex-wrap items-center gap-1.5">
                                        <h5 className="font-extrabold text-xs text-slate-800 truncate">
                                          {con.text}
                                        </h5>
                                        <span className="bg-white px-2 py-0.5 text-[8px] font-mono font-bold text-slate-500 rounded border border-slate-150 uppercase tracking-wider">
                                          {con.category}
                                        </span>
                                      </div>
                                      <p className="text-[11px] text-slate-600 leading-relaxed font-sans">
                                        {con.explanation}
                                      </p>

                                      {con.isActive && (
                                        <div className="pt-2 flex items-center gap-3">
                                          <span className="text-[9px] font-bold text-slate-400 uppercase font-mono shrink-0">
                                            Rilevanza: {con.weight}/5
                                          </span>
                                          <input
                                            type="range"
                                            min="1"
                                            max="5"
                                            value={con.weight}
                                            onChange={(e) => handleUpdateItemWeight(con.text, parseInt(e.target.value))}
                                            className="w-full accent-rose-600 h-1 bg-slate-200 rounded cursor-pointer"
                                          />
                                        </div>
                                      )}
                                    </div>

                                    {con.isCustom && (
                                      <button
                                        onClick={() => handleRemoveCustomProCon(con.text, "cons")}
                                        className="text-slate-300 hover:text-rose-500 p-1 rounded-sm transition"
                                        title="Rimuovi"
                                      >
                                        <X className="h-3.5 w-3.5" />
                                      </button>
                                    )}
                                  </div>
                                </div>
                              ))}

                              {combinedProsAndCons.cons.length === 0 && (
                                <p className="text-xs text-slate-400 text-center py-6 italic">
                                  Nessun contro analizzato.
                                </p>
                              )}
                            </div>
                          </div>

                        </div>

                        {/* Interactive Manual Form inside View */}
                        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                          <h4 className="text-[10.5px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5 mb-3.5">
                            <PlusCircle className="h-4.5 w-4.5 text-indigo-500" />
                            Aggiungi un parametro personale alla valutazione
                          </h4>

                          <form onSubmit={handleAddCustomProCon} className="flex flex-col md:flex-row items-end gap-3.5">
                            <div className="w-full md:w-36">
                              <label className="block text-[8.5px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                                Tipo Azione
                              </label>
                              <div className="flex border border-slate-200 rounded p-1 bg-slate-50">
                                <button
                                  type="button"
                                  onClick={() => setCustomType("pros")}
                                  className={`flex-1 py-1 text-[10.5px] font-bold rounded transition ${
                                    customType === "pros" ? "bg-white text-green-700 shadow-xs" : "text-slate-500"
                                  }`}
                                >
                                  ✓ Pro
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setCustomType("cons")}
                                  className={`flex-1 py-1 text-[10.5px] font-bold rounded transition ${
                                    customType === "cons" ? "bg-white text-rose-700 shadow-xs" : "text-slate-500"
                                  }`}
                                >
                                  ✕ Contro
                                </button>
                              </div>
                            </div>

                            <div className="flex-1 w-full">
                              <label className="block text-[8.5px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                                Breve dicitura fattore d'impatto
                              </label>
                              <input
                                type="text"
                                value={customText}
                                onChange={(e) => setCustomText(e.target.value)}
                                placeholder="es. Risparmio benzina mensile, Pressione psicologica di Milano..."
                                className="w-full bg-slate-50 border border-slate-250 rounded py-1.5 px-3 text-xs focus:bg-white focus:outline-none focus:border-indigo-500 transition"
                                required
                              />
                            </div>

                            <div className="w-full md:w-28 shrink-0">
                              <label className="block text-[8.5px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                                Peso Rilevante ({customWeight})
                              </label>
                              <div className="py-2.5">
                                <input
                                  type="range"
                                  min="1"
                                  max="5"
                                  value={customWeight}
                                  onChange={(e) => setCustomWeight(parseInt(e.target.value))}
                                  className="w-full accent-indigo-600 h-1 bg-slate-200 rounded cursor-pointer"
                                />
                              </div>
                            </div>

                            <button
                              type="submit"
                              className="w-full md:w-fit px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 rounded text-xs uppercase transition shrink-0 inline-flex items-center justify-center gap-1"
                            >
                              <Plus className="h-4 w-4" />
                              <span>Inserisci</span>
                            </button>
                          </form>
                        </div>

                      </motion.div>
                    )}

                    {/* 2. Qualitative Matrix Tab View */}
                    {activeTab === "comparison" && (
                      <motion.div
                        key="comparison-sub"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-6"
                      >
                        {selectedDecision.analysis?.comparisonTable && (
                          <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                              <h3 className="text-xs font-black uppercase text-slate-500 tracking-wider">
                                BILANCIO ANALITICO COMPARATIVO SCENARI
                              </h3>
                              <span className="bg-indigo-50 text-indigo-700 text-[10px] font-extrabold px-2.5 py-1 rounded">
                                METRICA AI SCENARI • 1-10
                              </span>
                            </div>

                            <div className="overflow-x-auto">
                              <table className="w-full text-xs text-left">
                                <thead className="bg-slate-50 text-[10px] text-slate-400 font-bold uppercase border-b border-slate-100">
                                  <tr>
                                    <th className="p-3.5 font-extrabold">Fattore di Confronto</th>
                                    {selectedDecision.analysis.comparisonTable.options.map((option, idx) => (
                                      <th key={idx} className="p-3.5 font-bold text-center">
                                        Scenario A: <span className="text-slate-900 font-extrabold">{option}</span>
                                      </th>
                                    ))}
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-150">
                                  {selectedDecision.analysis.comparisonTable.criteria.map((crit, cIdx) => (
                                    <tr key={cIdx} className="hover:bg-slate-50/50 transition">
                                      <td className="p-3.5 font-extrabold text-slate-800">
                                        {crit.criterion}
                                      </td>
                                      
                                      {selectedDecision.analysis.comparisonTable.options.map((optName, oIdx) => {
                                        const optScoreObj = crit.optionScores.find(
                                          (os) => os.optionName.toLowerCase() === optName.toLowerCase() || os.optionName === optName
                                        ) || crit.optionScores[oIdx];

                                        const score = optScoreObj?.score || 5;
                                        const comment = optScoreObj?.comment || "";

                                        let scoreColorClass = "text-slate-500 bg-slate-100 border-slate-200";
                                        if (score >= 8) scoreColorClass = "text-emerald-700 bg-emerald-50 border-emerald-100";
                                        else if (score >= 5) scoreColorClass = "text-amber-700 bg-amber-50 border-amber-100";
                                        else scoreColorClass = "text-rose-700 bg-rose-50 border-rose-100";

                                        return (
                                          <td key={oIdx} className="p-3.5 text-center border-l border-slate-100/60 w-[38%]">
                                            <div className="space-y-1.5 max-w-xs mx-auto text-left">
                                              <div className="flex items-center gap-1.5 justify-center md:justify-start">
                                                <span className={`h-6 w-6 flex items-center justify-center rounded-full text-[10.5px] font-black border font-mono ${scoreColorClass}`}>
                                                  {score}
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-mono font-medium">/10</span>
                                              </div>
                                              <p className="text-[11px] text-slate-500 leading-normal pl-0.5">
                                                {comment}
                                              </p>
                                            </div>
                                          </td>
                                        );
                                      })}
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Recommendation Highlight Alert */}
                        {selectedDecision.analysis?.comparisonTable && (
                          <div className="p-5 bg-indigo-50 border border-indigo-100 rounded-xl space-y-2">
                            <h4 className="font-extrabold text-xs text-indigo-900 uppercase tracking-wider flex items-center gap-1.5">
                              👑 VINCITORE AI DELLA TABELLA: {selectedDecision.analysis.comparisonTable.winner}
                            </h4>
                            <p className="text-xs text-slate-650 leading-relaxed font-sans">
                              {selectedDecision.analysis.comparisonTable.justification}
                            </p>
                          </div>
                        )}
                      </motion.div>
                    )}

                    {/* 3. SWOT Matrix Tab View */}
                    {activeTab === "swot" && (
                      <motion.div
                        key="swot-sub"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-6"
                      >
                        {selectedDecision.analysis?.swot && (
                          <div className="space-y-6">
                            
                            {/* SWOT Header description */}
                            <div className="p-4 bg-white border border-slate-200 rounded-xl">
                              <h4 className="text-[11px] font-black uppercase text-slate-500 tracking-wider mb-1">
                                DESCRIZIONE DELLA STRUTTURA SWOT
                              </h4>
                              <p className="text-slate-500 text-xs leading-relaxed">
                                L'analisi SWOT mette in luce aspetti interni di cui hai padronanza e determinazione (Forze e Debolezze) combinati con scenari ambientali esterni futuri (Opportunità e Minacce) legati alla decisione principale.
                              </p>
                            </div>

                            {/* 2x2 grid compliant with high density mockup design */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              
                              {/* Strengths */}
                              <div className="p-4 border border-slate-200 rounded-xl bg-indigo-50/20 space-y-3.5 shadow-xs">
                                <p className="text-[10px] font-black text-indigo-700 uppercase tracking-widest bg-indigo-50/80 px-2 py-0.5 rounded w-fit">
                                  S • STRENGTHS (Punti di forza Interni)
                                </p>
                                <div className="space-y-3">
                                  {selectedDecision.analysis.swot.strengths.map((str, idx) => (
                                    <div key={idx} className="space-y-1">
                                      <h5 className="font-extrabold text-xs text-slate-800 flex items-start gap-1.5">
                                        <span className="text-indigo-600 text-xs mt-0.5">•</span>
                                        {str.text}
                                      </h5>
                                      <p className="text-[11px] text-slate-500 leading-normal pl-3">
                                        {str.description}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Weaknesses */}
                              <div className="p-4 border border-slate-200 rounded-xl bg-orange-50/20 space-y-3.5 shadow-xs">
                                <p className="text-[10px] font-black text-orange-700 uppercase tracking-widest bg-orange-50/80 px-2 py-0.5 rounded w-fit">
                                  W • WEAKNESSES (Debolezze Interne)
                                </p>
                                <div className="space-y-3">
                                  {selectedDecision.analysis.swot.weaknesses.map((wk, idx) => (
                                    <div key={idx} className="space-y-1">
                                      <h5 className="font-extrabold text-xs text-slate-800 flex items-start gap-1.5">
                                        <span className="text-orange-600 text-xs mt-0.5">•</span>
                                        {wk.text}
                                      </h5>
                                      <p className="text-[11px] text-slate-500 leading-normal pl-3">
                                        {wk.description}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Opportunities */}
                              <div className="p-4 border border-slate-200 rounded-xl bg-green-50/20 space-y-3.5 shadow-xs">
                                <p className="text-[10px] font-black text-green-700 uppercase tracking-widest bg-green-50/80 px-2 py-0.5 rounded w-fit">
                                  O • OPPORTUNITIES (Opportunità Esterne)
                                </p>
                                <div className="space-y-3">
                                  {selectedDecision.analysis.swot.opportunities.map((op, idx) => (
                                    <div key={idx} className="space-y-1">
                                      <h5 className="font-extrabold text-xs text-slate-800 flex items-start gap-1.5">
                                        <span className="text-green-650 text-xs mt-0.5">•</span>
                                        {op.text}
                                      </h5>
                                      <p className="text-[11px] text-slate-500 leading-normal pl-3">
                                        {op.description}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Threats */}
                              <div className="p-4 border border-slate-200 rounded-xl bg-purple-50/20 space-y-3.5 shadow-xs">
                                <p className="text-[10px] font-black text-purple-700 uppercase tracking-widest bg-purple-50/80 px-2 py-0.5 rounded w-fit">
                                  T • THREATS (Minacce Esterne)
                                </p>
                                <div className="space-y-3">
                                  {selectedDecision.analysis.swot.threats.map((thr, idx) => (
                                    <div key={idx} className="space-y-1">
                                      <h5 className="font-extrabold text-xs text-slate-800 flex items-start gap-1.5">
                                        <span className="text-purple-600 text-xs mt-0.5">•</span>
                                        {thr.text}
                                      </h5>
                                      <p className="text-[11px] text-slate-500 leading-normal pl-3">
                                        {thr.description}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              </div>

                            </div>

                            {/* Tactical Actions advice */}
                            <div className="p-4.5 bg-slate-50 border border-slate-200 rounded-xl">
                              <h5 className="font-extrabold text-xs text-slate-700 uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
                                <ChevronRight className="h-4.5 w-4.5 text-indigo-600" />
                                CONSIGLIO STRATEGICO TATTICO INTEGRATO
                              </h5>
                              <p className="text-slate-600 text-xs leading-relaxed italic font-medium pl-1">
                                "{selectedDecision.analysis.swot.swotInsight}"
                              </p>
                            </div>

                          </div>
                        )}
                      </motion.div>
                    )}

                  </AnimatePresence>
                </div>

                {/* Tactical Footer control buttons */}
                <div className="bg-white border border-slate-200 p-4.5 rounded-xl flex flex-col sm:flex-row justify-between gap-4">
                  <button
                    onClick={() => {
                      if (confirm("Sei sicuro di voler resettare e inserire un'altra scelta? Questa rimarrà salvata in cronologia.")) {
                        setSelectedDecisionId(null);
                      }
                    }}
                    className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold py-2.5 px-5 rounded-lg text-xs uppercase transition-all flex items-center justify-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Valuta un'altra decisione</span>
                  </button>

                  <button
                    onClick={() => {
                      if (confirm("Vuoi eliminare questa scheda decisione per sempre?")) {
                        setDecisions((prev) => prev.filter((d) => d.id !== selectedDecision.id));
                        setSelectedDecisionId(null);
                      }
                    }}
                    className="border border-rose-200 hover:bg-rose-50 text-rose-600 font-bold py-2.5 px-5 rounded-lg text-xs uppercase transition-all flex items-center justify-center gap-2"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Elimina Scheda</span>
                  </button>
                </div>

              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Minimal High Density Footer */}
        <footer className="mt-auto py-5 border-t border-slate-250 bg-white text-center text-[11px] text-slate-405">
          <p>© {new Date().getFullYear()} Sblocca-scelte AI • Assistente di Calcolo e Consulenza per Decisioni Complesse.</p>
        </footer>

      </main>

      {/* Modern High Density Backdrop Loading Panel */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/90 text-center backdrop-blur-sm select-none"
          >
            <div className="space-y-5 p-6 max-w-sm">
              <div className="relative mx-auto flex h-16 w-16 items-center justify-center">
                <div className="absolute inset-0 rounded-full border-4 border-indigo-500/10" />
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, ease: "linear", duration: 1.1 }}
                  className="absolute inset-0 rounded-full border-4 border-indigo-500 border-t-transparent"
                />
                <Scale className="h-7 w-7 text-indigo-400 animate-pulse" />
              </div>

              <div className="space-y-2">
                <h4 className="font-sans text-sm font-bold text-white tracking-wide uppercase">
                  SBLOCCANDO LE TUE SCELTE CON L'IA...
                </h4>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={loadingStep}
                    initial={{ opacity: 0, y: 3 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -3 }}
                    transition={{ duration: 0.2 }}
                    className="text-xs text-indigo-200/80 italic font-medium leading-relaxed"
                  >
                    {loadingMessages[loadingStep]}
                  </motion.p>
                </AnimatePresence>
              </div>

              <p className="text-[9px] text-slate-500 uppercase tracking-widest leading-none pt-2">
                Sblocca-scelte AI Processor
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
