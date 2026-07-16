import React from 'react';
import { MessageCircle, Bot, Zap, Shield, Users, ArrowRight, CheckCircle } from 'lucide-react';

const HomePage: React.FC = () => {
  // Replace with your WhatsApp number (country code + number, no '+' sign)
  const whatsappNumber = '1234567890';
  const whatsappLink = `https://wa.me/${whatsappNumber}?text=Hello%21%20I%27d%20like%20to%20schedule%20an%20AI%20consultation.`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/50 font-sans">
      {/* Navigation */}
      <nav className="container mx-auto px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Bot className="h-8 w-8 text-blue-600" />
          <span className="text-2xl font-bold text-slate-800">AI<span className="text-blue-600">Consult</span></span>
        </div>
        <div className="hidden md:flex space-x-8 text-slate-600 font-medium">
          <a href="#" className="hover:text-blue-600 transition">Services</a>
          <a href="#" className="hover:text-blue-600 transition">How it works</a>
          <a href="#" className="hover:text-blue-600 transition">Testimonials</a>
        </div>
        <a
          href={whatsappLink}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-green-600 hover:bg-green-700 text-white px-5 py-2.5 rounded-full flex items-center gap-2 transition shadow-md hover:shadow-lg"
        >
          <MessageCircle className="h-5 w-5" />
          <span>Chat on WhatsApp</span>
        </a>
      </nav>

      {/* Hero Section */}
      <section className="container mx-auto px-6 py-12 md:py-20 flex flex-col md:flex-row items-center">
        <div className="flex-1 text-center md:text-left">
          <div className="inline-block bg-blue-100 text-blue-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
            🚀 AI-Powered Consulting
          </div>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight text-slate-800">
            Unlock Business Growth <br />
            with <span className="text-blue-600">Intelligent AI</span> Advice
          </h1>
          <p className="mt-4 text-lg text-slate-600 max-w-lg md:mx-0 mx-auto">
            Get personalized, data-driven strategies for your business. Connect with our AI consultants directly on WhatsApp.
          </p>
          <div className="mt-8 flex flex-wrap gap-4 justify-center md:justify-start">
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3.5 rounded-full flex items-center gap-2 text-lg shadow-lg hover:shadow-xl transition"
            >
              Start Consultation <ArrowRight className="h-5 w-5" />
            </a>
            <a
              href="#features"
              className="bg-white text-slate-700 px-8 py-3.5 rounded-full flex items-center gap-2 text-lg border border-slate-200 hover:border-blue-300 hover:shadow transition"
            >
              Learn More
            </a>
          </div>
          <div className="mt-8 flex items-center gap-6 justify-center md:justify-start text-sm text-slate-500">
            <span className="flex items-center gap-1"><CheckCircle className="h-4 w-4 text-green-500" /> No setup fee</span>
            <span className="flex items-center gap-1"><CheckCircle className="h-4 w-4 text-green-500" /> 24/7 availability</span>
            <span className="flex items-center gap-1"><CheckCircle className="h-4 w-4 text-green-500" /> Instant replies</span>
          </div>
        </div>
        <div className="flex-1 mt-12 md:mt-0 flex justify-center">
          <div className="relative w-72 h-72 md:w-96 md:h-96 bg-gradient-to-tr from-blue-400 to-indigo-500 rounded-3xl shadow-2xl flex items-center justify-center">
            <Bot className="h-32 w-32 text-white/90" />
            <div className="absolute -bottom-3 -right-3 bg-white rounded-full p-3 shadow-lg">
              <MessageCircle className="h-8 w-8 text-green-500" />
            </div>
            <div className="absolute -top-4 -left-4 bg-yellow-400 rounded-full p-2 shadow-lg">
              <Zap className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-16 bg-white/50 backdrop-blur-sm">
        <div className="container mx-auto px-6">
          <h2 className="text-3xl md:text-4xl font-bold text-center text-slate-800">
            Why Choose <span className="text-blue-600">AI Consult</span>
          </h2>
          <p className="text-center text-slate-500 mt-2 max-w-xl mx-auto">
            Expert AI-driven insights delivered instantly to your WhatsApp.
          </p>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-md transition border border-slate-100">
              <div className="bg-blue-50 w-14 h-14 rounded-xl flex items-center justify-center mb-4">
                <Zap className="h-7 w-7 text-blue-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800">Real-time Insights</h3>
              <p className="mt-2 text-slate-500">
                Get instant, actionable recommendations powered by the latest AI models.
              </p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-md transition border border-slate-100">
              <div className="bg-green-50 w-14 h-14 rounded-xl flex items-center justify-center mb-4">
                <Users className="h-7 w-7 text-green-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800">Expert Team</h3>
              <p className="mt-2 text-slate-500">
                Our consultants combine AI precision with human expertise for the best outcomes.
              </p>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-sm hover:shadow-md transition border border-slate-100">
              <div className="bg-purple-50 w-14 h-14 rounded-xl flex items-center justify-center mb-4">
                <Shield className="h-7 w-7 text-purple-600" />
              </div>
              <h3 className="text-xl font-semibold text-slate-800">Data Privacy</h3>
              <p className="mt-2 text-slate-500">
                Your business data is encrypted and handled with the highest security standards.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 md:py-24 container mx-auto px-6">
        <div className="bg-blue-600 rounded-3xl p-8 md:p-14 text-center text-white shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-blue-400 rounded-full -mr-20 -mt-20 opacity-30"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-indigo-400 rounded-full -ml-16 -mb-16 opacity-30"></div>
          <div className="relative z-10">
            <h2 className="text-3xl md:text-4xl font-bold">Ready to Transform Your Business?</h2>
            <p className="mt-3 text-blue-50 max-w-lg mx-auto text-lg">
              Start your AI consultation today. Just tap the button and say hello on WhatsApp.
            </p>
            <a
              href={whatsappLink}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 mt-8 bg-white text-blue-700 px-10 py-4 rounded-full font-semibold text-lg shadow-lg hover:shadow-xl hover:scale-105 transition"
            >
              <MessageCircle className="h-6 w-6" />
              Message us on WhatsApp
            </a>
            <p className="mt-4 text-blue-100 text-sm">⚡ Usually replies within minutes</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="container mx-auto px-6 py-8 border-t border-slate-200/60 flex flex-col md:flex-row justify-between items-center text-sm text-slate-500">
        <p>© 2025 AIConsult. All rights reserved.</p>
        <div className="flex gap-6 mt-4 md:mt-0">
          <a href="#" className="hover:text-blue-600 transition">Privacy</a>
          <a href="#" className="hover:text-blue-600 transition">Terms</a>
          <a href="#" className="hover:text-blue-600 transition">Support</a>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;