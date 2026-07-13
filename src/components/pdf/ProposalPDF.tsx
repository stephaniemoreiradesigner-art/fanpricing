import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer'

Font.registerHyphenationCallback((word) => [word])

export interface ProposalPDFData {
  companyName: string
  brandColor: string
  client: {
    razao_social: string
    nome_fantasia?: string | null
    responsible?: string | null
    cnpj?: string | null
    email?: string | null
    phone?: string | null
  }
  title: string
  intro?: string | null
  scopeLines: string[]
  totalMonthly: number
  totalSetup: number
  billingModel: 'projeto' | 'always_on'
  contractMonths: number
  validUntil?: string | null
  createdAt: string
}

function hex(color: string) {
  return color.startsWith('#') ? color : '#307ca8'
}

function brl(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)
}

export function ProposalPDF({ data }: { data: ProposalPDFData }) {
  const brand = hex(data.brandColor)
  const clientName = data.client.nome_fantasia || data.client.razao_social

  const paymentText =
    data.billingModel === 'always_on'
      ? 'Faturamento mensal (Always On), com pagamento todo dia 05 do mes subsequente a prestacao do servico.'
      : '50% na assinatura do contrato e 50% na entrega final.'

  const styles = StyleSheet.create({
    page: { fontFamily: 'Helvetica', fontSize: 10, color: '#1f2937', paddingHorizontal: 48, paddingVertical: 40 },
    header: { backgroundColor: brand, marginHorizontal: -48, marginTop: -40, paddingHorizontal: 48, paddingVertical: 28, marginBottom: 28 },
    company: { color: '#ffffff', fontSize: 9, opacity: 0.85, textTransform: 'uppercase' },
    title: { color: '#ffffff', fontSize: 18, fontFamily: 'Helvetica-Bold', marginTop: 6 },
    client: { color: '#ffffff', fontSize: 11, marginTop: 4, opacity: 0.95 },
    sectionTitle: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#6b7280', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 6 },
    section: { marginBottom: 18 },
    paragraph: { fontSize: 10, lineHeight: 1.5, color: '#374151' },
    scopeItem: { flexDirection: 'row', marginBottom: 4 },
    bullet: { color: brand, marginRight: 6, fontFamily: 'Helvetica-Bold' },
    investBox: { backgroundColor: '#f9fafb', borderRadius: 8, padding: 16, borderWidth: 1, borderColor: '#f0f0f0' },
    investRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end' },
    investLabel: { fontSize: 10, color: '#4b5563' },
    investValue: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: brand },
    small: { fontSize: 8, color: '#9ca3af', marginTop: 8 },
    footer: { position: 'absolute', bottom: 28, left: 48, right: 48, fontSize: 8, color: '#9ca3af', textAlign: 'center' },
  })

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.company}>{data.companyName}</Text>
          <Text style={styles.title}>{data.title}</Text>
          <Text style={styles.client}>{clientName}</Text>
        </View>

        {data.intro ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>O projeto</Text>
            <Text style={styles.paragraph}>{data.intro}</Text>
          </View>
        ) : null}

        {data.scopeLines.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>O que esta incluido</Text>
            {data.scopeLines.map((line, i) => (
              <View style={styles.scopeItem} key={i}>
                <Text style={styles.bullet}>{'•'}</Text>
                <Text style={styles.paragraph}>{line}</Text>
              </View>
            ))}
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Investimento</Text>
          <View style={styles.investBox}>
            <View style={styles.investRow}>
              <Text style={styles.investLabel}>Valor mensal</Text>
              <Text style={styles.investValue}>{brl(data.totalMonthly)}</Text>
            </View>
            {data.totalSetup > 0 ? (
              <View style={[styles.investRow, { marginTop: 8 }]}>
                <Text style={styles.investLabel}>Setup (implantacao)</Text>
                <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#374151' }}>{brl(data.totalSetup)}</Text>
              </View>
            ) : null}
            <Text style={styles.small}>Impostos inclusos.</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Condicoes de pagamento</Text>
          <Text style={styles.paragraph}>{paymentText}</Text>
          <Text style={[styles.paragraph, { marginTop: 4, color: '#6b7280' }]}>
            Vigencia do contrato: {data.contractMonths} meses.
          </Text>
          {data.validUntil ? (
            <Text style={styles.small}>
              Proposta valida ate {new Date(data.validUntil).toLocaleDateString('pt-BR')}.
            </Text>
          ) : null}
        </View>

        <Text style={styles.footer}>
          {data.companyName} — Documento gerado em {new Date(data.createdAt).toLocaleDateString('pt-BR')}
        </Text>
      </Page>
    </Document>
  )
}
