import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import { LocalDocumentsPage } from "./DocumentsPage";

const storageKey = "gross-lean-montage.matrix-documents.v1";

describe("LocalDocumentsPage", () => {
  beforeEach(() => localStorage.clear());

  it("keeps editable matrix links isolated in demo storage", () => {
    render(<LocalDocumentsPage />);

    const inputs = screen.getAllByLabelText("Ссылка на шахматку");
    fireEvent.change(inputs[0], { target: { value: "https://disk.yandex.ru/d/pilot-4-1" } });

    const stored = JSON.parse(localStorage.getItem(storageKey));
    expect(stored[0]).toMatchObject({
      id: "matrix-4-1",
      url: "https://disk.yandex.ru/d/pilot-4-1",
    });
    expect(screen.getAllByRole("link", { name: "Открыть шахматку" })[0]).toHaveAttribute(
      "href",
      "https://disk.yandex.ru/d/pilot-4-1",
    );
  });

  it("restores previously saved links", () => {
    localStorage.setItem(storageKey, JSON.stringify([
      { id: "matrix-4-2", url: "https://disk.yandex.ru/d/restored" },
    ]));

    render(<LocalDocumentsPage />);

    expect(screen.getAllByLabelText("Ссылка на шахматку")[1]).toHaveValue("https://disk.yandex.ru/d/restored");
  });
});
