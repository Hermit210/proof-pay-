import { Routes, Route } from "react-router-dom";
import { RootLayout } from "./layouts/RootLayout";
import { WalletProvider } from "./context/WalletContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import About from "./pages/About";
import History from "./pages/History";
import type { AppEnv } from "./services/env";

export default function App({ env }: { env: AppEnv }) {
  return (
    <WalletProvider env={env}>
      <Routes>
        <Route element={<RootLayout />}>
          <Route path="/" element={<Home env={env} />} />
          <Route path="/dashboard" element={<Dashboard env={env} />} />
          <Route path="/about" element={<About />} />
          <Route path="/history" element={<History />} />
        </Route>
      </Routes>
    </WalletProvider>
  );
}
