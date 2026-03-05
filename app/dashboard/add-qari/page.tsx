'use client'

import { Media } from '@/components/uploadMedia'
import axios from 'axios'
import { useState } from 'react'
import { sileo } from 'sileo'

const AddQari = () => {
  const [image, setImage] = useState<File | null>(null)
  const [name, setName] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!name.trim()) {
      // sileo.error('Please enter Qari name')
      sileo.error({title:'Please enter Qari name'})
      return
    }

    if (!image) {
      sileo.error({title:'Please upload Qari image'})
      return
    }

    setIsSubmitting(true)

    try {
      const formData = new FormData()
      formData.append('name', name)
      formData.append('image', image)
      const res = await axios.post('/dashboard/api/add-qari', formData);
      if (res.status !== 200) {
        sileo.error({title:'Failed to upload'})
      } else {
        sileo.success({title:'Qari added successfully!'})
        setName('')
        setImage(null)
      }

    } catch (error) {
      sileo.error({title:'Failed to add Qari'})
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <>
      <h1 className="text-2xl font-bold text-white w-full text-center pt-5">Add New Qari</h1>

      <form onSubmit={handleSubmit} className="space-y-6 p-5">
        {/* Name Input */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-2">
            Qari Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter Qari name"
            className="w-full px-4 py-3 bg-[#1a1a1a] border border-gray-700 rounded-lg 
                       text-white placeholder-gray-500 focus:outline-none focus:ring-2 
                       focus:ring-green-500 focus:border-transparent"
            disabled={isSubmitting}
          />
        </div>

        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Qari Image <span className="text-red-400">*</span>
          </label>
          <Media
            image={image}
            updateImage={(file) => setImage(file)}
          />
        </div>

        {/* Form Actions */}
        <div className="flex gap-3 pt-4">
          <button
            type="button"
            onClick={() => {
              setName('')
              setImage(null)
            }}
            className="flex-1 px-4 py-3 border border-gray-700 rounded-lg text-gray-300 
                       hover:bg-gray-800 transition-colors"
            disabled={isSubmitting}
          >
            Clear Form
          </button>
          <button
            type="submit"
            disabled={isSubmitting || !name.trim() || !image}
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
                <span>Adding...</span>
              </>
            ) : (
              'Add Qari'
            )}
          </button>
        </div>
      </form>
    </>
  )
}

export default AddQari