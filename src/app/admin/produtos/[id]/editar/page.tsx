import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import EditProductForm from './EditProductForm'

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: product } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single()

  if (!product) redirect('/admin')

  return <EditProductForm product={product} />
}
