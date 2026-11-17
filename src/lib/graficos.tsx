import type { CSSProperties } from 'react'
import { CartesianGrid } from 'recharts'

// ============================================================
// Padrão único de gráficos do sistema ("leitura em segundos").
// Todo gráfico Recharts do CRM usa estes elementos: grade de no
// MÁXIMO 3 linhas horizontais (traço fino e claro), eixos em
// cinza de apoio com números em IBM Plex Mono, tooltip limpo
// (fundo branco, borda da linha, números mono, sem sombra
// pesada) e NENHUM gradiente, sombra ou efeito 3D.
// Cores: tokens da identidade Condutiva (src/main.css).
// ============================================================

export const COR_LINHA = '#e3e6e3' // var(--condutiva-linha) — traço de grade/borda
export const COR_CINZA = '#6b7280' // var(--condutiva-cinza) — rótulo de apoio
export const COR_TEXTO = '#1a1d1f' // var(--condutiva-texto)
export const COR_LIME_ESCURO = '#7fae22' // lime escurecido — série sobre branco
export const COR_LIME_CLARO = '#a8d93a' // lime do logotipo
export const COR_ALERTA = '#c77d0a' // var(--condutiva-alerta) — meta/marcador
export const COR_RISCO = '#c0392b' // var(--condutiva-risco) — churn/perda
export const COR_NEUTRO = '#9ca3af' // série neutra (receita inicial, contexto)

// Fonte mono tabular dos números (eixos, rótulos, tooltip)
export const FONTE_NUMERO = "'IBM Plex Mono', ui-monospace, monospace"

// Grade leve: no máximo 3 linhas horizontais (traço fino e claro),
// sem grade vertical. horizontalPoints em frações da altura garante
// que nunca sejam desenhadas mais de 3 linhas.
export function GradeGrafico() {
  return (
    <CartesianGrid
      horizontal
      vertical={false}
      horizontalPoints={[0.25, 0.5, 0.75]}
      stroke={COR_LINHA}
      strokeWidth={1}
    />
  )
}

// Eixo X (meses/categorias): rótulo pequeno em cinza, linha fina
export function eixoX(formatter?: (v: string) => string) {
  return {
    tickFormatter: formatter,
    tick: { fontSize: 11, fill: COR_CINZA, fontFamily: FONTE_NUMERO },
    tickLine: false,
    axisLine: { stroke: COR_LINHA, strokeWidth: 1 },
  }
}

// Eixo Y de valor: números em mono; barras SEMPRE começam em zero
// (proporção visual = proporção dos números). Para evolução em
// linha, passe { permitirNegativo: true } para não cortar valores.
export function eixoY(opcoes: {
  yAxisId?: string
  width?: number
  formatter?: (v: number) => string
  orientation?: 'left' | 'right'
  barras?: boolean
}) {
  return {
    ...(opcoes.yAxisId ? { yAxisId: opcoes.yAxisId } : {}),
    orientation: opcoes.orientation ?? ('left' as const),
    ...(opcoes.formatter ? { tickFormatter: opcoes.formatter } : {}),
    allowDecimals: false,
    tick: { fontSize: 11, fill: COR_CINZA, fontFamily: FONTE_NUMERO },
    tickLine: false,
    axisLine: false,
    width: opcoes.width ?? 72,
    // barras: domínio fixo começando em zero — proporção fiel
    ...(opcoes.barras ? { domain: [0, 'auto'] as [number, 'auto'] } : {}),
  }
}

// Rótulo direto no FIM de uma linha (substitui legenda redundante):
// desenha o texto só no último ponto informado. Uso:
//   label={{ content: rotuloFimDeLinha(ultimoIndice, (v) => ..., cor) }}
export function rotuloFimDeLinha(
  indice: number,
  texto: (v: number | null) => string | null,
  cor: string = COR_CINZA,
) {
  return function RotuloFim(props: {
    index?: number
    x?: number | string
    y?: number | string
    value?: number | null
  }) {
    if (props.index !== indice || props.x == null || props.y == null) return null
    const t = texto(props.value ?? null)
    if (!t) return null
    return (
      <text
        x={Number(props.x)}
        y={Number(props.y) - 10}
        textAnchor="middle"
        fontSize={10}
        fontWeight={600}
        fontFamily={FONTE_NUMERO}
        fill={cor}
      >
        {t}
      </text>
    )
  }
}

// Tooltip limpo: fundo branco, borda fina, números mono, sem sombra pesada
export function tooltipPadrao(extra?: Record<string, unknown>) {
  return {
    contentStyle: {
      backgroundColor: '#ffffff',
      border: `1px solid ${COR_LINHA}`,
      borderRadius: 8,
      padding: '8px 10px',
      fontSize: 11,
      fontFamily: FONTE_NUMERO,
      boxShadow: 'none',
    } satisfies CSSProperties,
    labelStyle: {
      color: COR_TEXTO,
      fontWeight: 600,
      fontFamily: "'Archivo', 'Inter', system-ui, sans-serif",
      marginBottom: 4,
    } satisfies CSSProperties,
    itemStyle: { color: COR_TEXTO, padding: '2px 0' } satisfies CSSProperties,
    cursor: { fill: 'rgba(26, 29, 31, 0.04)' },
    ...extra,
  }
}
