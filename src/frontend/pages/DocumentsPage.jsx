import React, { useState } from "react";
import { dataProviderName } from "../../services/dataProvider";
import RemoteDocumentsPage from "./RemoteDocumentsPage";

const storageKey = "gross-lean-montage.matrix-documents.v1";

const initialMatrixLinks = [
  {
    id: "matrix-4-1",
    title: "Шахматка ЖК Матвеевский парк / Корпус 4.1",
    object: "ЖК Матвеевский парк",
    building: "Корпус 4.1",
    owner: "Иван Петров",
    url: "https://disk.yandex.ru/",
  },
  {
    id: "matrix-4-2",
    title: "Шахматка ЖК Матвеевский парк / Корпус 4.2",
    object: "ЖК Матвеевский парк",
    building: "Корпус 4.2",
    owner: "Иван Петров",
    url: "https://disk.yandex.ru/",
  },
  {
    id: "matrix-4-3",
    title: "Шахматка ЖК Матвеевский парк / Корпус 4.3",
    object: "ЖК Матвеевский парк",
    building: "Корпус 4.3",
    owner: "Иван Петров",
    url: "https://disk.yandex.ru/",
  },
];

function loadMatrixLinks() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    const savedItems = Array.isArray(saved) ? saved : [];
    return initialMatrixLinks.map((item) => ({
      ...item,
      ...(savedItems.find((savedItem) => savedItem.id === item.id) ?? {}),
    }));
  } catch {
    return initialMatrixLinks;
  }
}

export function LocalDocumentsPage() {
  const [documents, setDocuments] = useState(loadMatrixLinks);

  const updateLink = (id, url) => {
    const next = documents.map((item) => item.id === id ? { ...item, url } : item);
    setDocuments(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  };

  return (
    <section className="documents-page">
      <div className="documents-hero">
        <div>
          <span>Документы объекта</span>
          <h2>Шахматки на Яндекс.Диске</h2>
          <p>В demo-режиме рабочие шахматки ведутся во внешних файлах. В системе оставлены быстрые ссылки по корпусам.</p>
        </div>
      </div>
      <div className="documents-grid">
        {documents.map((item) => (
          <article className="document-card" key={item.id}>
            <div className="document-icon">Г</div>
            <div className="document-card-body">
              <h3>{item.title}</h3>
              <dl>
                <div><dt>Объект</dt><dd>{item.object}</dd></div>
                <div><dt>Корпус</dt><dd>{item.building}</dd></div>
                <div><dt>Ответственный</dt><dd>{item.owner}</dd></div>
              </dl>
              <label className="document-url-field">Ссылка на шахматку<input type="url" value={item.url} onChange={(event) => updateLink(item.id, event.target.value)} placeholder="https://disk.yandex.ru/..." /></label>
              <a className="primary-button document-link" href={item.url || "https://disk.yandex.ru/"} target="_blank" rel="noreferrer">
                Открыть шахматку
              </a>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function DocumentsPage(props) {
  return dataProviderName === "supabase" ? <RemoteDocumentsPage {...props} /> : <LocalDocumentsPage />;
}
