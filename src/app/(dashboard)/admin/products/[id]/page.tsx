import { redirect } from 'next/navigation'

// Edição de produto no modelo antigo desativada. Ver /admin/products (catálogo).
export default async function EditProductPage() {
  redirect('/admin/products')
}
