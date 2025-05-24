import React, { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { Download, Upload, FileSpreadsheet, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'
import { format } from 'date-fns'
import * as XLSX from 'xlsx'

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
}

interface DateRange {
  start: string
  end: string
}

interface ReportStats {
  totalLoans: number
  activeLoans: number
  settledLoans: number
  totalInvested: number
  totalEarned: number
  profit: number
  loanTypes: {
    [key: string]: {
      total: number
      active: number
      settled: number
      invested: number
      earned: number
    }
  }
}

export function Report() {
  const [entries, setEntries] = useState<Entry[]>([])
  const [dateRange, setDateRange] = useState<DateRange>({
    start: format(new Date(), 'dd-MM-yyyy'),
    end: format(new Date(), 'dd-MM-yyyy')
  })
  const [reportType, setReportType] = useState<'monthly' | 'yearly'>('monthly')
  const [customDateRange, setCustomDateRange] = useState<DateRange>({
    start: format(new Date(), 'dd-MM-yyyy'),
    end: format(new Date(), 'dd-MM-yyyy')
  })
  const [isCustomDate, setIsCustomDate] = useState(false)
  const [stats, setStats] = useState<ReportStats>({
    totalLoans: 0,
    activeLoans: 0,
    settledLoans: 0,
    totalInvested: 0,
    totalEarned: 0,
    profit: 0,
    loanTypes: {}
  })

  useEffect(() => {
    fetchEntries()
  }, [dateRange])

  const convertDateFormat = (date: string) => {
    // Convert dd-MM-yyyy to yyyy-MM-dd for database query
    const [day, month, year] = date.split('-')
    return `${year}-${month}-${day}`
  }

  const fetchEntries = async () => {
    try {
      const { data, error } = await supabase
        .from('entries')
        .select('*')
        .gte('date', convertDateFormat(isCustomDate ? customDateRange.start : dateRange.start))
        .lte('date', convertDateFormat(isCustomDate ? customDateRange.end : dateRange.end))
        .order('date', { ascending: false })

      if (error) throw error

      setEntries(data || [])
      calculateStats(data || [])
    } catch (error) {
      console.error('Error fetching entries:', error)
      toast.error('Failed to fetch report data')
    }
  }

  const calculateStats = (data: Entry[]) => {
    const stats = data.reduce((acc, entry) => {
      // Initialize loan type stats if not exists
      if (!acc.loanTypes[entry.type]) {
        acc.loanTypes[entry.type] = {
          total: 0,
          active: 0,
          settled: 0,
          invested: 0,
          earned: 0
        }
      }

      // Update overall stats
      acc.totalLoans++
      acc.totalInvested += entry.given_amount

      // Update loan type specific stats
      acc.loanTypes[entry.type].total++
      acc.loanTypes[entry.type].invested += entry.given_amount

      if (entry.status === 'active') {
        acc.activeLoans++
        acc.loanTypes[entry.type].active++
      } else if (entry.status === 'settled') {
        acc.settledLoans++
        acc.loanTypes[entry.type].settled++
        acc.totalEarned += entry.settled_amount || 0
        acc.loanTypes[entry.type].earned += entry.settled_amount || 0
      }

      return acc
    }, {
      totalLoans: 0,
      activeLoans: 0,
      settledLoans: 0,
      totalInvested: 0,
      totalEarned: 0,
      loanTypes: {}
    } as ReportStats)

    stats.profit = stats.totalEarned - stats.totalInvested
    setStats(stats)
  }

  const handleDateRangeChange = (type: 'monthly' | 'yearly' | 'custom') => {
    setIsCustomDate(type === 'custom')
    setReportType(type === 'custom' ? 'monthly' : type)
    
    const today = new Date()
    if (type === 'monthly') {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1)
      const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0)
      setDateRange({
        start: format(firstDay, 'dd-MM-yyyy'),
        end: format(lastDay, 'dd-MM-yyyy')
      })
    } else if (type === 'yearly') {
      const firstDay = new Date(today.getFullYear(), 0, 1)
      const lastDay = new Date(today.getFullYear(), 11, 31)
      setDateRange({
        start: format(firstDay, 'dd-MM-yyyy'),
        end: format(lastDay, 'dd-MM-yyyy')
      })
    }
  }

  const handleCustomDateChange = (field: 'start' | 'end', value: string) => {
    // Convert yyyy-MM-dd to dd-MM-yyyy
    const [year, month, day] = value.split('-')
    const formattedDate = `${day}-${month}-${year}`
    setCustomDateRange(prev => ({
      ...prev,
      [field]: formattedDate
    }))
  }

  // Convert dd-MM-yyyy to yyyy-MM-dd for input value
  const getInputDateValue = (date: string) => {
    const [day, month, year] = date.split('-')
    return `${year}-${month}-${day}`
  }

  const applyCustomDateRange = () => {
    const startDate = new Date(convertDateFormat(customDateRange.start))
    const endDate = new Date(convertDateFormat(customDateRange.end))
    
    if (startDate > endDate) {
      toast.error('Start date cannot be after end date')
      return
    }
    setDateRange(customDateRange)
    fetchEntries()
  }

  const exportToExcel = () => {
    const worksheet = XLSX.utils.json_to_sheet(entries.map(entry => ({
      Type: entry.type,
      Date: entry.date,
      'Customer Name': entry.customer_name,
      'Given Amount': entry.given_amount,
      Status: entry.status,
      'Settled Amount': entry.settled_amount || '',
      'Settled Date': entry.settled_date || ''
    })))

    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Loans')
    XLSX.writeFile(workbook, `loan-report-${format(new Date(), 'dd-MM-yyyy')}.xlsx`)
  }

  const exportToJSON = () => {
    const dataStr = JSON.stringify(entries, null, 2)
    const dataBlob = new Blob([dataStr], { type: 'application/json' })
    const url = URL.createObjectURL(dataBlob)
    const link = document.createElement('a')
    link.href = url
    link.download = `loan-data-${format(new Date(), 'dd-MM-yyyy')}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const validateImportData = (data: any[]): data is Entry[] => {
    return data.every(item => 
      typeof item === 'object' &&
      item !== null &&
      typeof item.type === 'string' &&
      ['NR', 'R', 'Vyapari'].includes(item.type) &&
      typeof item.date === 'string' &&
      typeof item.customer_name === 'string' &&
      typeof item.customer_address === 'string' &&
      (item.customer_mobile === null || typeof item.customer_mobile === 'string') &&
      typeof item.items === 'string' &&
      typeof item.given_amount === 'number' &&
      ['active', 'settled'].includes(item.status) &&
      (item.settled_amount === undefined || typeof item.settled_amount === 'number') &&
      (item.settled_date === undefined || typeof item.settled_date === 'string') &&
      (item.settlement_notes === undefined || item.settlement_notes === null || typeof item.settlement_notes === 'string')
    )
  }

  const importData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const data = JSON.parse(text)

      if (!Array.isArray(data)) {
        throw new Error('Imported data must be an array')
      }

      if (!validateImportData(data)) {
        throw new Error('Invalid data format: Some entries are missing required fields or have invalid values')
      }

      const { error } = await supabase
        .from('entries')
        .insert(data)

      if (error) throw error

      toast.success('Data imported successfully')
      fetchEntries()
    } catch (error) {
      console.error('Error importing data:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to import data')
    }

    // Reset file input
    event.target.value = ''
  }

  return (
    <div className="space-y-8">
      {/* Date Range Controls */}
      <div className="bg-white p-6 rounded-lg shadow space-y-4">
        <div className="flex items-center space-x-4">
          <Calendar className="h-5 w-5 text-gray-500" />
          <div className="space-x-2">
            <button
              onClick={() => handleDateRangeChange('monthly')}
              className={`px-4 py-2 rounded-md ${
                !isCustomDate && reportType === 'monthly'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => handleDateRangeChange('yearly')}
              className={`px-4 py-2 rounded-md ${
                !isCustomDate && reportType === 'yearly'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Yearly
            </button>
            <button
              onClick={() => handleDateRangeChange('custom')}
              className={`px-4 py-2 rounded-md ${
                isCustomDate
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Custom Range
            </button>
          </div>
        </div>

        {isCustomDate && (
          <div className="flex items-center space-x-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Start Date</label>
              <input
                type="date"
                value={getInputDateValue(customDateRange.start)}
                onChange={(e) => handleCustomDateChange('start', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">End Date</label>
              <input
                type="date"
                value={getInputDateValue(customDateRange.end)}
                onChange={(e) => handleCustomDateChange('end', e.target.value)}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
            <div className="self-end">
              <button
                onClick={applyCustomDateRange}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Apply
              </button>
            </div>
          </div>
        )}

        <div className="text-sm text-gray-500">
          Selected Range: {dateRange.start} - {dateRange.end}
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Overall Statistics</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Loans</span>
              <span className="font-medium">{stats.totalLoans}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Active Loans</span>
              <span className="font-medium text-blue-600">{stats.activeLoans}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Settled Loans</span>
              <span className="font-medium text-green-600">{stats.settledLoans}</span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Financial Overview</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Invested</span>
              <span className="font-medium">₹{stats.totalInvested}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Total Earned</span>
              <span className="font-medium">₹{stats.totalEarned}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Profit</span>
              <span className={`font-medium ${stats.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ₹{stats.profit}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Data Management</h3>
          <div className="space-y-4">
            <button
              onClick={exportToExcel}
              className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <FileSpreadsheet className="h-5 w-5 mr-2" />
              Export to Excel
            </button>
            <button
              onClick={exportToJSON}
              className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Download className="h-5 w-5 mr-2" />
              Export to JSON
            </button>
            <label className="w-full flex items-center justify-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
              <Upload className="h-5 w-5 mr-2" />
              Import JSON
              <input
                type="file"
                accept=".json"
                onChange={importData}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Loan Type Statistics */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Loan Type Statistics</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Loans</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Settled</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invested</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Earned</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Profit</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(stats.loanTypes).map(([type, data]) => (
                <tr key={type}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{type}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{data.total}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-blue-600">{data.active}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600">{data.settled}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{data.invested}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{data.earned}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={data.earned - data.invested >= 0 ? 'text-green-600' : 'text-red-600'}>
                      ₹{data.earned - data.invested}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Entries Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-4 py-5 sm:px-6">
          <h3 className="text-lg font-medium text-gray-900">Detailed Entries</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Settlement</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {entries.map((entry) => (
                <tr key={entry.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{entry.type}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{entry.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{entry.customer_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">₹{entry.given_amount}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      entry.status === 'active' 
                        ? 'bg-yellow-100 text-yellow-800' 
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {entry.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {entry.status === 'settled' ? (
                      <>₹{entry.settled_amount} on {entry.settled_date}</>
                    ) : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}