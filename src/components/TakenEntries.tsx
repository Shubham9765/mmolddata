import React, { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Search, Trash2, CheckCircle, Calendar, RefreshCw } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'

interface Entry {
  id: number
  type: string
  date: string
  customer_name: string
  customer_address: string
  customer_mobile: string | null
  items: string
  given_amount: number
  status: 'active' | 'settled'
  settled_amount?: number
  settled_date?: string
  settlement_notes?: string
  renewal_history?: Array<{
    date: string
    amount: number
    settled_amount: number
    renewal_date: string
    new_amount: number
  }>
  renewal_date?: string
  renewal_amount?: number
}

interface SettlementFormData {
  total_amount: number
  date: string
  notes: string
}

interface RenewalFormData {
  settlement_amount: number
  renewal_date: string
  new_loan_amount: number
}

export function TakenEntries() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedDate, setSelectedDate] = useState('')
  const [loading, setLoading] = useState(true)
  const [selectedEntry, setSelectedEntry] = useState<Entry | null>(null)
  const [showSettlementModal, setShowSettlementModal] = useState(false)
  const [showRenewalModal, setShowRenewalModal] = useState(false)
  const [settlementData, setSettlementData] = useState<SettlementFormData>({
    total_amount: 0,
    date: format(new Date(), 'yyyy-MM-dd'),
    notes: ''
  })
  const [renewalData, setRenewalData] = useState<RenewalFormData>({
    settlement_amount: 0,
    renewal_date: format(new Date(), 'yyyy-MM-dd'),
    new_loan_amount: 0
  })

  useEffect(() => {
    fetchEntries()
  }, [selectedDate])

  const fetchEntries = async () => {
    try {
      let query = supabase
        .from('entries')
        .select('*')
        .eq('status', 'active')
        .order('date', { ascending: false })

      if (selectedDate) {
        query = query.eq('date', selectedDate)
      }

      const { data, error } = await query

      if (error) throw error

      setEntries(data || [])
    } catch (error) {
      console.error('Error fetching entries:', error)
      toast.error('Failed to fetch entries')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this entry? This action cannot be undone.')) return

    try {
      const { error } = await supabase
        .from('entries')
        .delete()
        .eq('id', id)
        .eq('status', 'active')

      if (error) throw error

      toast.success('Entry deleted successfully')
      setEntries(entries.filter(entry => entry.id !== id))
    } catch (error) {
      console.error('Error deleting entry:', error)
      toast.error('Failed to delete entry')
    }
  }

  const handleSettleClick = (entry: Entry) => {
    setSelectedEntry(entry)
    setSettlementData({
      total_amount: entry.given_amount,
      date: format(new Date(), 'yyyy-MM-dd'),
      notes: ''
    })
    setShowSettlementModal(true)
  }

  const handleRenewalClick = (entry: Entry) => {
    setSelectedEntry(entry)
    setRenewalData({
      settlement_amount: entry.given_amount,
      renewal_date: format(new Date(), 'yyyy-MM-dd'),
      new_loan_amount: entry.given_amount // Initialize with current loan amount
    })
    setShowRenewalModal(true)
  }

  const handleSettleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedEntry) return

    try {
      const { error } = await supabase
        .from('entries')
        .update({
          status: 'settled',
          settled_amount: settlementData.total_amount - selectedEntry.given_amount,
          settled_date: settlementData.date,
          settlement_notes: settlementData.notes || null
        })
        .eq('id', selectedEntry.id)
        .eq('status', 'active')

      if (error) throw error

      toast.success('Loan settled successfully')
      setShowSettlementModal(false)
      setEntries(entries.filter(entry => entry.id !== selectedEntry.id))
    } catch (error) {
      console.error('Error settling loan:', error)
      toast.error('Failed to settle loan')
    }
  }

  const handleRenewalSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedEntry) return

    try {
      // Calculate the extra amount from settlement
      const extraAmount = renewalData.settlement_amount - selectedEntry.given_amount

      // Create renewal history entry
      const historyEntry = {
        date: selectedEntry.date,
        amount: selectedEntry.given_amount,
        settled_amount: renewalData.settlement_amount,
        renewal_date: renewalData.renewal_date,
        new_amount: renewalData.new_loan_amount
      }

      // Get existing history or initialize empty array
      const existingHistory = selectedEntry.renewal_history || []

      const { error } = await supabase
        .from('entries')
        .update({
          renewal_history: [...existingHistory, historyEntry],
          date: renewalData.renewal_date,
          renewal_date: renewalData.renewal_date,
          renewal_amount: renewalData.settlement_amount,
          given_amount: renewalData.new_loan_amount // Update the loan amount to the new value
        })
        .eq('id', selectedEntry.id)
        .eq('status', 'active')

      if (error) throw error

      toast.success('Loan renewed successfully')
      setShowRenewalModal(false)
      fetchEntries() // Refresh the list to show updated entry
    } catch (error) {
      console.error('Error renewing loan:', error)
      toast.error('Failed to renew loan')
    }
  }

  const filteredEntries = entries.filter(entry =>
    entry.customer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (entry.customer_mobile?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
    entry.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
    entry.given_amount.toString().includes(searchTerm)
  )

  const calculateExtraAmount = (totalAmount: number) => {
    if (!selectedEntry) return 0
    return totalAmount - selectedEntry.given_amount
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
        <div className="text-center py-4">Loading entries...</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mobile</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Items</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Renewal History</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredEntries.map((entry) => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{entry.type}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{entry.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{entry.customer_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{entry.customer_mobile || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{entry.given_amount}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 space-x-2">
                    <button
                      onClick={() => handleSettleClick(entry)}
                      className="text-green-600 hover:text-green-900"
                      title="Settle Loan"
                    >
                      <CheckCircle className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleRenewalClick(entry)}
                      className="text-blue-600 hover:text-blue-900"
                      title="Renew Loan"
                    >
                      <RefreshCw className="h-5 w-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(entry.id)}
                      className="text-red-600 hover:text-red-900"
                      title="Delete Entry"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{entry.items}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {entry.renewal_history && entry.renewal_history.length > 0 ? (
                      <div className="space-y-2">
                        {entry.renewal_history.map((history, index) => (
                          <div key={index} className="text-xs">
                            <div>Original Date: {history.date}</div>
                            <div>Original Amount: ₹{history.amount}</div>
                            <div>Settled: ₹{history.settled_amount}</div>
                            <div>Renewed On: {history.renewal_date}</div>
                            <div>New Amount: ₹{history.new_amount}</div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      '-'
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Settlement Modal */}
      {showSettlementModal && selectedEntry && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Settle Loan</h3>
            <form onSubmit={handleSettleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Settlement Date</label>
                <input
                  type="date"
                  required
                  value={settlementData.date}
                  onChange={(e) => setSettlementData({ ...settlementData, date: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Given Amount</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">₹</span>
                  </div>
                  <input
                    type="number"
                    disabled
                    value={selectedEntry.given_amount}
                    className="block w-full pl-7 pr-12 border-gray-300 rounded-md bg-gray-50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Total Settlement Amount</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">₹</span>
                  </div>
                  <input
                    type="number"
                    required
                    min={selectedEntry.given_amount}
                    step="0.01"
                    value={settlementData.total_amount}
                    onChange={(e) => setSettlementData({ ...settlementData, total_amount: Number(e.target.value) })}
                    className="block w-full pl-7 pr-12 border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Extra Amount (Profit)</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">₹</span>
                  </div>
                  <input
                    type="number"
                    disabled
                    value={calculateExtraAmount(settlementData.total_amount)}
                    className="block w-full pl-7 pr-12 border-gray-300 rounded-md bg-gray-50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Settlement Notes (Optional)</label>
                <textarea
                  value={settlementData.notes}
                  onChange={(e) => setSettlementData({ ...settlementData, notes: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="Add any notes about the settlement..."
                />
              </div>
              <div className="mt-5 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowSettlementModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Settle Loan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Renewal Modal */}
      {showRenewalModal && selectedEntry && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center">
          <div className="bg-white rounded-lg p-6 max-w-md w-full">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Renew Loan</h3>
            <form onSubmit={handleRenewalSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Original Loan Date</label>
                <input
                  type="date"
                  disabled
                  value={selectedEntry.date}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm bg-gray-50"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Original Amount</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">₹</span>
                  </div>
                  <input
                    type="number"
                    disabled
                    value={selectedEntry.given_amount}
                    className="block w-full pl-7 pr-12 border-gray-300 rounded-md bg-gray-50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Settlement Amount</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">₹</span>
                  </div>
                  <input
                    type="number"
                    required
                    min={selectedEntry.given_amount}
                    step="0.01"
                    value={renewalData.settlement_amount}
                    onChange={(e) => setRenewalData({ ...renewalData, settlement_amount: Number(e.target.value) })}
                    className="block w-full pl-7 pr-12 border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Extra Amount (Profit)</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">₹</span>
                  </div>
                  <input
                    type="number"
                    disabled
                    value={calculateExtraAmount(renewalData.settlement_amount)}
                    className="block w-full pl-7 pr-12 border-gray-300 rounded-md bg-gray-50"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">New Loan Amount</label>
                <div className="mt-1 relative rounded-md shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-gray-500 sm:text-sm">₹</span>
                  </div>
                  <input
                    type="number"
                    required
                    min={0}
                    step="0.01"
                    value={renewalData.new_loan_amount}
                    onChange={(e) => setRenewalData({ ...renewalData, new_loan_amount: Number(e.target.value) })}
                    className="block w-full pl-7 pr-12 border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Renewal Date</label>
                <input
                  type="date"
                  required
                  value={renewalData.renewal_date}
                  onChange={(e) => setRenewalData({ ...renewalData, renewal_date: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div className="mt-5 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => setShowRenewalModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Renew Loan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}