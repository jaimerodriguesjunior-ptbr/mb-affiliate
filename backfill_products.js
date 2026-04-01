const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
  console.log('Faltam variáveis de ambiente.')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function run() {
  console.log('⏳ Atualizando produtos antigos com categoria "Diversos" e preço "99.90"...')
  const { data, error } = await supabase
    .from('products')
    .update({ 
      category: 'Diversos', 
      price: 99.90 
    })
    .is('category', null)

  if (error) {
    console.error('❌ Erro:', error)
  } else {
    console.log('✅ Banco preenchido com segurança!')
  }
}

run()
