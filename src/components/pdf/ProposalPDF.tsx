import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
} from '@react-pdf/renderer'

// Evita hifenização automática
Font.registerHyphenationCallback((word) => [word])

interface PDFData {
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
  items: { name: string; description?: string | null; price: number }[]
  totalMonthly: number
  discountPct: number
  contractMonths: number
  setupInstallments: number
  setupPaymentMethod: string
  notes?: string | null
  createdAt: string
}

function hex(color: string) {
  return color.startsWith('#') ? color : '#307ca8'
}

export function ProposalPDF({ data }: { data: PDFData }) {
  const brand = hex(data.brandColor)

  const styles = StyleSheet.create({
    page: {
      fontFamily: 'Helvetica',
      fontSize: 10,
      color: '#1f2937',
      paddingHorizontal: 48,
      paddingVertical: 48,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 32,
    },
    logo: {
      fontSize: 16,
      fontFamily: 'Helvetica-Bold',
      color: brand,
    },
    headerRight: {
      alignItems: 'flex-end',
    },
    headerLabel: {
      fontSize: 9,
      color: '#6b7280',
      textTransform: 'uppercase',
      letterSpacing: 1,
    },
    headerDate: {
      fontSize: 9,
      color: '#6b7280',
      marginTop: 2,
    },
    divider: {
      height: 2,
      backgroundColor: brand,
      marginBottom: 24,
    },
    sectionTitle: {
      fontSize: 8,
      fontFamily: 'Helvetica-Bold',
      color: '#6b7280',
      textTransform: 'uppercase',
      letterSpacing: 1,
      marginBottom: 8,
    },
    clientBlock: {
      marginBottom: 28,
    },
    clientName: {
      fontSize: 14,
      fontFamily: 'Helvetica-Bold',
      color: '#111827',
      marginBottom: 2,
    },
    clientSub: {
      fontSize: 9,
      color: '#6b7280',
      marginBottom: 1,
    },
    table: {
      marginBottom: 4,
    },
    tableHeader: {
      flexDirection: 'row',
      backgroundColor: brand,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 4,
      marginBottom: 1,
    },
    tableHeaderText: {
      fontSize: 8,
      fontFamily: 'Helvetica-Bold',
      color: '#ffffff',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    tableRow: {
      flexDirection: 'row',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderBottomWidth: 1,
      borderBottomColor: '#f3f4f6',
    },
    tableRowAlt: {
      backgroundColor: '#f9fafb',
    },
    colProduct: { flex: 1 },
    colPrice: { width: 80, alignItems: 'flex-end' },
    productName: {
      fontSize: 10,
      fontFamily: 'Helvetica-Bold',
      color: '#111827',
    },
    productDesc: {
      fontSize: 8,
      color: '#9ca3af',
      marginTop: 1,
    },
    priceText: {
      fontSize: 10,
      fontFamily: 'Helvetica-Bold',
      color: '#111827',
    },
    totalRow: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: brand,
      borderRadius: 4,
      marginTop: 4,
    },
    totalLabel: {
      fontSize: 10,
      fontFamily: 'Helvetica-Bold',
      color: '#ffffff',
      marginRight: 16,
    },
    totalValue: {
      fontSize: 14,
      fontFamily: 'Helvetica-Bold',
      color: '#ffffff',
    },
    conditions: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 24,
      marginBottom: 24,
    },
    conditionCard: {
      flex: 1,
      backgroundColor: '#f9fafb',
      borderRadius: 6,
      padding: 12,
      alignItems: 'center',
    },
    conditionLabel: {
      fontSize: 7,
      color: '#9ca3af',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 4,
    },
    conditionValue: {
      fontSize: 12,
      fontFamily: 'Helvetica-Bold',
      color: '#111827',
    },
    notes: {
      marginTop: 8,
      padding: 12,
      backgroundColor: '#f9fafb',
      borderRadius: 6,
    },
    notesText: {
      fontSize: 9,
      color: '#4b5563',
      lineHeight: 1.5,
    },
    footer: {
      position: 'absolute',
      bottom: 32,
      left: 48,
      right: 48,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    footerText: {
      fontSize: 8,
      color: '#d1d5db',
    },
  })

  const fmt = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v)

  const PAYMENT: Record<string, string> = {
    boleto: 'Boleto',
    cartao: 'Cartão de crédito',
  }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.logo}>{data.companyName}</Text>
          <View style={styles.headerRight}>
            <Text style={styles.headerLabel}>Proposta Comercial</Text>
            <Text style={styles.headerDate}>
              {new Date(data.createdAt).toLocaleDateString('pt-BR')}
            </Text>
          </View>
        </View>
        <View style={styles.divider} />

        {/* Cliente */}
        <View style={styles.clientBlock}>
          <Text style={styles.sectionTitle}>Proposta para</Text>
          <Text style={styles.clientName}>{data.client.razao_social}</Text>
          {data.client.nome_fantasia ? (
            <Text style={styles.clientSub}>{data.client.nome_fantasia}</Text>
          ) : null}
          {data.client.responsible ? (
            <Text style={styles.clientSub}>A/C: {data.client.responsible}</Text>
          ) : null}
          {data.client.cnpj ? (
            <Text style={styles.clientSub}>CNPJ: {data.client.cnpj}</Text>
          ) : null}
        </View>

        {/* Tabela de produtos */}
        <Text style={styles.sectionTitle}>Serviços inclusos</Text>
        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderText, styles.colProduct]}>Serviço</Text>
            <View style={styles.colPrice}>
              <Text style={styles.tableHeaderText}>Valor/mês</Text>
            </View>
          </View>
          {data.items.map((item, i) => (
            <View
              key={i}
              style={[styles.tableRow, i % 2 !== 0 ? styles.tableRowAlt : {}]}
            >
              <View style={styles.colProduct}>
                <Text style={styles.productName}>{item.name}</Text>
                {item.description ? (
                  <Text style={styles.productDesc}>{item.description}</Text>
                ) : null}
              </View>
              <View style={styles.colPrice}>
                <Text style={styles.priceText}>{fmt(item.price)}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Total */}
        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Total mensal</Text>
          <Text style={styles.totalValue}>{fmt(data.totalMonthly)}</Text>
        </View>

        {/* Condições */}
        <View style={styles.conditions}>
          <View style={styles.conditionCard}>
            <Text style={styles.conditionLabel}>Duração</Text>
            <Text style={styles.conditionValue}>{data.contractMonths} meses</Text>
          </View>
          <View style={styles.conditionCard}>
            <Text style={styles.conditionLabel}>Setup — parcelas</Text>
            <Text style={styles.conditionValue}>{data.setupInstallments}x</Text>
          </View>
          <View style={styles.conditionCard}>
            <Text style={styles.conditionLabel}>Setup — pagamento</Text>
            <Text style={styles.conditionValue}>
              {PAYMENT[data.setupPaymentMethod] ?? data.setupPaymentMethod}
            </Text>
          </View>
        </View>

        {/* Observações */}
        {data.notes ? (
          <View>
            <Text style={styles.sectionTitle}>Observações</Text>
            <View style={styles.notes}>
              <Text style={styles.notesText}>{data.notes}</Text>
            </View>
          </View>
        ) : null}

        {/* Rodapé */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>
            Proposta válida por 15 dias · {data.companyName}
          </Text>
          <Text
            style={styles.footerText}
            render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`}
          />
        </View>
      </Page>
    </Document>
  )
}
