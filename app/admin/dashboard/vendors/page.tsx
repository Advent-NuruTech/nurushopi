"use client"

import { useCallback, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  collection,
  getDocs,
  updateDoc,
  doc,
  addDoc,
  deleteDoc,
  query,
  orderBy,
  Timestamp
} from "firebase/firestore"
import { db } from "@/lib/firebase"
import Image from "next/image"
import {
  Store,
  User,
  Mail,
  Phone,
  MapPin,
  Globe,
  FileText,
  Package,
  CheckCircle,
  XCircle,
  Clock,
  Shield,
  Building2,
  Church,
  Tag,
  CreditCard,
  Calendar,
  Users,
  Search,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit2,
  Trash2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  MoreVertical,
  RefreshCw,
  Ban,
  Check,
  Briefcase,
  Home,
  DollarSign,
  FileSignature,
  BookOpen
} from "lucide-react"

interface VendorApplication {
  id: string
  // Account Information
  email: string
  phone: string
  
  // Business Information
  businessName: string
  businessType: string
  denomination: string
  businessRegistrationNumber?: string
  
  // Contact Information
  ownerName: string
  
  // Location Information
  country: string
  county: string
  city: string
  address: string
  postalCode?: string
  
  // Business Details
  category: string
  description?: string
  yearEstablished?: string
  employeeCount?: string
  
  // Products
  products: string[]
  
  // Banking
  bankName?: string
  bankAccountName?: string
  bankAccountNumber?: string
  
  // Metadata
  status: "pending" | "approved" | "rejected"
  termsAgreed: boolean
  termsAgreedAt?: Timestamp
  createdAt: Timestamp
  applicationStep?: string
}

const toSafeString = (value: unknown) => typeof value === "string" ? value : ""

const toSafeProducts = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value.filter((product): product is string => typeof product === "string" && product.trim().length > 0)
}

const toSafeTimestamp = (value: unknown): Timestamp => {
  if (value && typeof value === "object" && "seconds" in (value as Record<string, unknown>)) {
    return value as Timestamp
  }
  return Timestamp.now()
}

const normalizeApplication = (id: string, raw: Record<string, unknown>): VendorApplication => ({
  id,
  email: toSafeString(raw.email),
  phone: toSafeString(raw.phone),
  businessName: toSafeString(raw.businessName),
  businessType: toSafeString(raw.businessType),
  denomination: toSafeString(raw.denomination),
  businessRegistrationNumber: toSafeString(raw.businessRegistrationNumber) || undefined,
  ownerName: toSafeString(raw.ownerName),
  country: toSafeString(raw.country),
  county: toSafeString(raw.county),
  city: toSafeString(raw.city),
  address: toSafeString(raw.address),
  postalCode: toSafeString(raw.postalCode) || undefined,
  category: toSafeString(raw.category),
  description: toSafeString(raw.description) || undefined,
  yearEstablished: toSafeString(raw.yearEstablished) || undefined,
  employeeCount: toSafeString(raw.employeeCount) || undefined,
  products: toSafeProducts(raw.products),
  bankName: toSafeString(raw.bankName) || undefined,
  bankAccountName: toSafeString(raw.bankAccountName) || undefined,
  bankAccountNumber: toSafeString(raw.bankAccountNumber) || undefined,
  status: raw.status === "approved" || raw.status === "rejected" ? raw.status : "pending",
  termsAgreed: Boolean(raw.termsAgreed),
  termsAgreedAt: raw.termsAgreedAt as Timestamp | undefined,
  createdAt: toSafeTimestamp(raw.createdAt),
  applicationStep: toSafeString(raw.applicationStep) || undefined
})

export default function AdminVendorsPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const applicationId = searchParams.get("applicationId")

  const [applications, setApplications] = useState<VendorApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [checkingAccess, setCheckingAccess] = useState(true)
  const [isSeniorAdmin, setIsSeniorAdmin] = useState(false)
  const [selectedApp, setSelectedApp] = useState<VendorApplication | null>(null)
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("pending")
  const [searchTerm, setSearchTerm] = useState("")
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [darkMode, setDarkMode] = useState(false)
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0
  })

  // Check for dark mode preference
  useEffect(() => {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    setDarkMode(isDark)
  }, [])

  useEffect(() => {
    let cancelled = false

    const verifyAdminAccess = async () => {
      try {
        const response = await fetch("/api/admin/me", { credentials: "include" })

        if (response.status === 401) {
          router.replace("/admin/login")
          return
        }

        const data = await response.json()
        const role = data?.admin?.role

        if (role !== "senior") {
          router.replace("/admin/dashboard")
          return
        }

        if (!cancelled) {
          setIsSeniorAdmin(true)
        }
      } catch (error) {
        console.error("Error verifying admin access:", error)
        router.replace("/admin/login")
      } finally {
        if (!cancelled) {
          setCheckingAccess(false)
        }
      }
    }

    verifyAdminAccess()
    return () => {
      cancelled = true
    }
  }, [router])

  const fetchApplications = useCallback(async () => {
    setLoading(true)
    try {
      const q = query(collection(db, "vendorApplications"), orderBy("createdAt", "desc"))
      const querySnapshot = await getDocs(q)
      const data = querySnapshot.docs.map((documentSnapshot) =>
        normalizeApplication(documentSnapshot.id, documentSnapshot.data() as Record<string, unknown>)
      )
      setApplications(data)

      if (applicationId) {
        const matched = data.find((application) => application.id === applicationId)
        if (matched) {
          setSelectedApp(matched)
          setExpandedId(matched.id)
        }
      }
      
      // Calculate stats
      const newStats = {
        total: data.length,
        pending: data.filter(app => app.status === "pending").length,
        approved: data.filter(app => app.status === "approved").length,
        rejected: data.filter(app => app.status === "rejected").length
      }
      setStats(newStats)
    } catch (error) {
      console.error("Error fetching applications:", error)
    } finally {
      setLoading(false)
    }
  }, [applicationId])

  useEffect(() => {
    if (!isSeniorAdmin) return
    fetchApplications()
  }, [isSeniorAdmin, fetchApplications])

  const approveVendor = async (application: VendorApplication) => {
    try {
      // Move to vendors collection
      await addDoc(collection(db, "vendors"), {
        businessName: application.businessName,
        ownerName: application.ownerName,
        email: application.email,
        phone: application.phone,
        businessType: application.businessType,
        denomination: application.denomination,
        category: application.category,
        products: application.products,
        location: {
          country: application.country,
          county: application.county,
          city: application.city,
          address: application.address
        },
        verified: true,
        joinedAt: new Date(),
        approvedBy: "admin",
        approvedAt: new Date()
      })

      // Update status
      await updateDoc(doc(db, "vendorApplications", application.id), {
        status: "approved",
        approvedAt: new Date()
      })

      fetchApplications()
      setSelectedApp(null)
    } catch (error) {
      console.error("Error approving vendor:", error)
    }
  }

  const rejectVendor = async (id: string, reason?: string) => {
    try {
      await updateDoc(doc(db, "vendorApplications", id), {
        status: "rejected",
        rejectedAt: new Date(),
        rejectionReason: reason || "Not specified"
      })
      fetchApplications()
      setShowDeleteConfirm(null)
    } catch (error) {
      console.error("Error rejecting vendor:", error)
    }
  }

  const deleteApplication = async (id: string) => {
    try {
      await deleteDoc(doc(db, "vendorApplications", id))
      fetchApplications()
      setShowDeleteConfirm(null)
    } catch (error) {
      console.error("Error deleting application:", error)
    }
  }

  const filteredApplications = applications.filter(app => {
    const matchesFilter = filter === "all" || app.status === filter
    const matchesSearch = 
      app.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      app.phone.includes(searchTerm) ||
      app.category.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesFilter && matchesSearch
  })

  const getStatusBadge = (status: string) => {
    switch(status) {
      case "approved":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </span>
        )
      case "rejected":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </span>
        )
    }
  }

  const formatDate = (timestamp?: Timestamp) => {
    if (!timestamp) return "N/A"
    return new Date(timestamp.seconds * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const DetailCard = ({ application }: { application: VendorApplication }) => (
    <div className={`fixed inset-0 z-50 overflow-y-auto ${darkMode ? 'dark' : ''}`}>
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75 dark:bg-gray-900 opacity-90"></div>
        </div>

        <div className={`inline-block align-bottom rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full ${
          darkMode ? 'bg-gray-800' : 'bg-white'
        }`}>
          <div className={`px-6 py-4 border-b ${
            darkMode ? 'border-gray-700' : 'border-gray-200'
          } flex justify-between items-center`}>
            <h3 className={`text-lg font-medium ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              Vendor Application Details
            </h3>
            <button
              onClick={() => setSelectedApp(null)}
              className={`p-2 rounded-lg transition-colors ${
                darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500'
              }`}
            >
              <XCircle className="h-5 w-5" />
            </button>
          </div>

          <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
            <div className="space-y-6">
              {/* Status Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {getStatusBadge(application.status)}
                  <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                    Applied: {formatDate(application.createdAt)}
                  </span>
                </div>
                {application.status === "pending" && (
                  <div className="flex space-x-2">
                    <button
                      onClick={() => approveVendor(application)}
                      className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                    >
                      <Check className="w-4 h-4 mr-2" />
                      Approve
                    </button>
                    <button
                      onClick={() => rejectVendor(application.id)}
                      className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                      <XCircle className="w-4 h-4 mr-2" />
                      Reject
                    </button>
                  </div>
                )}
              </div>

              {/* Account Information */}
              <div className={`p-4 rounded-lg ${
                darkMode ? 'bg-gray-700/50' : 'bg-gray-50'
              }`}>
                <h4 className={`text-sm font-medium mb-3 flex items-center ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  <Mail className="h-4 w-4 mr-2" />
                  Account Information
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Email</p>
                    <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {application.email}
                    </p>
                  </div>
                  <div>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Phone</p>
                    <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {application.phone}
                    </p>
                  </div>
                </div>
              </div>

              {/* Business Information */}
              <div className={`p-4 rounded-lg ${
                darkMode ? 'bg-gray-700/50' : 'bg-gray-50'
              }`}>
                <h4 className={`text-sm font-medium mb-3 flex items-center ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  <Building2 className="h-4 w-4 mr-2" />
                  Business Information
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Business Name</p>
                    <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {application.businessName}
                    </p>
                  </div>
                  <div>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Business Type</p>
                    <p className={`font-medium capitalize ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {application.businessType}
                    </p>
                  </div>
                  <div>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Denomination</p>
                    <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {application.denomination}
                    </p>
                  </div>
                  {application.businessRegistrationNumber && (
                    <div>
                      <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Registration Number</p>
                      <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {application.businessRegistrationNumber}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Owner Information */}
              <div className={`p-4 rounded-lg ${
                darkMode ? 'bg-gray-700/50' : 'bg-gray-50'
              }`}>
                <h4 className={`text-sm font-medium mb-3 flex items-center ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  <User className="h-4 w-4 mr-2" />
                  Owner Information
                </h4>
                <div>
                  <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Owner Name</p>
                  <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {application.ownerName}
                  </p>
                </div>
              </div>

              {/* Location Information */}
              <div className={`p-4 rounded-lg ${
                darkMode ? 'bg-gray-700/50' : 'bg-gray-50'
              }`}>
                <h4 className={`text-sm font-medium mb-3 flex items-center ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  <MapPin className="h-4 w-4 mr-2" />
                  Location
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Country</p>
                    <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {application.country}
                    </p>
                  </div>
                  <div>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>County/State</p>
                    <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {application.county}
                    </p>
                  </div>
                  <div>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>City/Town</p>
                    <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {application.city}
                    </p>
                  </div>
                  <div>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Address</p>
                    <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {application.address}
                    </p>
                  </div>
                  {application.postalCode && (
                    <div>
                      <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Postal Code</p>
                      <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {application.postalCode}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Products & Category */}
              <div className={`p-4 rounded-lg ${
                darkMode ? 'bg-gray-700/50' : 'bg-gray-50'
              }`}>
                <h4 className={`text-sm font-medium mb-3 flex items-center ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  <Package className="h-4 w-4 mr-2" />
                  Products & Category
                </h4>
                <div className="space-y-3">
                  <div>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Category</p>
                    <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {application.category}
                    </p>
                  </div>
                  <div>
                    <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Products</p>
                    <ul className={`list-disc list-inside ${
                      darkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {(application.products ?? []).map((product, index) => (
                        <li key={index}>{product}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Additional Information */}
              {(application.description || application.yearEstablished || application.employeeCount) && (
                <div className={`p-4 rounded-lg ${
                  darkMode ? 'bg-gray-700/50' : 'bg-gray-50'
                }`}>
                  <h4 className={`text-sm font-medium mb-3 flex items-center ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    <FileText className="h-4 w-4 mr-2" />
                    Additional Information
                  </h4>
                  <div className="space-y-3">
                    {application.description && (
                      <div>
                        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Description</p>
                        <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {application.description}
                        </p>
                      </div>
                    )}
                    {application.yearEstablished && (
                      <div>
                        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Year Established</p>
                        <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {application.yearEstablished}
                        </p>
                      </div>
                    )}
                    {application.employeeCount && (
                      <div>
                        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Employees</p>
                        <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {application.employeeCount}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Banking Information */}
              {(application.bankName || application.bankAccountName || application.bankAccountNumber) && (
                <div className={`p-4 rounded-lg ${
                  darkMode ? 'bg-gray-700/50' : 'bg-gray-50'
                }`}>
                  <h4 className={`text-sm font-medium mb-3 flex items-center ${
                    darkMode ? 'text-gray-300' : 'text-gray-700'
                  }`}>
                    <CreditCard className="h-4 w-4 mr-2" />
                    Banking Information
                  </h4>
                  <div className="grid grid-cols-2 gap-4">
                    {application.bankName && (
                      <div>
                        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Bank Name</p>
                        <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {application.bankName}
                        </p>
                      </div>
                    )}
                    {application.bankAccountName && (
                      <div>
                        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Account Name</p>
                        <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {application.bankAccountName}
                        </p>
                      </div>
                    )}
                    {application.bankAccountNumber && (
                      <div>
                        <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Account Number</p>
                        <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                          {application.bankAccountNumber}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Terms Agreement */}
              <div className={`p-4 rounded-lg ${
                darkMode ? 'bg-gray-700/50' : 'bg-gray-50'
              }`}>
                <h4 className={`text-sm font-medium mb-3 flex items-center ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  <FileSignature className="h-4 w-4 mr-2" />
                  Terms Agreement
                </h4>
                <div>
                  <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Agreed at</p>
                  <p className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    {formatDate(application.termsAgreedAt)}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  if (checkingAccess) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        darkMode ? 'bg-gray-900' : 'bg-gray-50'
      }`}>
        <Loader2 className={`h-8 w-8 animate-spin ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
      </div>
    )
  }

  if (!isSeniorAdmin) {
    return null
  }

  return (
    <div className={`min-h-screen transition-colors ${
      darkMode ? 'bg-gray-900' : 'bg-gray-50'
    }`}>
      {/* Header */}
      <div className={`sticky top-0 z-10 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-b`}>
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="relative w-10 h-10">
                <Image
                  src="/assets/logo.jpg"
                  alt="NuruShop"
                  fill
                  className="object-contain"
                />
              </div>
              <div>
                <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Vendor Applications
                </h1>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  Manage and review vendor registration requests
                </p>
              </div>
            </div>
            <button
              onClick={fetchApplications}
              className={`p-2 rounded-lg transition-colors ${
                darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
              }`}
            >
              <RefreshCw className={`h-5 w-5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="px-6 py-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Applications', value: stats.total, icon: FileText, color: 'blue' },
          { label: 'Pending Review', value: stats.pending, icon: Clock, color: 'yellow' },
          { label: 'Approved', value: stats.approved, icon: CheckCircle, color: 'green' },
          { label: 'Rejected', value: stats.rejected, icon: XCircle, color: 'red' }
        ].map((stat, index) => (
          <div key={index} className={`p-6 rounded-lg ${
            darkMode ? 'bg-gray-800' : 'bg-white'
          } shadow-sm`}>
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{stat.label}</p>
                <p className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {stat.value}
                </p>
              </div>
              <div className={`p-3 rounded-full bg-${stat.color}-100 dark:bg-${stat.color}-900/30`}>
                <stat.icon className={`h-6 w-6 text-${stat.color}-600 dark:text-${stat.color}-400`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters and Search */}
      <div className="px-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
          <div className="flex space-x-2">
            {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${
                  filter === status
                    ? darkMode
                      ? 'bg-blue-600 text-white'
                      : 'bg-blue-600 text-white'
                    : darkMode
                      ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                      : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-2">
            <div className="relative">
              <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 ${
                darkMode ? 'text-gray-500' : 'text-gray-400'
              }`} />
              <input
                type="text"
                placeholder="Search applications..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={`pl-10 pr-4 py-2 rounded-lg border focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  darkMode
                    ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500'
                    : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400'
                }`}
              />
            </div>
            <button
              className={`p-2 rounded-lg border ${
                darkMode
                  ? 'border-gray-700 hover:bg-gray-800 text-gray-400'
                  : 'border-gray-300 hover:bg-gray-50 text-gray-600'
              }`}
            >
              <Download className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Applications List */}
      <div className="px-6 pb-6">
        {loading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className={`h-8 w-8 animate-spin ${
              darkMode ? 'text-blue-400' : 'text-blue-600'
            }`} />
          </div>
        ) : filteredApplications.length === 0 ? (
          <div className={`text-center py-12 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
            <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No applications found</p>
            <p className="text-sm">Try adjusting your filters or search term</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredApplications.map((app) => (
              <div
                key={app.id}
                className={`rounded-lg shadow-sm overflow-hidden ${
                  darkMode ? 'bg-gray-800' : 'bg-white'
                }`}
              >
                {/* Application Header */}
                <div className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className={`text-lg font-semibold ${
                          darkMode ? 'text-white' : 'text-gray-900'
                        }`}>
                          {app.businessName}
                        </h3>
                        {getStatusBadge(app.status)}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                        <div className="flex items-center space-x-2">
                          <User className={`h-4 w-4 ${
                            darkMode ? 'text-gray-500' : 'text-gray-400'
                          }`} />
                          <span className={`text-sm ${
                            darkMode ? 'text-gray-300' : 'text-gray-600'
                          }`}>
                            {app.ownerName}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Mail className={`h-4 w-4 ${
                            darkMode ? 'text-gray-500' : 'text-gray-400'
                          }`} />
                          <span className={`text-sm ${
                            darkMode ? 'text-gray-300' : 'text-gray-600'
                          }`}>
                            {app.email}
                          </span>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Phone className={`h-4 w-4 ${
                            darkMode ? 'text-gray-500' : 'text-gray-400'
                          }`} />
                          <span className={`text-sm ${
                            darkMode ? 'text-gray-300' : 'text-gray-600'
                          }`}>
                            {app.phone}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Building2 className={`h-4 w-4 ${
                            darkMode ? 'text-gray-500' : 'text-gray-400'
                          }`} />
                          <span className={`text-sm capitalize ${
                            darkMode ? 'text-gray-300' : 'text-gray-600'
                          }`}>
                            {app.businessType}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Church className={`h-4 w-4 ${
                            darkMode ? 'text-gray-500' : 'text-gray-400'
                          }`} />
                          <span className={`text-sm ${
                            darkMode ? 'text-gray-300' : 'text-gray-600'
                          }`}>
                            {app.denomination}
                          </span>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Package className={`h-4 w-4 ${
                            darkMode ? 'text-gray-500' : 'text-gray-400'
                          }`} />
                          <span className={`text-sm ${
                            darkMode ? 'text-gray-300' : 'text-gray-600'
                          }`}>
                            {app.products?.length ?? 0} products
                          </span>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center space-x-4">
                        <span className={`text-xs ${
                          darkMode ? 'text-gray-500' : 'text-gray-400'
                        }`}>
                          Applied: {formatDate(app.createdAt)}
                        </span>
                        {app.category && (
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            darkMode
                              ? 'bg-gray-700 text-gray-300'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {app.category}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center space-x-2 ml-4">
                      <button
                        onClick={() => setSelectedApp(app)}
                        className={`p-2 rounded-lg transition-colors ${
                          darkMode
                            ? 'hover:bg-gray-700 text-gray-400'
                            : 'hover:bg-gray-100 text-gray-600'
                        }`}
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                      
                      {app.status === "pending" && (
                        <>
                          <button
                            onClick={() => approveVendor(app)}
                            className={`p-2 rounded-lg transition-colors ${
                              darkMode
                                ? 'hover:bg-green-900/30 text-green-400'
                                : 'hover:bg-green-100 text-green-600'
                            }`}
                          >
                            <Check className="h-5 w-5" />
                          </button>
                          
                          <button
                            onClick={() => setShowDeleteConfirm(app.id)}
                            className={`p-2 rounded-lg transition-colors ${
                              darkMode
                                ? 'hover:bg-red-900/30 text-red-400'
                                : 'hover:bg-red-100 text-red-600'
                            }`}
                          >
                            <XCircle className="h-5 w-5" />
                          </button>
                        </>
                      )}
                      
                      <button
                        onClick={() => setExpandedId(expandedId === app.id ? null : app.id)}
                        className={`p-2 rounded-lg transition-colors ${
                          darkMode
                            ? 'hover:bg-gray-700 text-gray-400'
                            : 'hover:bg-gray-100 text-gray-600'
                        }`}
                      >
                        {expandedId === app.id ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Delete Confirmation */}
                  {showDeleteConfirm === app.id && (
                    <div className={`mt-4 p-4 rounded-lg ${
                      darkMode ? 'bg-red-900/20' : 'bg-red-50'
                    }`}>
                      <p className={`text-sm mb-3 ${
                        darkMode ? 'text-red-300' : 'text-red-700'
                      }`}>
                        Are you sure you want to reject this application?
                      </p>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => rejectVendor(app.id)}
                          className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
                        >
                          Confirm Reject
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(null)}
                          className={`px-3 py-1.5 rounded-lg text-sm ${
                            darkMode
                              ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                              : 'bg-white text-gray-600 hover:bg-gray-50'
                          }`}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Expanded Products */}
                  {expandedId === app.id && (
                    <div className={`mt-4 pt-4 border-t ${
                      darkMode ? 'border-gray-700' : 'border-gray-200'
                    }`}>
                      <h4 className={`text-sm font-medium mb-2 ${
                        darkMode ? 'text-gray-300' : 'text-gray-700'
                      }`}>
                        Products:
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {(app.products ?? []).map((product, index) => (
                          <span
                            key={index}
                            className={`px-2 py-1 rounded-full text-xs ${
                              darkMode
                                ? 'bg-gray-700 text-gray-300'
                                : 'bg-gray-100 text-gray-600'
                            }`}
                          >
                            {product}
                          </span>
                        ))}
                      </div>
                      
                      {app.description && (
                        <div className="mt-3">
                          <h4 className={`text-sm font-medium mb-1 ${
                            darkMode ? 'text-gray-300' : 'text-gray-700'
                          }`}>
                            Description:
                          </h4>
                          <p className={`text-sm ${
                            darkMode ? 'text-gray-400' : 'text-gray-500'
                          }`}>
                            {app.description}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedApp && <DetailCard application={selectedApp} />}
    </div>
  )
}

// Loader2 component for spinner
function Loader2({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  )
}
