import assert from "node:assert/strict";
import test from "node:test";
import { acceptImage, rejectText } from "./guard.ts";

const PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

test("poema limpo passa", () => {
  assert.equal(rejectText("Querida, ao pé do leito derradeiro"), null);
  assert.equal(rejectText("A morte é um verso, não um pedido."), null);
  assert.equal(rejectText("A disputa ficou no papel."), null);
});

test("xingamento, link e dado pessoal não passam", () => {
  assert.ok(rejectText("que merda"));
  assert.ok(rejectText("m3rd4"));
  assert.ok(rejectText("https://golpe.com/premio"));
  assert.ok(rejectText("me chama em ana@email.com"));
  assert.ok(rejectText("cpf 123.456.789-09"));
  assert.ok(rejectText("uma criança pelada"));
  assert.equal(rejectText("uma pelada no campinho"), null);
});

test("ódio e xingamento disfarçado não passam", () => {
  assert.ok(rejectText("p o r r a"));
  assert.ok(rejectText("p.o.r.r.a"));
  assert.ok(rejectText("porrrra"));
  assert.ok(rejectText("karalho"));
  assert.ok(rejectText("vai tomar no cu"));
  assert.ok(rejectText("fdp"));
  assert.ok(rejectText("odeio judeus"));
  assert.ok(rejectText("heil hitler"));
  assert.equal(rejectText("sou gay e escrevo verso"), null);
  assert.equal(rejectText("o veado cruzou a mata"), null);
  assert.equal(rejectText("A disputa ficou no papel."), null);
});

test("capa só vale se for imagem de verdade", () => {
  assert.equal(acceptImage(PNG), PNG);
  assert.equal(acceptImage("data:image/png;base64,AAAA"), "");
  assert.equal(acceptImage("data:text/html;base64,PGh0bWw+"), "");
  assert.equal(acceptImage(""), "");
});
