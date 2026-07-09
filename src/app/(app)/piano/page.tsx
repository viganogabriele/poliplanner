import { getStudyPlan, getTrack, buildDefaultPiano } from "@/lib/piano";
import PianoClient from "@/features/piano/PianoClient";

export const dynamic = "force-dynamic";
export const metadata = { title: "Piano di Studi – Lesson Tracker" };

export default function PianoPage() {
  const track = getTrack();
  const rawPiano = getStudyPlan();

  const piano =
    rawPiano[1].courses.length === 0 &&
    rawPiano[2].courses.length === 0 &&
    rawPiano[3].courses.length === 0
      ? buildDefaultPiano(track)
      : rawPiano;

  return <PianoClient initialPiano={piano} initialTrack={track} />;
}
