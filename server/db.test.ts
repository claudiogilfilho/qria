import { describe, expect, it } from "vitest";
import { getInsertId } from "./db";

describe("getInsertId", () => {
  it("lê o identificador quando o driver retorna o cabeçalho diretamente", () => {
    expect(getInsertId({ insertId: 18 })).toBe(18);
  });

  it("lê o identificador quando o driver retorna a tupla de resultado e campos", () => {
    expect(getInsertId([{ insertId: 27 }, []])).toBe(27);
  });

  it("interrompe a criação da sessão quando não há identificador válido", () => {
    expect(() => getInsertId({ insertId: 0 })).toThrow("Não foi possível obter o identificador");
  });
});
