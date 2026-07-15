# Racional da Calculadora Comercial de Precificação

## 1. Custo de Mão de Obra

-   **Nome:** Custo MOD
-   **Definição:** Soma dos custos mensais dos profissionais alocados no
    projeto.
-   **Cálculo:** `Custo MOD = Soma(Tabela[CUSTOMOD])`

## 2. Custo de Ferramentas e Serviços

-   **Nome:** Custo Adicional
-   **Definição:** Soma dos custos de ferramentas, licenças, APIs,
    infraestrutura e serviços.
-   **Cálculo:** `Custo Adicional = Soma(Tabela[CUSTOADI])`

## 3. Custos Diretos

-   **Nome:** Custo Direto
-   **Definição:** Base de custos da operação.
-   **Cálculo:** `Custo Direto = Custo MOD + Custo Adicional`

## 4. Overhead

-   **Nome:** OVH 
-   **Definição:** Percentual de custos indiretos.

## 5. Custo de Overhead

-   **Nome:** Custo OVH
-   **Cálculo:** `Custo OVH = Custo Direto × OVH`

## 6. CDI Anual

-   **Nome:** CDI
-   **Definição:** Taxa de referência financeira.

## 7. Spread Bancário

-   **Nome:** Spread  
-   **Definição:** Percentual adicional sobre o CDI.

## 8. Prazo de Recebimento

-   **Nome:** Prazo (dias)
-   **Definição:** Dias entre emissão da NF e recebimento.

## 9. Custo Financeiro

-   **Nome:** Custo Financeiro
-   **Definição:** Custo do capital utilizando juros compostos.
-   **Cálculo:**
    `=(Custo Direto+Custo OVH)*(((1+(CDI+Spread)/12))^(Prazo/30)-1)`

## 10. Reserva de Risco

-   **Nome:** Reserva 
-   **Definição:** Cobertura para contingências.

## 11. Custo da Reserva

-   **Nome:** Custo Reserva
-   **Cálculo:** `=(Custo Direto+Custo OVH)*Reserva`

## 12. Comissão Broker

-   **Nome:** Comissão 
-   **Definição:** Percentual de remuneração comercial.

## 13. Custo Comercial

-   **Nome:** Custo Comissão
-   **Cálculo:**
    `=(Custo Direto+Custo OVH+Custo Financeiro+Custo Reserva)*Comissão`

## 14. Base Operacional

-   **Nome:** Base Operacional
-   **Definição:** Soma de todos os custos da operação.
-   **Cálculo:**
    `=Custo Direto+Custo OVH+Custo Financeiro+Custo Reserva+Custo Comissão`

## 15. Impostos

-   **Nome:** Impostos 
-   **Definição:** Tributos incidentes sobre a receita.

## 16. Margem Alvo

-   **Nome:** Margem Alvo 
-   **Definição:** Margem alvo da operação.

## 17. Desconto Comercial

-   **Nome:** Desconto
-   **Definição:** Percentual aplicado sobre o preço de venda.

## 18. Preço de Venda

-   **Nome:** Preço de Venda
-   **Definição:** Valor necessário para cobrir custos, impostos e
    margem.
-   **Cálculo:** `=(Base Operacional/(1-Impostos-Margem Alvo))*(1-Desconto)`

## 19.  Margem Real

-   **Nome:** Margem Real
-   **Definição:** Margem efetiva após o desconto.
-   **Cálculo:** `=1-Impostos-(Base Operacional/Preço de Venda)`

## 20.  Lucro Real

-   **Nome:** Lucro Real
-   **Definição:** Valor absoluto do lucro obtido pela operação após o
    pagamento dos impostos e a cobertura de todos os custos operacionais. 
-   **Cálculo:** `=(Preço de Venda*(1-Impostos))-Base Operacional`

------------------------------------------------------------------------

## Fluxo do Racional

``` text
Custo MOD
    +
Custo Adicional
    ↓
Custos Diretos
    ↓
Custo OVH
    ↓
Custo Financeiro
    ↓
Reserva de Risco
    ↓
Custo Comercial
    ↓
Base Operacional
    ↓
Preço de Venda
    ↓
Desconto
    ↓
Preço de Venda Final
    ↓
Margem Real
    ↓
Lucro Real
```
