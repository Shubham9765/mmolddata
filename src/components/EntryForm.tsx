import React, { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { supabase } from '../lib/supabase'
import toast from 'react-hot-toast'
import { Save, Calendar, User, Phone, MapPin, Package, CreditCard, Search } from 'lucide-react'
import { debounce } from 'lodash'

type EntryType = 'NR' | 'R' | 'Vyapari'

interface EntryFormData {
  type: EntryType
  date: string
  customerName: string
  customerAddress: string
  customerMobile: string
  items: string
  givenAmount: number
}

interface CustomerSuggestion {
  customer_name: string
  customer_address: string
  customer_mobile: string | null
}

export function EntryForm() {
  const [formData, setFormData] = useState<EntryFormData>({
    type: 'NR',
    date: format(new Date(), 'dd-MM-yyyy'),
    customerName: '',
    customerAddress: '',
    customerMobile: '',
    items: '',
    givenAmount: 0
  })

  const [suggestions, setSuggestions] = useState<CustomerSuggestion[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)

  const searchCustomers = async (searchTerm: string) => {
    if (!searchTerm.trim()) {
      setSuggestions([])
      return
    }

    try {
      const { data, error } = await supabase
        .from('entries')
        .select('customer_name, customer_address, customer_mobile')
        .ilike('customer_name', `%${searchTerm}%`)
        .order('customer_name')
        .limit(5)

      if (error) throw error

      // Remove duplicates based on customer name
      const uniqueCustomers = data.reduce((acc: CustomerSuggestion[], current) => {
        if (!acc.find(item => item.customer_name === current.customer_name)) {
          acc.push(current)
        }
        return acc
      }, [])

      setSuggestions(uniqueCustomers)
      setShowSuggestions(true)
    } catch (error) {
      console.error('Error searching customers:', error)
    }
  }

  const debouncedSearch = debounce(searchCustomers, 300)

  useEffect(() => {
    return () => {
      debouncedSearch.cancel()
    }
  }, [])

  const handleCustomerNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setFormData({ ...formData, customerName: value })
    debouncedSearch(value)
  }

  const handleSuggestionClick = (suggestion: CustomerSuggestion) => {
    setFormData(prev => ({
      ...prev,
      customerName: suggestion.customer_name,
      customerAddress: suggestion.customer_address,
      customerMobile: suggestion.customer_mobile || ''
    }))
    setShowSuggestions(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Convert dd-MM-yyyy to yyyy-MM-dd
    const [day, month, year] = formData.date.split("-")
    const formattedDate = `${year}-${month}-${day}`

    try {
      const { error } = await supabase
        .from("entries")
        .insert([
          {
            type: formData.type,
            date: formattedDate,
            customer_name: formData.customerName,
            customer_address: formData.customerAddress,
            customer_mobile: formData.customerMobile || null,
            items: formData.items,
            given_amount: formData.givenAmount,
          },
        ])

      if (error) throw error

      toast.success("Entry saved successfully!")
      
      // Reset form
      setFormData({
        type: "NR",
        date: format(new Date(), "dd-MM-yyyy"),
        customerName: "",
        customerAddress: "",
        customerMobile: "",
        items: "",
        givenAmount: 0,
      })
    } catch (error) {
      toast.error("Failed to save entry")
      console.error("Error:", error)
    }
  }

  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Convert yyyy-MM-dd to dd-MM-yyyy
    const inputDate = e.target.value
    const [year, month, day] = inputDate.split('-')
    const formattedDate = `${day}-${month}-${year}`
    setFormData({ ...formData, date: formattedDate })
  }

  // Convert dd-MM-yyyy to yyyy-MM-dd for input value
  const getInputDateValue = () => {
    const [day, month, year] = formData.date.split('-')
    return `${year}-${month}-${day}`
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Type Selection */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">Entry Type</label>
              <div className="relative">
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value as EntryType })}
                  className="block w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring focus:ring-blue-200 transition-all duration-200 bg-white appearance-none"
                >
                  <option value="NR">NR</option>
                  <option value="R">R</option>
                  <option value="Vyapari">Vyapari</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Date Input */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" />
                  Date
                </span>
              </label>
              <input
                type="date"
                value={getInputDateValue()}
                onChange={handleDateChange}
                className="block w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring focus:ring-blue-200 transition-all duration-200"
              />
            </div>

            {/* Customer Name */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Customer Name
                </span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.customerName}
                  onChange={handleCustomerNameChange}
                  onFocus={() => formData.customerName && setShowSuggestions(true)}
                  className="block w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring focus:ring-blue-200 transition-all duration-200"
                  placeholder="Enter customer name"
                  required
                />
                <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                
                {/* Suggestions Dropdown */}
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white rounded-md shadow-lg border border-gray-200">
                    {suggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                        onClick={() => handleSuggestionClick(suggestion)}
                      >
                        <div className="font-medium">{suggestion.customer_name}</div>
                        <div className="text-sm text-gray-600">{suggestion.customer_mobile || 'No mobile'}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Mobile Number */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Mobile Number (Optional)
                </span>
              </label>
              <input
                type="tel"
                value={formData.customerMobile}
                onChange={(e) => setFormData({ ...formData, customerMobile: e.target.value })}
                className="block w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring focus:ring-blue-200 transition-all duration-200"
                placeholder="Enter mobile number (optional)"
              />
            </div>

            {/* Address */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Address
                </span>
              </label>
              <textarea
                value={formData.customerAddress}
                onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
                rows={3}
                className="block w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring focus:ring-blue-200 transition-all duration-200 resize-none"
                placeholder="Enter customer address"
                required
              />
            </div>

            {/* Items */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="flex items-center gap-2">
                  <Package className="w-4 h-4" />
                  Items
                </span>
              </label>
              <textarea
                value={formData.items}
                onChange={(e) => setFormData({ ...formData, items: e.target.value })}
                rows={3}
                className="block w-full px-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring focus:ring-blue-200 transition-all duration-200 resize-none"
                placeholder="Enter items details"
                required
              />
            </div>

            {/* Given Amount */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <span className="flex items-center gap-2">
                  <CreditCard className="w-4 h-4" />
                  Given Amount
                </span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">₹</span>
                <input
                  type="number"
                  value={formData.givenAmount}
                  onChange={(e) => setFormData({ ...formData, givenAmount: Number(e.target.value) })}
                  className="block w-full pl-8 pr-4 py-3 rounded-lg border-2 border-gray-200 focus:border-blue-500 focus:ring focus:ring-blue-200 transition-all duration-200"
                  placeholder="0.00"
                  min="0"
                  step="0.01"
                  required
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-8 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
            >
              <Save className="w-5 h-5 mr-2" />
              Save Entry
            </button>
          </div>
        </div>
      </div>
    </form>
  )
}