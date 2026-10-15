// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { LocaleProvider } from "../src/components/locale";
import { TooltipProvider } from "../src/components/ui/tooltip";

vi.mock("next/navigation", () => ({
  usePathname: () => "/settings",
  useRouter: () => ({ replace: vi.fn(), push: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/lib/use-api", () => ({
  useApi: () => ({ data: null, error: null, loading: false, refresh: () => {} }),
  postJson: () => Promise.resolve({}),
}));

const { default: SettingsPage } = await import("../src/app/settings/page");

let container: HTMLDivElement;
let root: Root;

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  document.documentElement.lang = "en";
  localStorage.clear();
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
});

const renderSettings = () =>
  act(async () => {
    root.render(
      createElement(
        TooltipProvider,
        null,
        createElement(LocaleProvider, null, createElement(SettingsPage)),
      ),
    );
  });

it("shows the Chinese switch in Settings → General and applies it there", async () => {
  await renderSettings();
  const general = container.querySelector<HTMLElement>('[data-settings-section="general"]');
  expect(general).not.toBeNull();
  expect(general?.hasAttribute("hidden")).toBe(false);
  expect(general?.textContent).toContain("Language");
  expect(general?.textContent).toContain("中文");
  expect(general?.textContent).toContain("Timezones");

  const chinese = [...(general?.querySelectorAll("button") ?? [])].find((button) =>
    button.textContent?.includes("中文"),
  );
  expect(chinese).toBeTruthy();
  await act(async () => {
    chinese?.click();
  });

  expect(document.documentElement.lang).toBe("zh-CN");
  expect(localStorage.getItem("journal-locale-v1")).toBe("zh");
  expect(general?.textContent).toContain("常规");
  expect(general?.textContent).toContain("语言");
  expect(general?.textContent).toContain("时区");
  expect(general?.querySelector("#interface-language")).not.toBeNull();
});
