import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Search, RotateCcw, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'

const formatDate = (dateStr: string) => {
  if (!dateStr) return ''
  const [year, month, day] = dateStr.split('-')
  return `${day}-${month}-${year}`
}

interface SettledEntry {
  id: number
  type: string
  date: string
  customer_name: string
  customer_mobile: string | null
  given_amount: number
  settled_amount: number
  settled_date: string
  items: string
  settlement_notes: string | null
}

export function SettledEntries() {
  const [entries, setEntries] = useState<SettledEntry[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchSettledEntries = async () => {
    try {
      let query = supabase
        .from('entries')
        .select('id, type, date, customer_name, customer_mobile, given_amount, settled_amount, settled_date,items, settlement_notes')
        .eq('status', 'settled')
        .order('settled_date', { ascending: false })

      if (selectedDate) {
        query = query.eq('settled_date', selectedDate)
      }

      const { data, error } = await query

      if (error) throw error

      setEntries(data || [])
    } catch (error) {
      console.error('Error fetching settled entries:', error)
      toast.error('Failed to fetch settled entries')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchSettledEntries()
  }, [selectedDate])

  const handleRevoke = async (id: number) => {
    if (!confirm('Are you sure you want to revoke this settlement? The entry will be marked as active again.')) return

    try {
      const { error } = await supabase
        .from('entries')
        .update({
          status: 'active',
          settled_amount: null,
          settled_date: null,
          settlement_notes: null
        })
        .eq('id', id)
        .eq('status', 'settled')

      if (error) throw error

      toast.success('Settlement revoked successfully')
      setEntries(prevEntries => prevEntries.filter(entry => entry.id !== id))
    } catch (error) {
      console.error('Error revoking settlement:', error)
      toast.error('Failed to revoke settlement')
    }
  }

  const filteredEntries = entries.filter(entry =>
    entry.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (entry.customer_mobile?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
    entry.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.given_amount.toString().includes(searchTerm) ||
    entry.settled_amount.toString().includes(searchTerm)
  )

  const calculateTotalAmount = (givenAmount: number, settledAmount: number) => {
    return givenAmount + settledAmount
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="text"
            placeholder="Search by name, mobile, type or amount..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        <div className="relative">
          <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="pl-10 pr-4 py-2 w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
          {selectedDate && (
            <button
              onClick={() => setSelectedDate('')}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-4">Loading settled entries...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loan Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Given Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Extra Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Settled Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Notes</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{entry.type}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{entry.customer_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(entry.date)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{entry.given_amount}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">₹{entry.settled_amount}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ₹{calculateTotalAmount(entry.given_amount, entry.settled_amount)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatDate(entry.settled_date)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">{entry.items}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{entry.settlement_notes || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <button
                      onClick={() => handleRevoke(entry.id)}
                      className="text-orange-600 hover:text-orange-900"
                      title="Revoke Settlement"
                    >
                      <RotateCcw className="h-5 w-5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}