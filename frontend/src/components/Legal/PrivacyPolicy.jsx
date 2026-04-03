import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { GraduationCap, ArrowLeft, Shield, Lock, Eye, Database, UserCheck, Mail } from 'lucide-react';

const PrivacyPolicy = () => {
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
              <Shield className="w-8 h-8 text-cyan-600" />
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Privacy Policy</h1>
            <p className="text-gray-500">Last updated: {lastUpdated}</p>
          </div>

          {/* Introduction */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Lock className="w-5 h-5 text-cyan-600" />
              Introduction
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Government Graduate College Township Lahore ("GGC Township," "we," "us," or "our") is committed to protecting your privacy. 
              This Privacy Policy explains how we collect, use, disclose, and safeguard your personal information when you use our 
              AI-Enhanced Admission Management System (the "System"). This includes information collected through our website, 
              online application portal, and related services.
            </p>
            <p className="text-gray-700 leading-relaxed">
              By accessing or using our System, you consent to the practices described in this Privacy Policy. 
              If you do not agree with this policy, please do not use our services.
            </p>
          </section>

          {/* Information We Collect */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Database className="w-5 h-5 text-cyan-600" />
              Information We Collect
            </h2>
            
            <div className="space-y-6">
              <div>
                <h3 className="font-medium text-gray-900 mb-2">1. Personal Information</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                  <li>Full name, CNIC number, date of birth, and contact details (phone, email, address)</li>
                  <li>Parent/guardian information (for minor applicants)</li>
                  <li>Photographs and biometric data (where applicable for identification)</li>
                  <li>Account credentials (email and password for system access)</li>
                </ul>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-2">2. Academic Information</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                  <li>Academic transcripts, certificates, and degrees</li>
                  <li>Matriculation and intermediate examination results</li>
                  <li>Entry test scores (where applicable)</li>
                  <li>Previous academic history and institutions attended</li>
                </ul>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-2">3. Documents and Media</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                  <li>Scanned copies of CNIC, academic certificates, domicile certificates</li>
                  <li>Passport-sized photographs</li>
                  <li>Supporting documents (experience letters, extracurricular certificates)</li>
                </ul>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-2">4. AI-Processed Data</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                  <li>OCR-extracted data from uploaded documents</li>
                  <li>AI-generated recommendations and analysis</li>
                  <li>Merit calculation scores and rankings</li>
                  <li>Application status and processing history</li>
                </ul>
              </div>

              <div>
                <h3 className="font-medium text-gray-900 mb-2">5. Technical Information</h3>
                <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                  <li>IP address, browser type, and device information</li>
                  <li>Login times and session data</li>
                  <li>System usage patterns and preferences</li>
                </ul>
              </div>
            </div>
          </section>

          {/* How We Use Information */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Eye className="w-5 h-5 text-cyan-600" />
              How We Use Your Information
            </h2>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Process and evaluate admission applications fairly and transparently</li>
              <li>Generate merit lists using AI algorithms to ensure unbiased selection</li>
              <li>Verify academic credentials and documents using OCR technology</li>
              <li>Communicate with applicants regarding their application status</li>
              <li>Provide personalized program recommendations based on academic records</li>
              <li>Maintain records for institutional and regulatory compliance</li>
              <li>Prevent fraud and ensure the integrity of the admission process</li>
              <li>Improve our AI systems and admission processes</li>
              <li>Generate anonymized statistical reports for institutional planning</li>
            </ul>
          </section>

          {/* AI and Data Processing */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-cyan-600" />
              AI and Automated Decision-Making
            </h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              Our System uses artificial intelligence to:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4 mb-4">
              <li>Extract and verify information from uploaded documents (OCR)</li>
              <li>Calculate merit scores based on predefined criteria</li>
              <li>Generate recommendations for suitable academic programs</li>
              <li>Detect potential document fraud or inconsistencies</li>
            </ul>
            <p className="text-gray-700 leading-relaxed">
              <strong>Human oversight:</strong> While AI assists in processing, all admission decisions involve human review and approval. 
              Applicants have the right to contest automated decisions and request manual review.
            </p>
          </section>

          {/* Data Sharing */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Data Sharing and Disclosure</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We do not sell or rent your personal information. We may share your data with:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>University departments and faculty involved in the admission process</li>
              <li>Regulatory bodies (Higher Education Commission, Punjab University) as required by law</li>
              <li>Service providers who assist in system operations (cloud hosting, security services)</li>
              <li>Law enforcement agencies when legally required or to prevent fraud</li>
            </ul>
          </section>

          {/* Data Security */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Data Security</h2>
            <p className="text-gray-700 leading-relaxed mb-4">
              We implement robust security measures to protect your data:
            </p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Industry-standard encryption for data in transit (HTTPS/TLS) and at rest</li>
              <li>Role-based access controls limiting data access to authorized personnel</li>
              <li>Regular security audits and vulnerability assessments</li>
              <li>Secure cloud infrastructure with backup and disaster recovery plans</li>
              <li>Multi-factor authentication for administrative access</li>
            </ul>
          </section>

          {/* Data Retention */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Data Retention</h2>
            <p className="text-gray-700 leading-relaxed">
              We retain your personal information for as long as necessary to fulfill the purposes outlined in this Privacy Policy, 
              unless a longer retention period is required by law. Admission records are typically retained for 7 years for 
              institutional and regulatory compliance. After the retention period, data is securely deleted or anonymized.
            </p>
          </section>

          {/* Your Rights */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Rights</h2>
            <p className="text-gray-700 leading-relaxed mb-4">You have the right to:</p>
            <ul className="list-disc list-inside text-gray-700 space-y-2 ml-4">
              <li>Access your personal information stored in our System</li>
              <li>Request correction of inaccurate or incomplete data</li>
              <li>Request deletion of your data (subject to legal retention requirements)</li>
              <li>Object to certain processing activities</li>
              <li>Request a copy of your data in a portable format</li>
              <li>Withdraw consent for optional data processing</li>
            </ul>
            <p className="text-gray-700 leading-relaxed mt-4">
              To exercise these rights, please contact us using the information provided below.
            </p>
          </section>

          {/* Contact */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Mail className="w-5 h-5 text-cyan-600" />
              Contact Us
            </h2>
            <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
              <p className="text-gray-700 mb-2">
                <strong>Data Protection Officer</strong><br />
                Government Graduate College Township Lahore
              </p>
              <p className="text-gray-700 mb-1">📍 Township, Lahore, Pakistan</p>
              <p className="text-gray-700 mb-1">📧 privacy@ggctownship.edu.pk</p>
              <p className="text-gray-700">📞 +92 42 1234 5678</p>
            </div>
          </section>

          {/* Changes to Policy */}
          <section className="mb-10">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Changes to This Policy</h2>
            <p className="text-gray-700 leading-relaxed">
              We may update this Privacy Policy from time to time. Any changes will be posted on this page with an updated 
              "Last updated" date. We encourage you to review this policy periodically. Continued use of the System after 
              changes constitutes acceptance of the updated policy.
            </p>
          </section>

          {/* Related Links */}
          <div className="border-t border-gray-200 pt-8 mt-8">
            <div className="flex flex-wrap gap-4 justify-center">
              <Link 
                to="/terms" 
                className="text-cyan-600 hover:text-cyan-700 font-medium"
              >
                Terms of Service →
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

export default PrivacyPolicy;
