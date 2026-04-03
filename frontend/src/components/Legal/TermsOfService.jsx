import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, ArrowLeft, FileText, Scale, Gavel, AlertCircle, Users, Globe } from 'lucide-react';

const TermsOfService = () => {
  const lastUpdated = "April 3, 2026";

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
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 md:p-12">
          {/* Title Section */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-cyan-100 rounded-full mb-4">
              <FileText className="w-8 h-8 text-cyan-600" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Terms of Service</h1>
            <p className="text-gray-500">Last updated: {lastUpdated}</p>
          </div>

          {/* Introduction */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5 text-cyan-600" />
              Welcome to GGC Township Admission System
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              These Terms of Service ("Terms") govern your access to and use of the AI-Enhanced Admission Management System 
              operated by Government Graduate College Township Lahore ("GGC Township," "we," "us," or "our"). 
              By accessing or using our System, you agree to be bound by these Terms.
            </p>
            <p className="text-gray-700 leading-relaxed">
              Please read these Terms carefully. If you do not agree with any part of these Terms, you may not access 
              or use our services.
            </p>
          </section>

          {/* Definitions */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Definitions</h2>
            <div className="space-y-3">
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="text-gray-700"><strong>"System"</strong> refers to the AI-Enhanced Admission Management System, including all features, tools, and services provided.</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="text-gray-700"><strong>"User," "You," or "Applicant"</strong> refers to any individual who accesses or uses the System to apply for admission.</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="text-gray-700"><strong>"Personal Information"</strong> means any information that identifies or can be used to identify an individual.</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                <p className="text-gray-700"><strong>"AI Services"</strong> refers to the automated features including OCR document processing, merit calculation, and recommendation systems.</p>
              </div>
            </div>
          </section>

          {/* Eligibility */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-600" />
              Eligibility and Account Registration
            </h2>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>You must be at least 16 years old to use this System, or have parental/guardian consent if under 18</li>
              <li>You must provide accurate, current, and complete information during registration</li>
              <li>You are responsible for maintaining the confidentiality of your account credentials</li>
              <li>You must immediately notify us of any unauthorized use of your account</li>
              <li>We reserve the right to suspend or terminate accounts with false or misleading information</li>
              <li>One user may only maintain one active account</li>
            </ul>
          </section>

          {/* Application Process */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Application Process</h2>
            
            <h3 className="font-medium text-gray-900 mb-2 mt-6">Application Submission</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>All applications must be submitted through the official online portal</li>
              <li>Incomplete applications will not be considered</li>
              <li>False information will result in immediate disqualification and possible legal action</li>
              <li>Document forgery is a criminal offense and will be reported to authorities</li>
            </ul>

            <h3 className="font-medium text-gray-900 mb-2 mt-6">Document Requirements</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>All uploaded documents must be clear, legible, and authentic</li>
              <li>Accepted formats: PDF, JPEG, PNG (max 2MB per file)</li>
              <li>Documents will be processed using AI OCR technology for verification</li>
              <li>You must retain original documents for verification if requested</li>
            </ul>

            <h3 className="font-medium text-gray-900 mb-2 mt-6">Application Fee</h3>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Application fees are non-refundable unless the System experiences technical failure</li>
              <li>Payment must be made through approved payment methods only</li>
              <li>Proof of payment must be retained until admission process completion</li>
            </ul>
          </section>

          {/* AI and Technology */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">AI Technology and Processing</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Our System uses artificial intelligence to enhance the admission process:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>OCR technology extracts text from uploaded documents automatically</li>
              <li>AI algorithms calculate merit scores based on academic records</li>
              <li>Document verification systems detect potential fraud or inconsistencies</li>
              <li>Recommendation systems suggest suitable programs based on academic profiles</li>
            </ul>
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
              <p className="text-yellow-800 text-sm">
                <strong>Important:</strong> While AI assists in processing, final admission decisions are made by human 
                administrators. AI-generated recommendations are advisory and do not guarantee admission.
              </p>
            </div>
          </section>

          {/* Merit and Selection */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Merit Calculation and Selection</h2>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Merit is calculated based on published criteria (academic performance, entry tests, etc.)</li>
              <li>Merit lists are generated transparently and published on the System</li>
              <li>Category-based quotas (merit, quota, self-finance) are applied as per institutional policy</li>
              <li>Selected candidates must confirm admission within the specified timeframe</li>
              <li>Failure to confirm within the deadline will result in forfeiture of the seat</li>
              <li>Waitlisted candidates will be contacted if seats become available</li>
            </ul>
          </section>

          {/* User Conduct */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-cyan-600" />
              Prohibited Conduct
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">Users are prohibited from:</p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Submitting false, fraudulent, or misleading information</li>
              <li>Uploading forged or manipulated documents</li>
              <li>Attempting to hack, disrupt, or interfere with the System</li>
              <li>Using automated scripts, bots, or scrapers</li>
              <li>Accessing accounts or data belonging to other users</li>
              <li>Sharing account credentials with others</li>
              <li>Attempting to bribe or unduly influence admission staff</li>
              <li>Defaming the institution or other applicants</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              Violation of these prohibitions may result in immediate account termination, disqualification from 
              the admission process, and legal prosecution where applicable.
            </p>
          </section>

          {/* Intellectual Property */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Intellectual Property</h2>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>All content, software, and technology in the System are property of GGC Township</li>
              <li>You may not copy, modify, distribute, or create derivative works without permission</li>
              <li>Data generated by the AI systems remains institutional property</li>
              <li>Merit lists and admission decisions are confidential and institution-owned</li>
            </ul>
          </section>

          {/* Data and Privacy */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Data Usage and Privacy</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              By using the System, you consent to the collection and processing of your data as described in our 
              Privacy Policy. Key points:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Your data is used solely for admission and institutional purposes</li>
              <li>Anonymized data may be used for statistical analysis and system improvement</li>
              <li>We implement security measures but cannot guarantee absolute data security</li>
              <li>You have rights regarding your personal data as outlined in the Privacy Policy</li>
            </ul>
          </section>

          {/* Disclaimers */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Disclaimers and Limitations</h2>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-gray-700 leading-relaxed mb-4">
                <strong>System Availability:</strong> We strive to maintain 24/7 system availability but do not guarantee 
                uninterrupted access. The System may be temporarily unavailable for maintenance or due to technical issues.
              </p>
              <p className="text-gray-700 leading-relaxed mb-4">
                <strong>Accuracy:</strong> While we use advanced AI and verification systems, we do not guarantee 100% accuracy 
                in document processing or data extraction. Applicants are responsible for verifying their submitted information.
              </p>
              <p className="text-gray-700 leading-relaxed">
                <strong>Technical Issues:</strong> GGC Township is not liable for any damages resulting from technical failures, 
                data loss, or system errors beyond our reasonable control.
              </p>
            </div>
          </section>

          {/* Dispute Resolution */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Gavel className="w-5 h-5 text-cyan-600" />
              Dispute Resolution
            </h2>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Any disputes regarding admission decisions should be filed through the official grievance portal</li>
              <li>Grievances must be submitted within 7 days of the disputed event</li>
              <li>GGC Township's decision on grievances is final and binding</li>
              <li>Legal disputes are subject to the jurisdiction of Lahore courts</li>
              <li>These Terms are governed by the laws of Pakistan</li>
            </ul>
          </section>

          {/* Modifications */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Modifications to Terms</h2>
            <p className="text-gray-700 leading-relaxed">
              We reserve the right to modify these Terms at any time. Changes will be effective immediately upon posting 
              to the System. Your continued use of the System after any changes constitutes acceptance of the modified Terms. 
              We encourage you to review these Terms periodically.
            </p>
          </section>

          {/* Contact */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Contact Information</h2>
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
              <p className="text-gray-700 mb-2">
                <strong>Admissions Office</strong><br />
                Government Graduate College Township Lahore
              </p>
              <p className="text-gray-700 mb-1">📍 Township, Lahore, Pakistan</p>
              <p className="text-gray-700 mb-1">📧 admissions@ggctownship.edu.pk</p>
              <p className="text-gray-700">📞 +92 42 1234 5678</p>
            </div>
          </section>

          {/* Agreement */}
          <section className="mb-10">
            <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-cyan-900 mb-2 flex items-center gap-2">
                <Scale className="w-5 h-5" />
                Agreement
              </h3>
              <p className="text-cyan-800 leading-relaxed">
                By clicking "I Agree" during registration or by continuing to use the System, you acknowledge that 
                you have read, understood, and agree to be bound by these Terms of Service and our Privacy Policy.
              </p>
            </div>
          </section>

          {/* Related Links */}
          <div className="border-t border-gray-200 pt-8 mt-8">
            <div className="flex flex-wrap gap-4 justify-center">
              <Link 
                to="/privacy" 
                className="text-cyan-600 hover:text-cyan-700 font-medium"
              >
                Privacy Policy →
              </Link>
              <span className="text-gray-300">|</span>
              <Link 
                to="/contact" 
                className="text-cyan-600 hover:text-cyan-700 font-medium"
              >
                Contact Us →
              </Link>
            </div>
          </div>
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

export default TermsOfService;
