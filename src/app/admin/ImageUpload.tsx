'use client'

import { useState, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { UploadCloud, Image as ImageIcon, Loader2 } from 'lucide-react'

export function ImageUpload({ 
  currentUrl, 
  onUploadSuccess 
}: { 
  currentUrl: string | null
  onUploadSuccess: (url: string) => void 
}) {
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  // supabase do lado do cliente para permitir uploads diretos sem stressar API routes
  const supabase = createClient()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    try {
      // Gerando um nome de arquivo seguro e único
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`
      const filePath = `user-uploads/${fileName}` // Caminho dentro do bucket

      const { error: uploadError } = await supabase.storage
        .from('product-images')
        .upload(filePath, file)

      if (uploadError) {
        console.error('Error uploading image:', uploadError)
        alert('Erro ao fazer upload da imagem.')
      } else {
        const { data: { publicUrl } } = supabase.storage
          .from('product-images')
          .getPublicUrl(filePath)
        
        onUploadSuccess(publicUrl)
      }
    } catch (err) {
      console.error(err)
      alert('Erro inesperado no upload.')
    } finally {
      setIsUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  return (
    <div 
      className="relative w-full h-full group cursor-pointer overflow-hidden rounded-inherit" 
      onClick={() => fileInputRef.current?.click()}
      title="Clique para enviar uma foto do seu dispositivo"
    >
      <input 
        type="file" 
        accept="image/jpeg, image/png, image/webp" 
        className="hidden" 
        ref={fileInputRef}
        onChange={handleFileChange}
        disabled={isUploading}
      />

      {currentUrl ? (
        <div className="w-full h-full bg-black/40 relative">
          <img src={currentUrl} alt="Produto" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 backdrop-blur-sm">
            {isUploading ? (
              <>
                <Loader2 className="w-8 h-8 text-white animate-spin mb-2" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white">Enviando...</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-8 h-8 text-white mb-2" />
                <span className="text-[10px] font-black uppercase tracking-widest text-white">Mudar Foto</span>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="w-full h-full bg-black/20 flex flex-col items-center justify-center text-white/30 group-hover:bg-brand-gold/10 group-hover:text-brand-gold transition-colors border border-white/5 border-dashed">
          {isUploading ? (
            <Loader2 className="w-8 h-8 animate-spin" />
          ) : (
            <>
              <ImageIcon className="w-8 h-8 mb-2 opacity-50" />
              <span className="text-[10px] uppercase tracking-widest font-black opacity-80 mt-2">Upload Imagem</span>
              <span className="text-[8px] uppercase tracking-widest opacity-50 mt-1">Clique para buscar</span>
            </>
          )}
        </div>
      )}
    </div>
  )
}
