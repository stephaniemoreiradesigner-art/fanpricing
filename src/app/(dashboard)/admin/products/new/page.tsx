import { redirect } from 'next/navigation'

// Cadastro de produtos empacotados ainda não disponível no modelo atual
// (orçamentos usam mão de obra + ferramentas). Ver /admin/products (catálogo).
export default function NewProductPage() {
  redirect('/admin/products')
}
