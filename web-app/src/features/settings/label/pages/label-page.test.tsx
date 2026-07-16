/*
 * Licensed to the Apache Software Foundation (ASF) under one or more
 * contributor license agreements. See the NOTICE file distributed with
 * this work for additional information regarding copyright ownership.
 * The ASF licenses this file to You under the Apache License, Version 2.0
 * (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { App } from "antd";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { I18nextProvider } from "react-i18next";
import { MemoryRouter, useLocation, useNavigate } from "react-router-dom";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { i18n, initializeI18n, loadLocale } from "@/core/i18n/i18n";

const { deleteLabel, loadLabels, saveLabel } = vi.hoisted(() => ({
  deleteLabel: vi.fn(),
  loadLabels: vi.fn(),
  saveLabel: vi.fn(),
}));
vi.mock('../api/label-api', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../api/label-api')>()),
  deleteLabel,
  loadLabels,
  saveLabel,
}));
import { LabelPage } from "./label-page";

describe("LabelPage", () => {
  beforeAll(async () => {
    Object.defineProperty(globalThis, "ResizeObserver", { value: ResizeObserverStub, configurable: true });
    await initializeI18n();
    await loadLocale("en-US");
  });
  beforeEach(() => {
    loadLabels.mockResolvedValue({
      content: [
        {
          id: 7,
          name: "env",
          tagValue: "prod",
          description: "Production",
          type: 1,
        },
      ],
      totalElements: 1,
    });
    saveLabel.mockResolvedValue(undefined);
    deleteLabel.mockResolvedValue(undefined);
  });
  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("renders a flat result table and creates a user label", async () => {
    renderLabelPage();
    expect(await screen.findByText("env:prod")).toBeInTheDocument();
    expect(screen.getByText("Production")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "New label" }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Name"), { target: { value: " team " } });
    fireEvent.change(within(dialog).getByLabelText("Value"), { target: { value: " platform " } });
    fireEvent.click(within(dialog).getByRole("button", { name: "OK" }));
    await waitFor(() =>
      expect(saveLabel.mock.calls[0]?.[0]).toEqual({
        name: " team ",
        tagValue: " platform ",
      }),
    );
    expect(saveLabel.mock.calls[0]?.[1]).toBe(true);
  });

  it("hands the selected label to the Monitor list query context", async () => {
    renderLabelPage();

    fireEvent.click(await screen.findByRole("button", { name: "env:prod" }));

    expect(screen.getByTestId("location")).toHaveTextContent("/monitors|env:prod");
  });

  it("synchronizes the search draft when Back and Forward restore URL state", async () => {
    renderLabelPage('/settings/labels?pageIndex=2&pageSize=50&search=env');
    const search = await screen.findByPlaceholderText('Search labels');
    expect(search).toHaveValue('env');

    fireEvent.change(search, { target: { value: 'production' } });
    fireEvent.click(screen.getByRole('button', { name: 'Query' }));
    await waitFor(() => expect(screen.getByTestId('route')).toHaveTextContent(
      '/settings/labels?pageIndex=0&pageSize=50&search=production'
    ));

    fireEvent.click(screen.getByRole('button', { name: 'History back' }));
    await waitFor(() => expect(search).toHaveValue('env'));
    fireEvent.click(screen.getByRole('button', { name: 'History forward' }));
    await waitFor(() => expect(search).toHaveValue('production'));
  });
});

function renderLabelPage(initialEntry = '/settings/labels') {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  return render(
    <I18nextProvider i18n={i18n}>
      <QueryClientProvider client={client}>
        <MemoryRouter initialEntries={[initialEntry]}>
          <App>
            <LabelPage />
            <LocationProbe />
          </App>
        </MemoryRouter>
      </QueryClientProvider>
    </I18nextProvider>,
  );
}

function LocationProbe() {
  const location = useLocation();
  const navigate = useNavigate();
  const label = new URLSearchParams(location.search).get("labels") ?? "";
  return (
    <>
      <output data-testid="location">{`${location.pathname}|${label}`}</output>
      <output data-testid="route">{`${location.pathname}${location.search}`}</output>
      <button type="button" onClick={() => void navigate(-1)}>History back</button>
      <button type="button" onClick={() => void navigate(1)}>History forward</button>
    </>
  );
}

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
