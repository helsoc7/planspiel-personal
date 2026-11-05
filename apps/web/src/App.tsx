import { Navigate, Route, Routes } from "react-router-dom";
import { Laden } from "./components/ui";
import { useSession } from "./lib/session";
import { Anmelden } from "./pages/Anmelden";
import { KursAnlegen } from "./pages/KursAnlegen";
import { KursListe } from "./pages/KursListe";
import { KursSeite } from "./pages/KursSeite";
import { PasswortAendern } from "./pages/PasswortAendern";

export function App() {
  const { ich, laedt } = useSession();
  if (laedt) return <Laden />;
  if (!ich) return <Anmelden />;
  if (ich.passwortAendern) return <PasswortAendern />;
  return (
    <Routes>
      <Route path="/" element={<KursListe />} />
      <Route path="/kurse/neu" element={ich?.istAdmin ? <KursAnlegen /> : <Navigate to="/" replace />} />
      <Route path="/kurse/:id" element={<KursSeite />} />
      <Route path="/passwort" element={<PasswortAendern />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
