import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { ConfigCheck } from "./components/ConfigCheck";
import { initAnalytics } from "./services/analytics";

function Root() {
  return (
    <ConfigCheck>
      {(env) => {
        initAnalytics(env);
        return <App env={env} />;
      }}
    </ConfigCheck>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <Root />
    </ErrorBoundary>
  </StrictMode>,
);
