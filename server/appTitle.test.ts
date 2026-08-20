import { describe, expect, it } from "vitest";

describe("configuração de marca do aplicativo", () => {
  it("mantém QRIA como o título configurado para a plataforma", () => {
    expect(process.env.VITE_APP_TITLE).toBe("QRIA");
  });
});
