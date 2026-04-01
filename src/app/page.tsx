import { redirect } from 'next/navigation'

export default function Home() {
  // Redireciona diretamente para o painel de administração
  redirect('/admin')
}
