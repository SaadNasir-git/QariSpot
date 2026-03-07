'use client'

import { useState, useEffect } from 'react'
import { Media } from '@/components/uploadAudio';
import { sileo } from 'sileo';
import axios from 'axios';

interface Qari {
  id: string;
  name: string;
}

const AddSurah = () => {
  const [surahName, setSurahName] = useState('')
  const [selectedQari, setSelectedQari] = useState('')
  const [qaris, setQaris] = useState<Qari[]>([])
  const [audioFile, setAudioFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loadingQaris, setLoadingQaris] = useState(true)
  const [Duration, setDuration] = useState<number>(0);
  const [surahNO, setsurahNO] = useState<string>('')

  useEffect(() => {
    fetchQaris()
  }, [])

  const fetchQaris = async () => {
    try {
      const response = await axios.get('/api/qaris')
      if (response.status !== 200) throw new Error('Failed to fetch qaris')
      setQaris(response.data.data)
    } catch (error) {
      sileo.error({ title: 'Failed to load qaris' })
    } finally {
      setLoadingQaris(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    // Validation
    if (!surahName.trim()) {
      sileo.error({ title: 'Please enter Surah name' })
      return
    }

    if (!selectedQari) {
      sileo.error({ title: 'Please select a Qari' })
      return
    }

    if (!audioFile) {
      sileo.error({ title: 'Please upload audio file' })
      return
    }

    if (!surahNO) {
      sileo.error({ title: 'Please enter Surah Number' })
      return
    }

    setIsSubmitting(true)

    try {
      const formData = new FormData()
      formData.append('name', surahName)
      formData.append('qariId', selectedQari)
      formData.append('audioDuration', Duration.toString())
      formData.append('surahNo', surahNO);
      formData.append('surahSize', audioFile.size.toString())

      const response = await axios.post('/dashboard/api/add-surah', formData);
      if(response.status !== 200){
        sileo.error({ title: 'Failed to add Surah' })
        return;
      }
      const cloudinaryData = new FormData();
      cloudinaryData.append("file", audioFile);
      cloudinaryData.append("upload_preset", process.env.NEXT_PUBLIC_PRESET_NAME);

      cloudinaryData.append("context", `recordId=${response.data.recordId}`);
      const cloudinaryResponse = await fetch(`https://api.cloudinary.com/v1_1/${process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME}/auto/upload`, {
        method: "POST",
        body: cloudinaryData,
      });

      if (cloudinaryResponse.ok) {
        sileo.success({ title: 'Surah added successfully!' })
        setsurahNO('')
        setDuration(0)
        setSurahName('')
        setSelectedQari('')
        setAudioFile(null)
      }

    } catch (error) {
      console.log(error)
      sileo.error({ title: 'Failed to add Surah' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-white mb-6 pt-5 px-5 text-center">Add New Surah</h1>

      <form onSubmit={handleSubmit} className="space-y-6 p-5">
        {/* Surah Name Input */}
        <div className="space-y-2">
          <label htmlFor="surahName" className="block text-sm font-medium text-gray-300">
            Surah Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            id="surahName"
            value={surahName}
            onChange={(e) => setSurahName(e.target.value)}
            placeholder="e.g., Al-Fatihah, Al-Baqarah, Yaseen"
            className="w-full px-4 py-2.5 bg-[#1a1a1a] border border-gray-700 rounded-lg 
                                     text-white placeholder-gray-500 focus:outline-none focus:ring-2 
                                     focus:ring-green-500 focus:border-transparent transition-all"
            disabled={isSubmitting}
          />
          <p className="text-xs text-gray-500 mt-1">
            Enter the name of the Surah as it should appear
          </p>
        </div>

        <div className='space-y-2'>
          <label htmlFor="surahNo" className="block text-sm font-medium text-gray-300">
            Surah Number <span className="text-red-400">*</span>
          </label>
          <input
            type="number"
            id='surahNo'
            value={surahNO}
            onChange={(e) => setsurahNO(e.target.value)}
            placeholder="e.g. 1"
            className="w-full px-4 py-2.5 bg-[#1a1a1a] border border-gray-700 rounded-lg 
                                     text-white placeholder-gray-500 focus:outline-none focus:ring-2 
                                     focus:ring-green-500 focus:border-transparent transition-all"
            disabled={isSubmitting}
          />
        </div>

        {/* Qari Selection */}
        <div className="space-y-2">
          <label htmlFor="qari" className="block text-sm font-medium text-gray-300">
            Select Qari <span className="text-red-400">*</span>
          </label>

          {loadingQaris ? (
            <div className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg 
                                          flex items-center gap-2 text-gray-400">
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Loading qaris...</span>
            </div>
          ) : (
            <select
              id="qari"
              value={selectedQari}
              onChange={(e) => setSelectedQari(e.target.value)}
              className="w-full px-4 py-2.5 bg-[#1a1a1a] border border-gray-700 rounded-lg 
                                         text-white focus:outline-none focus:ring-2 focus:ring-green-500 
                                         focus:border-transparent transition-all appearance-none
                                         cursor-pointer"
              disabled={isSubmitting}
            >
              <option value="" className="bg-[#1a1a1a] text-gray-500">
                -- Select a Qari --
              </option>
              {qaris.map((qari) => (
                <option
                  key={qari.id}
                  value={qari.id}
                  className="bg-[#1a1a1a] text-white"
                >
                  {qari.name}
                </option>
              ))}
            </select>
          )}

          {!loadingQaris && qaris.length === 0 && (
            <p className="text-sm text-yellow-500 mt-1">
              No qaris found. Please add a qari first.
            </p>
          )}
        </div>

        {/* Audio Upload */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-300">
            Audio File <span className="text-red-400">*</span>
          </label>
          <Media
            media={audioFile}
            updateMedia={(file) => setAudioFile(file)}
            setAudioDuration={(duration) => setDuration(duration)}
          />
        </div>

        {/* Form Actions */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={() => {
              setSurahName('')
              setSelectedQari('')
              setAudioFile(null)
            }}
            className="flex-1 px-4 py-3 border border-gray-700 rounded-lg text-gray-300 
                                     hover:bg-gray-800 transition-colors"
            disabled={isSubmitting}
          >
            Clear Form
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !surahName.trim() || !selectedQari || !audioFile}
            className="flex-1 px-4 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg 
                                     font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed
                                     flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Adding Surah...</span>
              </>
            ) : (
              'Add Surah'
            )}
          </button>
        </div>
      </form>

      {/* Preview Section */}
      {surahName && selectedQari && audioFile && (
        <div className="mt-8 p-4 border border-gray-800 rounded-lg bg-[#1a1a1a]">
          <h3 className="text-sm font-medium text-gray-400 mb-3">Preview</h3>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-green-600/20 flex items-center justify-center">
              <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2z" />
              </svg>
            </div>
            <div>
              <p className="text-white font-medium">{surahName}</p>
              <p className="text-sm text-gray-400">
                {qaris.find(q => q.id === selectedQari)?.name || 'Selected Qari'}
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default AddSurah
