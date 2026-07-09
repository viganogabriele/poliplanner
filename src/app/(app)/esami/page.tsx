import { getStudyPlan } from "@/lib/piano";
import { getExams } from "@/lib/esami";
import EsamiClient from "@/features/esami/EsamiClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Esami – Lesson Tracker" };

export default function EsamiPage() {
  const piano = getStudyPlan();
  const exams = getExams();
  return <EsamiClient initialExams={exams} piano={piano} />;
}
