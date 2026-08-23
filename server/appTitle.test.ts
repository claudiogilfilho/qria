import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("configuração de marca do aplicativo", () => {
  it("mantém QRIA como o título configurado para a plataforma", () => {
    const html = readFileSync(resolve(process.cwd(), "client/index.html"), "utf8");
    expect(html).toContain("<title>QRIA — Ateliê de Identidade</title>");
  });
});
