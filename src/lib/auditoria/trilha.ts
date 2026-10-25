/**
 * Trilha de auditoria: toda função de cálculo do CanaValor devolve, junto com o
 * valor, os passos que o produziram e o dispositivo normativo que o fundamenta.
 *
 * É o que permite ao componente <ValorAuditavel> abrir o painel lateral e
 * mostrar, para qualquer número da tela, a fórmula, os valores substituídos e
 * a norma de origem.
 */

export interface Passo {
  /** Rótulo curto do passo, ex.: "ARC" */
  rotulo: string;
  /** Fórmula simbólica, ex.: "9,5263 × PC + 9,05 × ARC" */
  formula: string;
  /** A mesma fórmula com os números substituídos, ex.: "9,5263 × 14,8044 + …" */
  substituido: string;
  valor: number;
  unidade: string;
  /** id em DISPOSITIVOS */
  ref?: string;
}

export interface Calculo<T = number> {
  valor: T;
  unidade: string;
  passos: Passo[];
  /** id do dispositivo que fundamenta o resultado final */
  ref: string;
}

/** Formata número no padrão brasileiro, com casas decimais fixas. */
export function num(v: number, casas = 4): string {
  return v.toLocaleString('pt-BR', {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}

export function brl(v: number, casas = 2): string {
  return v.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}
