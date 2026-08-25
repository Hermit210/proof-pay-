import { useEffect } from "react";
import { Alert, Button, Card, Spinner } from "../../components/ui";
import { useRegister, type RegisterStage } from "./useRegister";
import type { AppEnv } from "../../services/env";

const STAGE_LABEL: Record<RegisterStage, string> = {
  idle: "",
  checking: "Checking registration status...",
  deriving_keys: "Deriving your keys locally...",
  generating_proof: "Generating proof locally -- this takes a few seconds and never leaves your browser...",
  submitting: "Submitting to the network...",
  confirming: "Confirming on-chain -- this is a real independent check, not just waiting for submission to ack...",
  done: "Registered!",
  error: "",
};

export function Register({
  env,
  address,
  onRegistered,
}: {
  env: AppEnv;
  address: string;
  onRegistered: () => void;
}) {
  const { stage, error, isRegistered, checkRegistration, register } = useRegister(env, address);

  useEffect(() => {
    checkRegistration();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [address]);

  useEffect(() => {
    if (stage === "done" || isRegistered) onRegistered();
  }, [stage, isRegistered, onRegistered]);

  if (isRegistered === null) {
    return <Spinner label="Checking your confidential account..." />;
  }

  if (isRegistered) {
    return <Alert kind="success">Confidential account registered.</Alert>;
  }

  const busy = stage !== "idle" && stage !== "error" && stage !== "done";

  return (
    <Card title="Set up your confidential account">
      <p>
        This creates your private spending/viewing keys and registers them on-chain -- a
        one-time step, done entirely in your browser.
      </p>
      {busy ? (
        <Spinner label={STAGE_LABEL[stage]} />
      ) : (
        <Button onClick={register}>Register</Button>
      )}
      {error && <Alert kind="error">{error}</Alert>}
    </Card>
  );
}
