import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, ArrowLeft, Mail, Phone, MapPin, Clock, Send } from 'lucide-react';

const ContactPage = () => {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center">
                <GraduationCap className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="font-bold text-lg text-gray-900">GGC Township</span>
                <p className="text-xs text-gray-500">AI-Enhanced Admissions</p>
              </div>
            </Link>
            <Link 
              to="/" 
              className="flex items-center gap-2 text-gray-600 hover:text-cyan-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Contact Us</h1>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            Have questions about admissions? We're here to help. Reach out to our team using any of the methods below.
          </p>
        </div>

        {/* Contact Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-12">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center">
                <Mail className="w-6 h-6 text-cyan-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Email Us</h3>
            </div>
            <p className="text-gray-600 mb-2">For general inquiries:</p>
            <a href="mailto:info@ggctownship.edu.pk" className="text-cyan-600 hover:text-cyan-700 font-medium">
              info@ggctownship.edu.pk
            </a>
            <p className="text-gray-600 mt-3 mb-2">For admissions:</p>
            <a href="mailto:muah327@gmail.com" className="text-cyan-600 hover:text-cyan-700 font-medium">
              muah327@gmail.com
            </a>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center">
                <Phone className="w-6 h-6 text-cyan-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Call Us</h3>
            </div>
            <p className="text-gray-600 mb-2">Main Office:</p>
            <a href="https://wa.me/923456572787" target="_blank" rel="noopener noreferrer" className="text-cyan-600 hover:text-cyan-700 font-medium">
              0345 6572787
            </a>
            <p className="text-gray-600 mt-3 mb-2">Admissions Hotline:</p>
            <a href="tel:+924212345679" className="text-cyan-600 hover:text-cyan-700 font-medium">
              +92 42 1234 5679
            </a>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center">
                <MapPin className="w-6 h-6 text-cyan-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Visit Us</h3>
            </div>
            <p className="text-gray-600">
              Government Graduate College Township<br />
              Main Road, Township<br />
              Lahore, Punjab 54770<br />
              Pakistan
            </p>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-cyan-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Office Hours</h3>
            </div>
            <p className="text-gray-600">
              Monday - Friday: 8:00 AM - 4:00 PM<br />
              Saturday: 8:00 AM - 1:00 PM<br />
              Sunday: Closed<br />
              <span className="text-sm text-gray-500">(Pakistan Standard Time)</span>
            </p>
          </div>
        </div>

        {/* Quick Contact Form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-cyan-100 rounded-lg flex items-center justify-center">
              <Send className="w-6 h-6 text-cyan-600" />
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Send us a Message</h3>
              <p className="text-gray-600">We'll get back to you within 24 hours</p>
            </div>
          </div>

          <form className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input 
                  type="email" 
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  placeholder="your@email.com"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
              <input 
                type="text" 
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                placeholder="How can we help?"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Message</label>
              <textarea 
                rows={4}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
                placeholder="Write your message here..."
              />
            </div>
            <button 
              type="button"
              onClick={() => alert('Message sent! We will get back to you soon.')}
              className="w-full md:w-auto px-8 py-3 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-700 transition-colors flex items-center justify-center gap-2"
            >
              <Send className="w-4 h-4" />
              Send Message
            </button>
          </form>
        </div>
      </main>

      {/* Simple Footer */}
      <footer className="bg-white border-t border-gray-200 py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-500 text-sm">
            © 2026 Government Graduate College Township Lahore. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default ContactPage;
