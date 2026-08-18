"use client";

import dynamic from "next/dynamic";

/**
 * Registro dei pannelli caricati su richiesta.
 *
 * Il primo caricamento di /piano deve contenere soltanto la testata, le azioni richieste, il piano
 * proposto e il pannello laterale. Tutto il resto — simulatore, catalogo, guida, storico, dettaglio
 * completo delle regole, anteprima degli anni successivi — arriva solo quando l'utente lo apre.
 *
 * `ssr: false` è corretto per tutti: sono pannelli interattivi che nascono chiusi, quindi
 * pre-renderizzarli lato server aggiungerebbe HTML che nessuno vede.
 */

const loading = () => null;

export const LazySimulatorPanel = dynamic(() => import("./SimulatorPanel"), { ssr: false, loading });
export const LazyAddCourseModal = dynamic(() => import("./AddCourseModal"), { ssr: false, loading });
export const LazyPlanGuide = dynamic(() => import("./PlanGuide"), { ssr: false, loading });
export const LazyCareerPanel = dynamic(() => import("./CareerPanel"), { ssr: false, loading });
export const LazyScenarioHistoryPanel = dynamic(() => import("./ScenarioHistoryPanel"), { ssr: false, loading });
export const LazyAllRulesPanel = dynamic(() => import("./AllRulesPanel"), { ssr: false, loading });
export const LazyFutureYearsPanel = dynamic(() => import("./FutureYearsPanel"), { ssr: false, loading });
