"use client"

import { useState, useEffect } from "react"
import { addDoc, collection, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { notifySeniorAdmins } from "@/lib/notifications"
import Image from "next/image"
import { useRouter } from "next/navigation"
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
  AlertCircle,
  Loader2,
  Tag,
  Building2,
  Church,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit2,
  Clock,
  Shield,
  CreditCard,
  X
} from "lucide-react"

// Types for form data
interface FormData {
  // Account Information
  email: string
  phone: string
  
  // Business Information
  businessName: string
  businessType: string
  denomination: string
  businessRegistrationNumber: string
  
  // Contact Information
  ownerName: string
  
  // Location Information
  country: string
  county: string
  city: string
  address: string
  postalCode: string
  
  // Business Details
  category: string
  description: string
  yearEstablished: string
  employeeCount: string
  
  // Products
  products: string[]
  
  // Banking (Optional)
  bankName: string
  bankAccountName: string
  bankAccountNumber: string
  
  // Legal
  termsAgreed: boolean
}

export default function VendorForm() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [darkMode, setDarkMode] = useState(false)
  
  // Check for dark mode preference
  useEffect(() => {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    setDarkMode(isDark)
  }, [])

  // Form data state
  const [formData, setFormData] = useState<FormData>({
    email: "",
    phone: "",
    businessName: "",
    businessType: "",
    denomination: "",
    businessRegistrationNumber: "",
    ownerName: "",
    country: "Kenya",
    county: "",
    city: "",
    address: "",
    postalCode: "",
    category: "",
    description: "",
    yearEstablished: "",
    employeeCount: "",
    products: [""],
    bankName: "",
    bankAccountName: "",
    bankAccountNumber: "",
    termsAgreed: false
  })

  const [products, setProducts] = useState([""])

  // Church denominations list (comprehensive)
  const denominations = [
    "African Inland Church",
    "Anglican",
    "Baptist",
    "Catholic",
    "Christian Revival Church",
    "Evangelical",
    "Full Gospel",
    "Interdenominational",
    "Lutheran",
    "Methodist",
    "Orthodox",
    "Pentecostal",
    "Presbyterian",
    "Salvation Army",
    "Seventh-day Adventist",
    "Other Christian",
    "Muslim",
    "Hindu",
    "Buddhist",
    "Traditional African",
    "Other Faith",
    "Prefer not to say"
  ]

  // Employee count ranges
  const employeeRanges = [
    "1-5 employees",
    "6-10 employees",
    "11-25 employees",
    "26-50 employees",
    "51-100 employees",
    "100+ employees"
  ]

  // Business type options for dropdown
  const businessTypes = [
    { value: "wholesale", label: "Wholesale" },
    { value: "retail", label: "Retail" },
    { value: "both", label: "Both Wholesale & Retail" }
  ]

  // Redirect after success
  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => {
        router.push("/")
      }, 10000)
      return () => clearTimeout(timer)
    }
  }, [success, router])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleProductChange = (index: number, value: string) => {
    const newProducts = [...products]
    newProducts[index] = value
    setProducts(newProducts)
    setFormData(prev => ({ ...prev, products: newProducts }))
  }

  const handleAddProduct = () => {
    setProducts([...products, ""])
  }

  const handleRemoveProduct = (index: number) => {
    if (products.length > 1) {
      const newProducts = products.filter((_, i) => i !== index)
      setProducts(newProducts)
      setFormData(prev => ({ ...prev, products: newProducts }))
    }
  }

  const nextStep = () => {
    if (validateCurrentStep()) {
      setCurrentStep(prev => prev + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const prevStep = () => {
    setCurrentStep(prev => prev - 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const validateCurrentStep = () => {
    switch(currentStep) {
      case 1: // Account
        return formData.email && formData.phone
      case 2: // Business Info
        return formData.businessName && formData.businessType && formData.denomination
      case 3: // Owner Info
        return formData.ownerName
      case 4: // Location
        return formData.country && formData.county && formData.city && formData.address
      case 5: // Products & Category
        return formData.category && products.some(p => p.trim() !== "")
      case 6: // Additional Info
        return true // Optional fields
      default:
        return true
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!agreedToTerms) {
      alert("Please agree to the terms and conditions")
      return
    }

    setSubmitting(true)

    try {
      // Simulate API call for demo (remove in production)
      await new Promise(resolve => setTimeout(resolve, 2000))
      
      const applicationRef = await addDoc(collection(db, "vendorApplications"), {
        ...formData,
        products: products.filter(p => p.trim() !== ""),
        status: "pending",
        termsAgreed: true,
        termsAgreedAt: serverTimestamp(),
        createdAt: serverTimestamp(),
        applicationStep: "completed"
      })

      try {
        const vendorName = formData.businessName || formData.ownerName || "A vendor"
        await notifySeniorAdmins({
          title: "New vendor application",
          body: `${vendorName} submitted a new vendor application.`,
          type: "vendor_application",
          relatedId: applicationRef.id
        })
      } catch (notificationError) {
        console.error("Error notifying senior admins about vendor application:", notificationError)
      }

      setSubmitting(false)
      setSuccess(true)
    } catch (error) {
      console.error("Error submitting application:", error)
      setSubmitting(false)
      alert("There was an error submitting your application. Please try again.")
    }
  }

  // Submitting overlay
  if (submitting) {
    return (
      <div className={`min-h-screen ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-b from-blue-50 to-white'} flex items-center justify-center p-4`}>
        <div className="text-center max-w-md mx-auto">
          <div className="relative w-32 h-32 mx-auto mb-6">
            <Image
              src="/assets/logo.jpg"
              alt="NuruShop"
              fill
              className="object-contain animate-pulse"
              priority
            />
          </div>
          <div className="mb-4 flex justify-center">
            <Loader2 className={`h-12 w-12 animate-spin ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
          </div>
          <h2 className={`text-2xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Submitting Your Application
          </h2>
          <p className={`text-lg ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Please wait while we process your information...
          </p>
          <div className="mt-6 space-y-2">
            <div className={`h-2 ${darkMode ? 'bg-gray-700' : 'bg-gray-200'} rounded-full overflow-hidden`}>
              <div className="h-full bg-blue-600 rounded-full animate-progress" style={{ width: '60%' }}></div>
            </div>
            <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              This may take a few moments
            </p>
          </div>
        </div>
      </div>
    )
  }

  const renderStepIndicator = () => {
    const steps = [
      { number: 1, title: "Account", icon: Mail },
      { number: 2, title: "Business", icon: Building2 },
      { number: 3, title: "Owner", icon: User },
      { number: 4, title: "Location", icon: MapPin },
      { number: 5, title: "Products", icon: Package },
      { number: 6, title: "Details", icon: FileText },
      { number: 7, title: "Review", icon: Eye }
    ]

    return (
      <div className="mb-8 overflow-x-auto pb-2">
        <div className="flex justify-between items-center min-w-[700px]">
          {steps.map((step, index) => (
            <div key={step.number} className="flex-1 relative">
              {index < steps.length - 1 && (
                <div className={`absolute top-5 left-1/2 w-full h-1 ${
                  step.number < currentStep 
                    ? darkMode ? 'bg-blue-500' : 'bg-blue-500'
                    : darkMode ? 'bg-gray-700' : 'bg-gray-200'
                }`} />
              )}
              <div className="relative flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 z-10 transition-all ${
                  darkMode 
                    ? step.number === currentStep
                      ? "border-blue-400 bg-gray-800 text-blue-400"
                      : step.number < currentStep
                      ? "border-blue-500 bg-blue-500 text-white"
                      : "border-gray-600 bg-gray-800 text-gray-500"
                    : step.number === currentStep
                      ? "border-blue-500 bg-white text-blue-500"
                      : step.number < currentStep
                      ? "border-blue-500 bg-blue-500 text-white"
                      : "border-gray-300 bg-white text-gray-300"
                }`}>
                  <step.icon className="h-5 w-5" />
                </div>
                <span className={`text-xs mt-2 ${
                  darkMode
                    ? step.number === currentStep 
                      ? "text-blue-400 font-medium" 
                      : "text-gray-400"
                    : step.number === currentStep 
                      ? "text-blue-600 font-medium" 
                      : "text-gray-500"
                }`}>
                  {step.title}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const renderStep = () => {
    const inputClasses = `w-full px-4 py-3 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
      darkMode 
        ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' 
        : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
    } border`

    const labelClasses = `block text-sm font-medium mb-2 ${
      darkMode ? 'text-gray-300' : 'text-gray-700'
    }`

    const iconClasses = `absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 ${
      darkMode ? 'text-gray-500' : 'text-gray-400'
    }`

    switch(currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Create Your Account</h2>
            <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Start by providing your contact information</p>
            
            <div className="space-y-4">
              <div>
                <label className={labelClasses}>
                  Email Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Mail className={iconClasses} />
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    placeholder="you@example.com"
                    required
                    className={inputClasses + " pl-10"}
                  />
                </div>
              </div>

              <div>
                <label className={labelClasses}>
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className={iconClasses} />
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    placeholder="+254 700 000000"
                    required
                    className={inputClasses + " pl-10"}
                  />
                </div>
              </div>
            </div>

            <div className={`p-4 rounded-lg ${darkMode ? 'bg-blue-900/30' : 'bg-blue-50'}`}>
              <p className={`text-sm flex items-center ${darkMode ? 'text-blue-300' : 'text-blue-700'}`}>
                <Shield className="h-4 w-4 mr-2 flex-shrink-0" />
                Your information is secure and will only be used for vendor verification
              </p>
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-6">
            <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Business Information</h2>
            <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Tell us about your business</p>
            
            <div className="space-y-4">
              <div>
                <label className={labelClasses}>
                  Business Name <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Store className={iconClasses} />
                  <input
                    type="text"
                    name="businessName"
                    value={formData.businessName}
                    onChange={handleInputChange}
                    placeholder="Your Business Name"
                    required
                    className={inputClasses + " pl-10"}
                  />
                </div>
              </div>

              <div>
                <label className={labelClasses}>
                  Business Type <span className="text-red-500">*</span>
                </label>
                <select
                  name="businessType"
                  value={formData.businessType}
                  onChange={handleInputChange}
                  required
                  className={inputClasses}
                >
                  <option value="">Select business type</option>
                  {businessTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelClasses}>
                  Denomination / Faith <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Church className={iconClasses} />
                  <select
                    name="denomination"
                    value={formData.denomination}
                    onChange={handleInputChange}
                    required
                    className={inputClasses + " pl-10"}
                  >
                    <option value="">Select Denomination / Faith</option>
                    {denominations.map(denom => (
                      <option key={denom} value={denom}>{denom}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelClasses}>
                  Business Registration Number (Optional)
                </label>
                <div className="relative">
                  <Tag className={iconClasses} />
                  <input
                    type="text"
                    name="businessRegistrationNumber"
                    value={formData.businessRegistrationNumber}
                    onChange={handleInputChange}
                    placeholder="e.g., BRN-2024-001"
                    className={inputClasses + " pl-10"}
                  />
                </div>
              </div>
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-6">
            <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Owner Information</h2>
            <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Tell us about the business owner</p>
            
            <div>
              <label className={labelClasses}>
                Full Name <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className={iconClasses} />
                <input
                  type="text"
                  name="ownerName"
                  value={formData.ownerName}
                  onChange={handleInputChange}
                  placeholder="Enter owner's full name"
                  required
                  className={inputClasses + " pl-10"}
                />
              </div>
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-6">
            <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Business Location</h2>
            <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Where is your business located?</p>
            
            <div className="space-y-4">
              <div>
                <label className={labelClasses}>
                  Country <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Globe className={iconClasses} />
                  <input
                    type="text"
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    placeholder="Kenya"
                    required
                    className={inputClasses + " pl-10"}
                  />
                </div>
              </div>

              <div>
                <label className={labelClasses}>
                  County / State <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className={iconClasses} />
                  <input
                    type="text"
                    name="county"
                    value={formData.county}
                    onChange={handleInputChange}
                    placeholder="Nairobi"
                    required
                    className={inputClasses + " pl-10"}
                  />
                </div>
              </div>

              <div>
                <label className={labelClasses}>
                  City / Town <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className={iconClasses} />
                  <input
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    placeholder="Nairobi CBD"
                    required
                    className={inputClasses + " pl-10"}
                  />
                </div>
              </div>

              <div>
                <label className={labelClasses}>
                  Street Address <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <MapPin className={iconClasses} />
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    placeholder="Moi Avenue, Suite 45"
                    required
                    className={inputClasses + " pl-10"}
                  />
                </div>
              </div>

              <div>
                <label className={labelClasses}>
                  Postal Code (Optional)
                </label>
                <input
                  type="text"
                  name="postalCode"
                  value={formData.postalCode}
                  onChange={handleInputChange}
                  placeholder="00100"
                  className={inputClasses}
                />
              </div>
            </div>
          </div>
        )

      case 5:
        return (
          <div className="space-y-6">
            <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Products & Category</h2>
            <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>What will you be selling?</p>
            
            <div className="space-y-4">
              <div>
                <label className={labelClasses}>
                  Business Category <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={handleInputChange}
                  placeholder="e.g., farm produce, herbal remedies , oils ,..."
                  required
                  className={inputClasses}
                />
              </div>

              <div>
                <label className={labelClasses}>
                 Examples of Products You&apos;ll Sell e <span className="text-red-500">*</span>
                </label>
                {products.map((product, index) => (
                  <div key={index} className="flex gap-2 mb-2">
                    <div className="relative flex-1">
                      <Package className={iconClasses} />
                      <input
                        value={product}
                        onChange={(e) => handleProductChange(index, e.target.value)}
                        placeholder={`Product ${index + 1}`}
                        required
                        className={inputClasses + " pl-10"}
                      />
                    </div>
                    {products.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveProduct(index)}
                        className={`px-3 py-2 rounded-lg transition-colors ${
                          darkMode 
                            ? 'text-red-400 hover:bg-red-900/30' 
                            : 'text-red-500 hover:bg-red-50'
                        }`}
                      >
                        <X className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                ))}
                
                <button
                  type="button"
                  onClick={handleAddProduct}
                  className={`mt-2 font-medium flex items-center ${
                    darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                  }`}
                >
                  + Add another product
                </button>
              </div>
            </div>
          </div>
        )

      case 6:
        return (
          <div className="space-y-6">
            <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Additional Information</h2>
            <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Help us understand your business better</p>
            
            <div className="space-y-4">
              <div>
                <label className={labelClasses}>
                  Business Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  placeholder="Describe your business, what makes you unique, and your experience..."
                  rows={4}
                  className={inputClasses}
                />
              </div>

              <div>
                <label className={labelClasses}>
                  Year Established
                </label>
                <input
                  type="text"
                  name="yearEstablished"
                  value={formData.yearEstablished}
                  onChange={handleInputChange}
                  placeholder="e.g., 2020"
                  className={inputClasses}
                />
              </div>

              <div>
                <label className={labelClasses}>
                  Number of Employees
                </label>
                <select
                  name="employeeCount"
                  value={formData.employeeCount}
                  onChange={handleInputChange}
                  className={inputClasses}
                >
                  <option value="">Select range</option>
                  {employeeRanges.map(range => (
                    <option key={range} value={range}>{range}</option>
                  ))}
                </select>
              </div>

              <div className={`pt-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <h3 className={`text-lg font-medium mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Banking Information (Optional)
                </h3>
                <p className={`text-sm mb-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  For future payment processing
                </p>
                
                <div className="space-y-4">
                  <input
                    type="text"
                    name="bankName"
                    value={formData.bankName}
                    onChange={handleInputChange}
                    placeholder="Bank Name"
                    className={inputClasses}
                  />
                  
                  <input
                    type="text"
                    name="bankAccountName"
                    value={formData.bankAccountName}
                    onChange={handleInputChange}
                    placeholder="Account Name"
                    className={inputClasses}
                  />
                  
                  <input
                    type="text"
                    name="bankAccountNumber"
                    value={formData.bankAccountNumber}
                    onChange={handleInputChange}
                    placeholder="Account Number"
                    className={inputClasses}
                  />
                </div>
              </div>
            </div>
          </div>
        )

      case 7:
        return (
          <div className="space-y-6">
            <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>Review Your Information</h2>
            <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>Please verify all details before submitting</p>
            
            <div className={`rounded-lg p-6 space-y-6 ${
              darkMode ? 'bg-gray-800' : 'bg-gray-50'
            }`}>
              {/* Account Info */}
              <div>
                <h3 className={`text-lg font-medium mb-2 flex items-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  <Mail className={`h-5 w-5 mr-2 ${darkMode ? 'text-blue-400' : 'text-blue-500'}`} />
                  Account Information
                </h3>
                <div className="grid grid-cols-2 gap-4 ml-7">
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Email</p>
                    <p className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                      {formData.email || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Phone</p>
                    <p className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                      {formData.phone || "Not provided"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Business Info */}
              <div>
                <h3 className={`text-lg font-medium mb-2 flex items-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  <Building2 className={`h-5 w-5 mr-2 ${darkMode ? 'text-blue-400' : 'text-blue-500'}`} />
                  Business Information
                </h3>
                <div className="grid grid-cols-2 gap-4 ml-7">
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Business Name</p>
                    <p className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                      {formData.businessName || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Business Type</p>
                    <p className={`font-medium capitalize ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                      {formData.businessType || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Denomination</p>
                    <p className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                      {formData.denomination || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Registration Number</p>
                    <p className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                      {formData.businessRegistrationNumber || "Not provided"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Owner Info */}
              <div>
                <h3 className={`text-lg font-medium mb-2 flex items-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  <User className={`h-5 w-5 mr-2 ${darkMode ? 'text-blue-400' : 'text-blue-500'}`} />
                  Owner Information
                </h3>
                <div className="ml-7">
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Owner Name</p>
                  <p className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                    {formData.ownerName || "Not provided"}
                  </p>
                </div>
              </div>

              {/* Location */}
              <div>
                <h3 className={`text-lg font-medium mb-2 flex items-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  <MapPin className={`h-5 w-5 mr-2 ${darkMode ? 'text-blue-400' : 'text-blue-500'}`} />
                  Location
                </h3>
                <div className="grid grid-cols-2 gap-4 ml-7">
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Country</p>
                    <p className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>{formData.country}</p>
                  </div>
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>County</p>
                    <p className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                      {formData.county || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>City</p>
                    <p className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                      {formData.city || "Not provided"}
                    </p>
                  </div>
                  <div>
                    <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Address</p>
                    <p className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                      {formData.address || "Not provided"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Products */}
              <div>
                <h3 className={`text-lg font-medium mb-2 flex items-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  <Package className={`h-5 w-5 mr-2 ${darkMode ? 'text-blue-400' : 'text-blue-500'}`} />
                  Products
                </h3>
                <div className="ml-7">
                  <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Category</p>
                  <p className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                    {formData.category || "Not provided"}
                  </p>
                  <p className={`text-sm mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Products</p>
                  <ul className={`list-disc list-inside ${
                    darkMode ? 'text-gray-200' : 'text-gray-900'
                  }`}>
                    {products.filter(p => p.trim() !== "").map((p, i) => (
                      <li key={i} className="font-medium">{p}</li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Additional Info */}
              {(formData.description || formData.yearEstablished || formData.employeeCount) && (
                <div>
                  <h3 className={`text-lg font-medium mb-2 flex items-center ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    <FileText className={`h-5 w-5 mr-2 ${darkMode ? 'text-blue-400' : 'text-blue-500'}`} />
                    Additional Information
                  </h3>
                  <div className="space-y-2 ml-7">
                    {formData.description && (
                      <div>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Description</p>
                        <p className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                          {formData.description}
                        </p>
                      </div>
                    )}
                    {formData.yearEstablished && (
                      <div>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Year Established</p>
                        <p className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                          {formData.yearEstablished}
                        </p>
                      </div>
                    )}
                    {formData.employeeCount && (
                      <div>
                        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Employees</p>
                        <p className={`font-medium ${darkMode ? 'text-gray-200' : 'text-gray-900'}`}>
                          {formData.employeeCount}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <div className={`pt-4 border-t ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className={`flex items-center ${
                    darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                  }`}
                >
                  <Edit2 className="h-4 w-4 mr-1" />
                  Edit Information
                </button>
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className="space-y-4">
              <label className="flex items-start space-x-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={agreedToTerms}
                  onChange={(e) => setAgreedToTerms(e.target.checked)}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                  I agree to the{" "}
                  <a href="/terms" className="text-blue-600 hover:text-blue-700 underline">
                    Terms and Conditions
                  </a>{" "}
                  and{" "}
                  <a href="/privacy" className="text-blue-600 hover:text-blue-700 underline">
                    Privacy Policy
                  </a>
                </span>
              </label>

              <p className={`text-sm flex items-center ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <AlertCircle className="h-4 w-4 mr-1 flex-shrink-0" />
                By submitting, you confirm that all information provided is accurate and complete
              </p>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  return (
    <div className={`min-h-screen transition-colors ${
      darkMode 
        ? 'bg-gray-900' 
        : 'bg-gradient-to-b from-blue-50 to-white'
    } py-8 px-4 sm:px-6 lg:px-8`}>
      <div className="max-w-3xl mx-auto">
        {/* NuruShop Logo */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3">
            <div className="relative w-24 h-24">
              <Image
                src="/assets/logo.jpg"
                alt="NuruShop"
                fill
                className="object-contain"
                priority
              />
            </div>
          </div>
          <h1 className={`text-3xl font-bold mb-1 ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Become a NuruShop Vendor
          </h1>
          <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
            Join Africa&apos;s fastest-growing marketplace for health and truth
          </p>
        </div>

        {/* Success Message */}
        {success && (
          <div className={`mb-6 border-l-4 border-green-500 p-4 rounded-r-lg shadow-md ${
            darkMode ? 'bg-green-900/30' : 'bg-green-50'
          }`}>
            <div className="flex items-center">
              <CheckCircle className={`h-6 w-6 mr-3 flex-shrink-0 ${
                darkMode ? 'text-green-400' : 'text-green-500'
              }`} />
              <div>
                <p className={`font-medium ${
                  darkMode ? 'text-green-400' : 'text-green-800'
                }`}>
                  Application submitted successfully!
                </p>
                <p className={`text-sm mt-1 ${
                  darkMode ? 'text-green-300' : 'text-green-600'
                }`}>
                  We&apos;ll review your application within 2-3 business days.
                  Redirecting to homepage in 10 seconds...
                </p>
              </div>
            </div>
          </div>
        )}

        {!success && !submitting && (
          <>
            {/* Step Indicator */}
            {renderStepIndicator()}

            {/* Form */}
            <div className={`rounded-xl shadow-lg p-6 md:p-8 transition-colors ${
              darkMode ? 'bg-gray-800' : 'bg-white'
            }`}>
              <form onSubmit={handleSubmit}>
                {renderStep()}

                {/* Navigation Buttons */}
                <div className="flex justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
                  {currentStep > 1 && (
                    <button
                      type="button"
                      onClick={prevStep}
                      className={`flex items-center px-6 py-3 font-medium transition-colors ${
                        darkMode 
                          ? 'text-gray-300 hover:text-white' 
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                    >
                      <ChevronLeft className="h-5 w-5 mr-1" />
                      Back
                    </button>
                  )}
                  
                  <div className="flex-1" />
                  
                  {currentStep < 7 ? (
                    <button
                      type="button"
                      onClick={nextStep}
                      disabled={!validateCurrentStep()}
                      className="flex items-center px-8 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Continue
                      <ChevronRight className="h-5 w-5 ml-1" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={!agreedToTerms}
                      className="px-8 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                    >
                      Submit Application
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Trust Badges */}
            <div className="mt-6 grid grid-cols-3 gap-4 text-center">
              <div className="flex flex-col items-center">
                <Shield className={`h-6 w-6 mb-1 ${
                  darkMode ? 'text-blue-400' : 'text-blue-500'
                }`} />
                <span className={`text-xs ${
                  darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>Secure & Encrypted</span>
              </div>
              <div className="flex flex-col items-center">
                <Clock className={`h-6 w-6 mb-1 ${
                  darkMode ? 'text-blue-400' : 'text-blue-500'
                }`} />
                <span className={`text-xs ${
                  darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>2-3 Day Review</span>
              </div>
              <div className="flex flex-col items-center">
                <CreditCard className={`h-6 w-6 mb-1 ${
                  darkMode ? 'text-blue-400' : 'text-blue-500'
                }`} />
                <span className={`text-xs ${
                  darkMode ? 'text-gray-400' : 'text-gray-500'
                }`}>Fast Payments</span>
              </div>
            </div>
          </>
        )}
      </div>

      <style jsx>{`
        @keyframes progress {
          0% { width: 0%; }
          50% { width: 70%; }
          100% { width: 90%; }
        }
        .animate-progress {
          animation: progress 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  )
}
