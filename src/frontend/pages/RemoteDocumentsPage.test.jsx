import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import RemoteDocumentsPage from "./RemoteDocumentsPage";

const object = {
  id: "object-1",
  name: "ЖК Матвеевский парк",
  buildings: [{ id: "building-1", name: "Корпус 4.1" }],
};
const user = { id: "user-1", companyId: "company-1" };

function createProvider(initial = []) {
  const rows = [...initial];
  return {
    rows,
    documents: {
      getAll: vi.fn(async () => [...rows]),
      create: vi.fn(async (document) => {
        const stored = { id: `document-${rows.length + 1}`, ...document };
        rows.push(stored);
        return stored;
      }),
    },
  };
}

describe("RemoteDocumentsPage", () => {
  afterEach(() => vi.restoreAllMocks());

  it("loads and creates document links through the remote provider", async () => {
    const provider = createProvider();
    render(<RemoteDocumentsPage objects={[object]} user={user} provider={provider} />);

    expect(await screen.findByText("Документы пока не добавлены.")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Название"), { target: { value: "Шахматка корпуса 4.1" } });
    fireEvent.change(screen.getByLabelText("Категория"), { target: { value: "matrix" } });
    fireEvent.change(screen.getByLabelText("Ссылка"), { target: { value: "https://disk.yandex.ru/d/matrix-4-1" } });
    fireEvent.click(screen.getByRole("button", { name: "Добавить документ" }));

    await waitFor(() => expect(provider.documents.create).toHaveBeenCalledWith(expect.objectContaining({
      companyId: "company-1",
      objectId: "object-1",
      buildingId: "building-1",
      title: "Шахматка корпуса 4.1",
      category: "matrix",
      url: "https://disk.yandex.ru/d/matrix-4-1",
      createdBy: "user-1",
    })));
    expect(await screen.findByText("Шахматка корпуса 4.1")).toBeInTheDocument();
  });

  it("opens a stored object through a short-lived signed URL", async () => {
    const provider = createProvider([{
      id: "document-1",
      objectId: "object-1",
      buildingId: "building-1",
      title: "Акт ОХ",
      category: "custody_act",
      url: "storage://documents/company-1/object-1/act.pdf",
    }]);
    const files = { createSignedUrl: vi.fn(async () => "https://storage.example.test/signed-act") };
    const open = vi.spyOn(window, "open").mockImplementation(() => null);

    render(<RemoteDocumentsPage objects={[object]} user={user} provider={provider} files={files} />);
    fireEvent.click(await screen.findByRole("button", { name: "Открыть документ" }));

    await waitFor(() => expect(files.createSignedUrl).toHaveBeenCalledWith(
      "documents",
      "company-1/object-1/act.pdf",
    ));
    expect(open).toHaveBeenCalledWith("https://storage.example.test/signed-act", "_blank", "noopener,noreferrer");
  });

  it("uploads a building document into the selected domain scope", async () => {
    const provider = createProvider();
    const uploaded = {
      bucket: "documents",
      path: "company-1/object-1/building-1/_/_/document.pdf",
      uri: "storage://documents/company-1/object-1/building-1/_/_/document.pdf",
    };
    const files = {
      uploadDocument: vi.fn(async () => uploaded),
      remove: vi.fn(async () => undefined),
    };
    render(<RemoteDocumentsPage objects={[object]} user={user} provider={provider} files={files} />);

    await screen.findByText("Документы пока не добавлены.");
    const file = new File(["document"], "document.pdf", { type: "application/pdf" });
    fireEvent.change(screen.getByLabelText("Или загрузить файл"), { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: "Добавить документ" }));

    await waitFor(() => expect(files.uploadDocument).toHaveBeenCalledWith({
      companyId: "company-1",
      objectId: "object-1",
      buildingId: "building-1",
    }, file));
    expect(provider.documents.create).toHaveBeenCalledWith(expect.objectContaining({
      buildingId: "building-1",
      url: uploaded.uri,
    }));
  });
});
