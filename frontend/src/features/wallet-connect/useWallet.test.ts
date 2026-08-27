import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useWallet } from "./useWallet";
import * as walletService from "../../services/wallet";
import type { AppEnv } from "../../services/env";

vi.mock("../../services/wallet", () => {
  class FreighterNotInstalledError extends Error {}
  class WrongNetworkError extends Error {
    constructor(connectedTo: string, expected: string) {
      super(`Freighter is connected to "${connectedTo}", but ProofPay needs "${expected}".`);
    }
  }
  return {
    FreighterNotInstalledError,
    WrongNetworkError,
    checkFreighterAvailable: vi.fn(),
    connectWallet: vi.fn(),
    assertNetwork: vi.fn(),
    getConnectedAddress: vi.fn(),
  };
});
vi.mock("../../services/analytics", () => ({ track: vi.fn(), reportError: vi.fn() }));

const ENV = { networkPassphrase: "Test SDF Network ; September 2015" } as AppEnv;
const ADDR = "GBEJY33A5YK22SOU5YACPFXM45UEJ5G27VIDNNLEPUXTKIQBKY4WJEZS";

async function mountIdle() {
  vi.mocked(walletService.checkFreighterAvailable).mockResolvedValue(true);
  vi.mocked(walletService.getConnectedAddress).mockResolvedValue(null);
  const rendered = renderHook(() => useWallet(ENV));
  await act(async () => {});
  return rendered;
}

describe("useWallet connect error states", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.mocked(walletService.connectWallet).mockReset();
    vi.mocked(walletService.assertNetwork).mockReset();
  });

  it("surfaces 'not installed' as a distinct, handleable state -- not a raw rejection", async () => {
    const { result } = await mountIdle();
    vi.mocked(walletService.connectWallet).mockRejectedValue(new walletService.FreighterNotInstalledError());

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.status).toBe("error");
    expect(result.current.freighterAvailable).toBe(false);
    expect(result.current.address).toBeNull();
  });

  it("rejects a wrong-network connection and never sets an address", async () => {
    const { result } = await mountIdle();
    vi.mocked(walletService.connectWallet).mockResolvedValue(ADDR);
    vi.mocked(walletService.assertNetwork).mockRejectedValue(
      new walletService.WrongNetworkError("PUBLIC", ENV.networkPassphrase),
    );

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.status).toBe("error");
    expect(result.current.address).toBeNull();
    expect(result.current.error).toMatch(/ProofPay needs/);
  });

  it("surfaces a generic rejection (e.g. user declined the request) as an error state", async () => {
    const { result } = await mountIdle();
    vi.mocked(walletService.connectWallet).mockRejectedValue(new Error("User declined access"));

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.status).toBe("error");
    expect(result.current.error).toBe("User declined access");
    // A generic error must not be misclassified as "extension not installed".
    expect(result.current.freighterAvailable).toBe(true);
  });

  it("reaches a real connected state on success", async () => {
    const { result } = await mountIdle();
    vi.mocked(walletService.connectWallet).mockResolvedValue(ADDR);
    vi.mocked(walletService.assertNetwork).mockResolvedValue(undefined);

    await act(async () => {
      await result.current.connect();
    });

    expect(result.current.status).toBe("connected");
    expect(result.current.address).toBe(ADDR);
    expect(result.current.error).toBeNull();
  });

  it("disconnect clears address and resets to idle", async () => {
    const { result } = await mountIdle();
    vi.mocked(walletService.connectWallet).mockResolvedValue(ADDR);
    vi.mocked(walletService.assertNetwork).mockResolvedValue(undefined);
    await act(async () => {
      await result.current.connect();
    });

    act(() => {
      result.current.disconnect();
    });

    expect(result.current.address).toBeNull();
    expect(result.current.status).toBe("idle");
  });
});
