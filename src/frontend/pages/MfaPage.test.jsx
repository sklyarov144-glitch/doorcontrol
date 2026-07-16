import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import MfaPage from "./MfaPage";

describe("MfaPage", () => {
  it("challenges an enrolled privileged user and completes the gate", async () => {
    const auth = {
      getMfaStatus: vi.fn()
        .mockResolvedValueOnce({ currentLevel: "aal1", verifiedFactorId: "factor-1" })
        .mockResolvedValueOnce({ currentLevel: "aal2", verifiedFactorId: "factor-1" }),
      verifyMfa: vi.fn().mockResolvedValue({}),
      startMfaEnrollment: vi.fn(),
      disableMfa: vi.fn(),
    };
    const onVerified = vi.fn();
    render(<MfaPage auth={auth} profile={{ position: "Руководитель" }} gate onVerified={onVerified} onCancel={vi.fn()} />);

    const input = await screen.findByLabelText("Одноразовый код");
    fireEvent.change(input, { target: { value: "123456" } });
    fireEvent.click(screen.getByRole("button", { name: "Подтвердить" }));

    await waitFor(() => expect(auth.verifyMfa).toHaveBeenCalledWith("factor-1", "123456"));
    await waitFor(() => expect(onVerified).toHaveBeenCalled());
  });

  it("starts TOTP enrollment when no verified factor exists", async () => {
    const auth = {
      getMfaStatus: vi.fn().mockResolvedValue({ currentLevel: "aal1", verifiedFactorId: null }),
      startMfaEnrollment: vi.fn().mockResolvedValue({
        factorId: "factor-2",
        qrCode: "data:image/svg+xml;base64,PHN2Zy8+",
        secret: "ABCDEF234567",
      }),
      verifyMfa: vi.fn(),
      disableMfa: vi.fn(),
    };
    render(<MfaPage auth={auth} profile={{ position: "Директор" }} />);

    fireEvent.click(await screen.findByRole("button", { name: "Подключить приложение" }));
    expect(await screen.findByAltText("QR-код для приложения-аутентификатора")).toBeInTheDocument();
    expect(screen.getByText("ABCDEF234567")).toBeInTheDocument();
  });
});
