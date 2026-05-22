import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dns from "dns";

// Support Node.js DNS resolving correctly
dns.setDefaultResultOrder("ipv4first");

const app = express();
const PORT = 3000;

app.use(express.json());

// Lazy-initialized Gemini Client helper
let aiClient: GoogleGenAI | null = null;
function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      throw new Error("GEMINI_API_KEY environment variable is required. Please set it via Settings > Secrets.");
    }
    aiClient = new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

// REST Endpoint to perform decision analysis using Gemini 3.5 Flash
app.post("/api/analyze-decision", async (req, res) => {
  try {
    const { title, context, options } = req.body;

    if (!title || typeof title !== "string" || title.trim() === "") {
      res.status(400).json({ error: "La decisione da analizzare è obbligatoria." });
      return;
    }

    const ai = getGeminiClient();

    // Setup input options
    const resolvedOptions = options && Array.isArray(options) && options.filter(o => typeof o === 'string' && o.trim() !== '').length >= 2
      ? options.filter(o => o.trim() !== '')
      : ["Sì, procedere", "No, rinunciare"];

    const promptMessage = `
Devo prendere questa decisione: "${title}"
${context ? `Ecco del contesto utile aggiuntivo: "${context}"` : ""}
Le opzioni che sto considerando sono: ${resolvedOptions.map(o => `"${o}"`).join(", ")}

Analizza questa decisione in modo altamente logico, equilibrato e costruttivo.
Restituisci l'output rigorosamente in formato JSON conformandoti allo schema richiesto.
Usa l'italiano come lingua d'elezione per tutti i testi di output, con un tono empatico, professionale e incoraggiante.
`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: promptMessage,
      config: {
        systemInstruction: `Sei un assistente per le decisioni altamente competente, empatico e razionale di nome Sblocca-scelte. Aiuti l'utente a guardare le proprie scelte da più punti di vista (Pro/Contro, SWOT, Confronto Tabelle). Tutte le analisi, spiegazioni e considerazioni devono essere scritte in italiano. Evita banalità ed offri spunti decisionali concreti e realistici.`,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            proAndCons: {
              type: Type.OBJECT,
              properties: {
                pros: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      text: { type: Type.STRING, description: "Titolo sintetico del Pro (es. Maggiore indipendenza, Risparmio economico, ecc.)" },
                      category: { type: Type.STRING, description: "Sotto-categoria es. Economico, Mentale, Carriera, Salute, Relazioni" },
                      weight: { type: Type.INTEGER, description: "Suggerisci un peso da 1 a 5 in termini di importanza generica" },
                      explanation: { type: Type.STRING, description: "Breve frase sul perché questo elemento è positivo" }
                    },
                    required: ["text", "category", "weight", "explanation"]
                  }
                },
                cons: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      text: { type: Type.STRING, description: "Titolo sintetico del Contro (es. Costo iniziale alto, Stress aggiuntivo, ecc.)" },
                      category: { type: Type.STRING, description: "Sotto-categoria es. Economico, Mentale, Carriera, Salute, Relazioni" },
                      weight: { type: Type.INTEGER, description: "Suggerisci un peso da 1 a 5 in termini di importanza/sforzo" },
                      explanation: { type: Type.STRING, description: "Breve spiegazione del perché questo elemento è negativo" }
                    },
                    required: ["text", "category", "weight", "explanation"]
                  }
                },
                summary: { type: Type.STRING, description: "Un breve bilancio conclusivo sulla dinamica Pro e Contro (1-2 frasi)" }
              },
              required: ["pros", "cons", "summary"]
            },
            comparisonTable: {
              type: Type.OBJECT,
              properties: {
                options: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Lista corrispondente esattamente ed esclusivamente alle opzioni messe a confronto"
                },
                criteria: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      criterion: { type: Type.STRING, description: "Nome del criterio es. Costo Finanziario, Tempo Libero, Allineamento Valori, Crescita Personale, Comodità" },
                      optionScores: {
                        type: Type.ARRAY,
                        items: {
                          type: Type.OBJECT,
                          properties: {
                            optionName: { type: Type.STRING },
                            score: { type: Type.INTEGER, description: "Punteggio da 1 a 10 per l'opzione" },
                            comment: { type: Type.STRING, description: "Commento esplicativo sul punteggio" }
                          },
                          required: ["optionName", "score", "comment"]
                        }
                      }
                    },
                    required: ["criterion", "optionScores"]
                  }
                },
                winner: { type: Type.STRING, description: "L'opzione che appare favorita dall'analisi complessiva dei punteggi" },
                justification: { type: Type.STRING, description: "Sintesi di 1-2 frasi spiegando perché vince tale opzione" }
              },
              required: ["options", "criteria", "winner", "justification"]
            },
            swot: {
              type: Type.OBJECT,
              properties: {
                strengths: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      text: { type: Type.STRING, description: "Punto di forza interno, se si sceglie l'opzione principale" },
                      description: { type: Type.STRING, description: "Perché è un punto di forza" }
                    },
                    required: ["text", "description"]
                  }
                },
                weaknesses: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      text: { type: Type.STRING, description: "Punto di debolezza interno o svantaggio intrinseco" },
                      description: { type: Type.STRING, description: "Perché costituisce una debolezza" }
                    },
                    required: ["text", "description"]
                  }
                },
                opportunities: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      text: { type: Type.STRING, description: "Opportunità esterna o risvolto positivo futuro" },
                      description: { type: Type.STRING, description: "Spiegazione sul perché apre nuove porte" }
                    },
                    required: ["text", "description"]
                  }
                },
                threats: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      text: { type: Type.STRING, description: "Minaccia esterna, potenziale rischio o inconveniente futuro" },
                      description: { type: Type.STRING, description: "Spiegazione sul perché rappresenta un pericolo" }
                    },
                    required: ["text", "description"]
                  }
                },
                swotInsight: { type: Type.STRING, description: "Un piccolo spunto d'azione strategica sul come massimizzare le forze e contenere le minacce." }
              },
              required: ["strengths", "weaknesses", "opportunities", "threats", "swotInsight"]
            },
            conclusion: {
              type: Type.OBJECT,
              properties: {
                verdict: { type: Type.STRING, description: "Messaggio finale equilibrato e saggio di orientamento decisionale (3-4 frasi)" },
                actionableFirstStep: { type: Type.STRING, description: "Un primissimo piccolissimo passo concreto, es. 'Fai una ricerca di 15 minuti su X' o 'Fissa un mini colloquio con Y'." }
              },
              required: ["verdict", "actionableFirstStep"]
            }
          },
          required: ["proAndCons", "comparisonTable", "swot", "conclusion"]
        }
      }
    });

    const parsedData = JSON.parse(response.text || "{}");
    res.json(parsedData);
  } catch (error: any) {
    console.error("Gemini decision analysis error:", error);
    res.status(500).json({
      error: error?.message || "Errore sconosciuto nella generazione dell'analisi. Riprova più tardi."
    });
  }
});

// Configure Vite middleware or static delivery
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server Sblocca-scelte] Running at http://localhost:${PORT}`);
  });
}

startServer();
