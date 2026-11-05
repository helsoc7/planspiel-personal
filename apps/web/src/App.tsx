import { Navigate, Route, Routes } from "react-router-dom";
import { Laden } from "./components/ui";
import { useSession } from "./lib/session";
import { Anmelden } from "./pages/Anmelden";
import { KursAnlegen } from "./pages/KursAnlegen";
import { KursListe } from "./pages/KursListe";
import { KursSeite } from "./pages/KursSeite";

export function App() {
  const { ich, laedt } = useSession();
  if (laedt) return <Laden />;
  if (!ich) return <Anmelden />;
  return (
    <Routes>
      <Route path="/" element={<KursListe />} />
      <Route path="/kurse/neu" element={<KursAnlegen />} />
      <Route path="/kurse/:id" element={<KursSeite />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
