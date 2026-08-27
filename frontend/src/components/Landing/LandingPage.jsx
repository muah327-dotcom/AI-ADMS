import React, { useState, useEffect } from 'react';
import { motion, useScroll, useTransform, AnimatePresence } from 'framer-motion';
import {
  Sparkles,
  Zap,
  Shield,
  BarChart3,
  Clock,
  CheckCircle2,
  ChevronRight,
  Menu,
  X,
  FileText,
  Users,
  ArrowRight,
  Play,
  Star,
  Quote
} from 'lucide-react';
import { Link } from 'react-router-dom';

// Animation variants
const fadeInUp = {
  hidden: { opacity: 0, y: 60 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
  }
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1, delayChildren: 0.2 }
  }
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.5, ease: "easeOut" }
  }
};

const slideInLeft = {
  hidden: { opacity: 0, x: -100 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
  }
};

const slideInRight = {
  hidden: { opacity: 0, x: 100 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.8, ease: [0.22, 1, 0.36, 1] }
  }
};

// Animated counter component
const AnimatedCounter = ({ end, duration = 2, suffix = "" }) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime;
    let animationFrame;

    const animate = (timestamp) => {
      if (!startTime) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);

      // Easing function
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      setCount(Math.floor(easeOutQuart * end));

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate);
      }
    };

    animationFrame = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animationFrame);
  }, [end, duration]);

  return <span>{count}{suffix}</span>;
};

// Navigation component
const Navigation = ({ onNavClick }) => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navLinks = [
    { name: 'Home', href: '#home' },
    { name: 'About', href: '#about' },
    { name: 'Problem', href: '#problem' },
    { name: 'Solution', href: '#solution' },
    { name: 'FAQ', href: '#faq' },
    { name: 'Contact', href: '#contact' },
  ];

  const handleClick = (e, href) => {
    onNavClick(e, href);
    setIsMobileMenuOpen(false);
  };

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${isScrolled
        ? 'bg-white/90 backdrop-blur-lg shadow-lg'
        : 'bg-transparent'
        }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <motion.div
            className="flex items-center gap-2"
            whileHover={{ scale: 1.05 }}
          >
            <div className="w-10 h-10 flex items-center justify-center">
              <img src="/logo.png" alt="GGC Township Logo" className="w-10 h-10 object-contain" />
            </div>
            <div>
              <span className={`font-bold text-lg ${isScrolled ? 'text-gray-900' : 'text-gray-900'}`}>
                GGC Township
              </span>
              <p className="text-xs text-gray-500">AI-Enhanced Admissions</p>
            </div>
          </motion.div>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8">
            {navLinks.map((link) => (
              <motion.a
                key={link.name}
                href={link.href}
                onClick={(e) => handleClick(e, link.href)}
                className={`text-sm font-medium transition-colors cursor-pointer ${isScrolled ? 'text-gray-700 hover:text-cyan-600' : 'text-gray-700 hover:text-cyan-600'
                  }`}
                whileHover={{ y: -2 }}
              >
                {link.name}
              </motion.a>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="hidden lg:flex items-center gap-4">
            <Link to="/login">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-2.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-full font-medium transition-colors shadow-lg shadow-cyan-500/25"
              >
                Apply Now
              </motion.button>
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="lg:hidden bg-white border-t"
          >
            <div className="px-4 py-4 space-y-3">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  className="block py-2 text-gray-700 hover:text-cyan-600 font-medium"
                  onClick={(e) => handleClick(e, link.href)}
                >
                  {link.name}
                </a>
              ))}
              <Link
                to="/login"
                className="block w-full py-3 bg-cyan-500 text-white text-center rounded-lg font-medium"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                Apply Now
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.nav>
  );
};

// Hero Section
const HeroSection = () => {
  return (
    <section id="home" className="relative min-h-screen pt-20 lg:pt-0 overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-50 via-white to-blue-50" />

      {/* Animated background shapes */}
      <motion.div
        className="absolute top-20 right-10 w-72 h-72 bg-cyan-200/30 rounded-full blur-3xl"
        animate={{
          scale: [1, 1.2, 1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-20 left-10 w-96 h-96 bg-blue-200/30 rounded-full blur-3xl"
        animate={{
          scale: [1.2, 1, 1.2],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 min-h-screen flex items-center">
        <div className="grid lg:grid-cols-2 gap-12 items-center w-full py-12">
          {/* Left Content */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="text-center lg:text-left"
          >
            <motion.h1
              variants={fadeInUp}
              className="text-4xl sm:text-5xl lg:text-6xl font-bold text-gray-900 leading-tight mb-6"
            >
              Revolutionizing{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-blue-600">
                University Admissions
              </span>{' '}
              with AI
            </motion.h1>

            <motion.p
              variants={fadeInUp}
              className="text-lg text-gray-600 mb-8 max-w-xl mx-auto lg:mx-0"
            >
              Automating the entire admission cycle from OCR data extraction to smart merit list generation.
              Experience a seamless, transparent, and efficient admission process.
            </motion.p>

            <motion.div
              variants={fadeInUp}
              className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start"
            >
              <Link to="/login">
                <motion.button
                  whileHover={{ scale: 1.05, boxShadow: "0 20px 40px -10px rgba(6, 182, 212, 0.4)" }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-4 bg-gradient-to-r from-cyan-500 to-cyan-600 text-white rounded-full font-semibold flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25"
                >
                  Apply Now
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              </Link>
              <a href="#about">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  className="px-8 py-4 border-2 border-gray-300 text-gray-700 rounded-full font-semibold flex items-center justify-center gap-2 hover:border-cyan-500 hover:text-cyan-600 transition-colors"
                >
                  <Play className="w-5 h-5" />
                  Learn More
                </motion.button>
              </a>
            </motion.div>

            {/* Stats */}
            <motion.div
              variants={fadeInUp}
              className="grid grid-cols-3 gap-8 mt-12 pt-8 border-t border-gray-200"
            >
              {[
                { value: 5000, suffix: '+', label: 'Applications' },
                { value: 99, suffix: '.5%', label: 'Accuracy' },
                { value: 80, suffix: '%', label: 'Time Saved' },
              ].map((stat, index) => (
                <div key={index} className="text-center lg:text-left">
                  <div className="text-2xl sm:text-3xl font-bold text-cyan-600">
                    <AnimatedCounter end={stat.value} suffix={stat.suffix} />
                  </div>
                  <div className="text-sm text-gray-500 mt-1">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          </motion.div>

          {/* Right Content - Dashboard Preview */}
          <motion.div
            initial="hidden"
            animate="visible"
            variants={slideInRight}
            className="relative"
          >
            <motion.div
              animate={{ y: [0, -20, 0] }}
              transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
              className="relative"
            >
              {/* Main dashboard image placeholder */}
              <div className="relative rounded-2xl overflow-hidden shadow-2xl shadow-cyan-500/20">
                <div className="bg-gradient-to-br from-gray-900 to-gray-800 p-6 rounded-2xl">
                  {/* Mock dashboard UI */}
                  <div className="flex items-center gap-2 mb-4">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-400" />
                      <div className="w-3 h-3 rounded-full bg-yellow-400" />
                      <div className="w-3 h-3 rounded-full bg-green-400" />
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="bg-gray-700/50 rounded-lg p-4">
                      <div className="text-xs text-gray-400 mb-1">Applications</div>
                      <div className="text-xl font-bold text-white">2,847</div>
                      <div className="text-xs text-green-400 mt-1">+12%</div>
                    </div>
                    <div className="bg-gray-700/50 rounded-lg p-4">
                      <div className="text-xs text-gray-400 mb-1">Processed</div>
                      <div className="text-xl font-bold text-white">1,923</div>
                      <div className="text-xs text-green-400 mt-1">+8%</div>
                    </div>
                    <div className="bg-gray-700/50 rounded-lg p-4">
                      <div className="text-xs text-gray-400 mb-1">Accuracy</div>
                      <div className="text-xl font-bold text-white">99.5%</div>
                      <div className="text-xs text-cyan-400 mt-1">AI Verified</div>
                    </div>
                  </div>
                  <div className="bg-gray-700/30 rounded-lg p-4 h-32 flex items-center justify-center">
                    <div className="flex items-end gap-2 h-20">
                      {[40, 65, 45, 80, 55, 70, 85, 60, 75, 90].map((height, i) => (
                        <motion.div
                          key={i}
                          className="w-4 bg-cyan-500 rounded-t"
                          initial={{ height: 0 }}
                          animate={{ height: `${height}%` }}
                          transition={{ delay: i * 0.1, duration: 0.5 }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

// About Section
const AboutSection = () => {
  const features = [
    {
      icon: Users,
      title: "Unified Platform",
      description: "One seamless system for students and administrators with role-based access control.",
      color: "from-cyan-500 to-cyan-600"
    },
    {
      icon: Shield,
      title: "Document Verification",
      description: "Automated OCR-based validation of certificates and IDs with 99.5% accuracy.",
      color: "from-blue-500 to-blue-600"
    },
    {
      icon: BarChart3,
      title: "Data Visualization",
      description: "Real-time insights and analytics for informed decision-making with interactive dashboards.",
      color: "from-violet-500 to-violet-600"
    },
    {
      icon: CheckCircle2,
      title: "Merit Excellence",
      description: "Fair, transparent, and automated merit list generation with zero human bias.",
      color: "from-emerald-500 to-emerald-600"
    }
  ];

  return (
    <section id="about" className="py-20 lg:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="text-center mb-16"
        >
          <motion.span
            variants={fadeInUp}
            className="inline-block px-4 py-2 bg-cyan-100 text-cyan-700 rounded-full text-sm font-medium mb-4"
          >
            About AI-ADMS
          </motion.span>
          <motion.h2
            variants={fadeInUp}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6"
          >
            A Unified Platform for{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-blue-600">
              Modern Education
            </span>
          </motion.h2>
          <motion.p
            variants={fadeInUp}
            className="text-lg text-gray-600 max-w-3xl mx-auto"
          >
            AI-ADMS (AI-Enhanced Admission Management System) is a comprehensive, data-driven
            platform that integrates cutting-edge artificial intelligence with educational administration.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {features.map((feature, index) => (
            <motion.div
              key={index}
              variants={fadeInUp}
              whileHover={{ y: -8, scale: 1.02 }}
              className="group bg-white rounded-2xl p-6 border border-gray-100 hover:border-cyan-200 hover:shadow-xl hover:shadow-cyan-500/10 transition-all duration-300"
            >
              <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center mb-5 group-hover:scale-110 transition-transform`}>
                <feature.icon className="w-7 h-7 text-white" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-3">{feature.title}</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Stats Row */}
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="mt-16 grid sm:grid-cols-2 gap-6 max-w-2xl mx-auto"
        >
          <motion.div
            variants={scaleIn}
            className="bg-gradient-to-br from-cyan-50 to-cyan-100 rounded-2xl p-6 border border-cyan-200"
          >
            <div className="text-4xl font-bold text-cyan-600 mb-2">
              <AnimatedCounter end={5000} suffix="+" />
            </div>
            <div className="text-gray-700 font-medium">Applications Processed</div>
          </motion.div>
          <motion.div
            variants={scaleIn}
            className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200"
          >
            <div className="text-4xl font-bold text-blue-600 mb-2">4.8/5</div>
            <div className="text-gray-700 font-medium">Student Satisfaction</div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

// Problem Section
const ProblemSection = () => {
  const problems = [
    {
      icon: Clock,
      title: "Manual Inefficiency",
      description: "Hours spent filling forms by hand, leading to errors, delays, and frustrated applicants.",
      stat: "70%",
      statLabel: "of time wasted"
    },
    {
      icon: FileText,
      title: "Ineligible Applications",
      description: "Students waste time and money applying for programs they don't qualify for.",
      stat: "40%",
      statLabel: "rejected applications"
    },
    {
      icon: Users,
      title: "Slow & Biased Merit Lists",
      description: "Manual merit list generation takes weeks and may contain human bias or errors.",
      stat: "2-3 weeks",
      statLabel: "delay"
    }
  ];

  return (
    <section id="problem" className="py-20 lg:py-32 bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="text-center mb-16"
        >
          <motion.h2
            variants={fadeInUp}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6"
          >
            Traditional Admissions Are{' '}
            <span className="text-red-500">Broken & Inefficient</span>
          </motion.h2>
          <motion.p
            variants={fadeInUp}
            className="text-lg text-gray-600 max-w-2xl mx-auto"
          >
            Manual processes create barriers for students and overwhelm administrators.
            It's time for a smarter solution.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="grid md:grid-cols-3 gap-8"
        >
          {problems.map((problem, index) => (
            <motion.div
              key={index}
              variants={fadeInUp}
              whileHover={{ y: -8 }}
              className="group bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300"
            >
              <div className="relative h-48 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/20 to-orange-500/20" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <motion.div
                    className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center"
                    whileHover={{ scale: 1.1, rotate: 10 }}
                  >
                    <problem.icon className="w-10 h-10 text-red-500" />
                  </motion.div>
                </div>
              </div>
              <div className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-3">{problem.title}</h3>
                <p className="text-gray-600 text-sm mb-4">{problem.description}</p>
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-full text-sm font-medium">
                  <span className="font-bold">{problem.stat}</span>
                  <span>{problem.statLabel}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.4 }}
          className="mt-12 text-center"
        >
          <p className="text-lg text-gray-700">
            These problems cost universities <span className="font-semibold text-red-500">thousands of hours</span> and{' '}
            <span className="font-semibold text-red-500">countless opportunities</span> every year.
          </p>
        </motion.div>
      </div>
    </section>
  );
};

// Solution Section
const SolutionSection = () => {
  const solutions = [
    {
      title: "OCR-Based Form Filling",
      description: "Upload your documents once, and let our system extract and fill your data automatically. No more manual typing!",
      features: ["99.5% accuracy in data extraction", "Supports CNIC & certificates", "Instant form population"]
    },
    {
      title: "Smart Merit List Generation",
      description: "Fair, unbiased merit lists generated instantly with complete transparency. Track your application in real-time.",
      features: ["Zero bias in merit calculation", "Instant notifications", "Complete audit trail"]
    }
  ];

  return (
    <section id="solution" className="py-20 lg:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="text-center mb-16"
        >
          <motion.span
            variants={fadeInUp}
            className="inline-block px-4 py-2 bg-cyan-100 text-cyan-700 rounded-full text-sm font-medium mb-4"
          >
            For Administrators
          </motion.span>
          <motion.h2
            variants={fadeInUp}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold text-gray-900 mb-6"
          >
            Powerful{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-blue-600">
              Admin Dashboard & Analytics
            </span>
          </motion.h2>
          <motion.p
            variants={fadeInUp}
            className="text-lg text-gray-600 max-w-2xl mx-auto"
          >
            Gain deep insights into admissions with real-time data visualization and comprehensive reporting.
          </motion.p>
        </motion.div>

        <div className="space-y-20">
          {solutions.map((solution, index) => (
            <motion.div
              key={index}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-100px" }}
              variants={staggerContainer}
              className={`grid lg:grid-cols-2 gap-12 items-center ${index % 2 === 1 ? 'lg:flex-row-reverse' : ''}`}
            >
              <motion.div variants={index % 2 === 0 ? slideInLeft : slideInRight}>
                <div className="bg-gradient-to-br from-cyan-50 to-blue-50 rounded-3xl p-8 border border-cyan-100">
                  <div className="bg-white rounded-2xl shadow-xl p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div>
                        <div className="text-2xl font-bold text-gray-900">1000</div>
                        <div className="text-sm text-gray-500">Total Applications</div>
                      </div>
                      <div className="w-12 h-12 bg-cyan-100 rounded-xl flex items-center justify-center">
                        <BarChart3 className="w-6 h-6 text-cyan-600" />
                      </div>
                    </div>
                    <div className="space-y-3">
                      {[
                        { label: "Processing Accuracy", value: "99.5%", icon: CheckCircle2, color: "text-green-500" },
                        { label: "Avg. Processing Time", value: "5.2hrs", icon: Clock, color: "text-blue-500" }
                      ].map((item, i) => (
                        <div key={i} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <item.icon className={`w-5 h-5 ${item.color}`} />
                            <span className="text-sm text-gray-600">{item.label}</span>
                          </div>
                          <span className="font-semibold text-gray-900">{item.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div variants={index % 2 === 0 ? slideInRight : slideInLeft}>
                <h3 className="text-2xl lg:text-3xl font-bold text-gray-900 mb-4">{solution.title}</h3>
                <p className="text-gray-600 mb-6">{solution.description}</p>
                <ul className="space-y-3">
                  {solution.features.map((feature, i) => (
                    <motion.li
                      key={i}
                      initial={{ opacity: 0, x: 20 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: i * 0.1 }}
                      className="flex items-center gap-3"
                    >
                      <div className="w-6 h-6 bg-cyan-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <CheckCircle2 className="w-4 h-4 text-cyan-600" />
                      </div>
                      <span className="text-gray-700">{feature}</span>
                    </motion.li>
                  ))}
                </ul>
              </motion.div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

// FAQ Section
const FAQSection = () => {
  const [openIndex, setOpenIndex] = useState(0);

  const faqs = [
    {
      question: "How does the OCR technology work?",
      answer: "Our advanced OCR (Optical Character Recognition) technology automatically extracts data from your uploaded CNIC and educational certificates. Simply upload clear photos or scans of your documents, and our AI will accurately read and populate your application form, saving you time and reducing errors."
    },
    {
      question: "Is my personal data secure?",
      answer: "Absolutely. We use enterprise-grade encryption and security measures to protect your data. All documents are stored securely, and access is strictly controlled. We comply with data protection regulations and never share your information with third parties."
    },
    {
      question: "How are AI program recommendations generated?",
      answer: "Our AI analyzes your academic credentials, interests, and eligibility criteria to suggest the most suitable programs. The system considers your marks, subject combinations, and program requirements to provide personalized recommendations that maximize your chances of admission."
    },
    {
      question: "What happens after I submit my application?",
      answer: "Once submitted, your application enters our automated verification pipeline. The system validates your documents, checks eligibility, and provides real-time status updates. You'll receive notifications at each stage, from document verification to final merit list publication."
    },
    {
      question: "Can I track my application status in real-time?",
      answer: "Yes! Our student dashboard provides real-time tracking of your application. You can see exactly which stage your application is at, from document verification to merit calculation. You'll also receive instant notifications for any updates or required actions."
    }
  ];

  return (
    <section id="faq" className="py-20 lg:py-32 bg-gradient-to-b from-white to-cyan-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="text-center mb-12"
        >
          <motion.span
            variants={fadeInUp}
            className="inline-block px-4 py-2 bg-cyan-100 text-cyan-700 rounded-full text-sm font-medium mb-4"
          >
            FAQ
          </motion.span>
          <motion.h2
            variants={fadeInUp}
            className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4"
          >
            Frequently Asked{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-blue-600">
              Questions
            </span>
          </motion.h2>
          <motion.p
            variants={fadeInUp}
            className="text-gray-600"
          >
            Everything you need to know about AI-ADMS and the admission process.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={staggerContainer}
          className="space-y-4"
        >
          {faqs.map((faq, index) => (
            <motion.div
              key={index}
              variants={fadeInUp}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden"
            >
              <button
                onClick={() => setOpenIndex(openIndex === index ? -1 : index)}
                className="w-full flex items-center justify-between p-5 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="font-medium text-gray-900 pr-4">{faq.question}</span>
                <motion.div
                  animate={{ rotate: openIndex === index ? 180 : 0 }}
                  transition={{ duration: 0.3 }}
                >
                  <ChevronRight className="w-5 h-5 text-gray-500 flex-shrink-0" />
                </motion.div>
              </button>
              <AnimatePresence>
                {openIndex === index && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                  >
                    <div className="px-5 pb-5 text-gray-600 leading-relaxed">
                      {faq.answer}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
};

// Contact Section
const ContactSection = () => {
  return (
    <section id="contact" className="py-20 lg:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="text-center mb-16"
        >
          <motion.span
            variants={fadeInUp}
            className="inline-block px-4 py-2 bg-cyan-100 text-cyan-700 rounded-full text-sm font-medium mb-4"
          >
            Get in Touch
          </motion.span>
          <motion.h2
            variants={fadeInUp}
            className="text-3xl sm:text-4xl font-bold text-gray-900 mb-4"
          >
            Ready to Transform Your{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-500 to-blue-600">
              Admission Experience?
            </span>
          </motion.h2>
          <motion.p
            variants={fadeInUp}
            className="text-gray-600 max-w-2xl mx-auto"
          >
            Have questions or need assistance? Our team is here to help you navigate the admission process.
          </motion.p>
        </motion.div>

        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-100px" }}
          variants={staggerContainer}
          className="grid sm:grid-cols-3 gap-6 max-w-3xl mx-auto"
        >
          {/* Contact Info */}
          {[
            { icon: "✉️", title: "Email", value: "muah327@gmail.com" },
            { icon: "📞", title: "Phone", value: "03456572787" },
            { icon: "📍", title: "Location", value: "Township, Lahore, Pakistan" }
          ].map((item, index) => (
            <motion.div
              key={index}
              variants={fadeInUp}
              whileHover={{ scale: 1.05, y: -4 }}
              onClick={() => {
                if (item.title === 'Phone') {
                  window.open('https://wa.me/923456572787', '_blank');
                } else if (item.title === 'Email') {
                  window.open('https://mail.google.com/mail/?view=cm&fs=1&to=muah327@gmail.com', '_blank');
                } else if (item.title === 'Location') {
                  window.open('https://maps.google.com/?q=Government+Graduate+College+Township,+Lahore', '_blank');
                }
              }}
              className="flex flex-col items-center gap-3 p-6 bg-gray-50 rounded-2xl hover:bg-cyan-50 transition-colors cursor-pointer text-center"
            >
              <div className="w-14 h-14 bg-cyan-100 rounded-xl flex items-center justify-center text-2xl">
                {item.icon}
              </div>
              <div>
                <div className="text-sm text-gray-500 mb-1">{item.title}</div>
                <div className="font-medium text-gray-900">{item.value}</div>
              </div>
            </motion.div>
          ))}

          {/* Office Hours */}
          <motion.div
            variants={fadeInUp}
            className="sm:col-span-3 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-xl p-6 text-white mt-2"
          >
            <h4 className="font-semibold mb-3">Office Hours</h4>
            <ul className="space-y-2 text-sm text-cyan-100">
              <li>Monday - Friday: 9:00 AM - 5:00 PM</li>
              <li>Saturday: 9:00 AM - 2:00 PM</li>
              <li>Sunday: Closed</li>
            </ul>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
};

// Footer
const Footer = ({ onNavClick }) => {
  const handleClick = (e, href) => {
    if (href.startsWith('#')) {
      e.preventDefault();
      onNavClick(e, href);
    }
  };

  return (
    <footer className="bg-gray-900 text-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 flex items-center justify-center">
                <img src="/logo.png" alt="GGC Township Logo" className="w-10 h-10 object-contain" />
              </div>
              <span className="font-bold text-lg">GGC Township</span>
            </div>
            <p className="text-gray-400 text-sm mb-4">
              Leading the future of education with AI-enhanced admission management, ensuring transparency, efficiency, and excellence.
            </p>
            <div className="space-y-2 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <span>✉️</span> muah327@gmail.com
              </div>
              <div className="flex items-center gap-2">
                <span>📞</span> 03456572787
              </div>
              <div className="flex items-center gap-2">
                <span>📍</span> Township, Lahore, Pakistan
              </div>
            </div>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="#home" onClick={(e) => handleClick(e, '#home')} className="hover:text-cyan-400 transition-colors cursor-pointer">Home</a></li>
              <li><a href="#about" onClick={(e) => handleClick(e, '#about')} className="hover:text-cyan-400 transition-colors cursor-pointer">About</a></li>
              <li><a href="#problem" onClick={(e) => handleClick(e, '#problem')} className="hover:text-cyan-400 transition-colors cursor-pointer">The Problem</a></li>
              <li><a href="#solution" onClick={(e) => handleClick(e, '#solution')} className="hover:text-cyan-400 transition-colors cursor-pointer">Solution</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Resources</h4>
            <ul className="space-y-2 text-sm text-gray-400">
              <li><a href="#faq" onClick={(e) => handleClick(e, '#faq')} className="hover:text-cyan-400 transition-colors cursor-pointer">FAQ</a></li>
              <li><a href="#contact" onClick={(e) => handleClick(e, '#contact')} className="hover:text-cyan-400 transition-colors cursor-pointer">Contact Us</a></li>
              <li><Link to="/privacy" className="hover:text-cyan-400 transition-colors cursor-pointer">Privacy Policy</Link></li>
              <li><Link to="/terms" className="hover:text-cyan-400 transition-colors cursor-pointer">Terms of Service</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Stay Updated</h4>
            <p className="text-sm text-gray-400 mb-4">
              Subscribe to get the latest updates on admissions and college news.
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                placeholder="Your email"
                className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-cyan-500 outline-none"
              />
              <button className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 rounded-lg text-sm font-medium transition-colors">
                Join
              </button>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-gray-400">
            © 2026 Government Graduate College Township Lahore. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <motion.a
              href="#"
              whileHover={{ scale: 1.1, y: -2 }}
              className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-cyan-500 transition-colors"
              aria-label="Facebook"
            >
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
              </svg>
            </motion.a>
            <motion.a
              href="#"
              whileHover={{ scale: 1.1, y: -2 }}
              className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-cyan-500 transition-colors"
              aria-label="Twitter"
            >
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </motion.a>
            <motion.a
              href="#"
              whileHover={{ scale: 1.1, y: -2 }}
              className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-cyan-500 transition-colors"
              aria-label="LinkedIn"
            >
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
              </svg>
            </motion.a>
            <motion.a
              href="#"
              whileHover={{ scale: 1.1, y: -2 }}
              className="w-10 h-10 bg-gray-800 rounded-lg flex items-center justify-center hover:bg-cyan-500 transition-colors"
              aria-label="Instagram"
            >
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12.315 2c2.43 0 2.784.013 3.808.06 1.064.049 1.791.218 2.427.465a4.902 4.902 0 011.772 1.153 4.902 4.902 0 011.153 1.772c.247.636.416 1.363.465 2.427.048 1.067.06 1.407.06 4.123v.08c0 2.643-.012 2.987-.06 4.043-.049 1.064-.218 1.791-.465 2.427a4.902 4.902 0 01-1.153 1.772 4.902 4.902 0 01-1.772 1.153c-.636.247-1.363.416-2.427.465-1.067.048-1.407.06-4.123.06h-.08c-2.643 0-2.987-.012-4.043-.06-1.064-.049-1.791-.218-2.427-.465a4.902 4.902 0 01-1.772-1.153 4.902 4.902 0 01-1.153-1.772c-.247-.636-.416-1.363-.465-2.427-.047-1.024-.06-1.379-.06-3.808v-.63c0-2.43.013-2.784.06-3.808.049-1.064.218-1.791.465-2.427a4.902 4.902 0 011.153-1.772A4.902 4.902 0 015.45 2.525c.636-.247 1.363-.416 2.427-.465C8.901 2.013 9.256 2 11.685 2h.63zm-.081 1.802h-.468c-2.456 0-2.784.011-3.807.058-.975.045-1.504.207-1.857.344-.467.182-.8.398-1.15.748-.35.35-.566.683-.748 1.15-.137.353-.3.882-.344 1.857-.047 1.023-.058 1.351-.058 3.807v.468c0 2.456.011 2.784.058 3.807.045.975.207 1.504.344 1.857.182.466.399.8.748 1.15.35.35.683.566 1.15.748.353.137.882.3 1.857.344 1.054.048 1.37.058 4.041.058h.08c2.597 0 2.917-.01 3.96-.058.976-.045 1.505-.207 1.858-.344.466-.182.8-.398 1.15-.748.35-.35.566-.683.748-1.15.137-.353.3-.882.344-1.857.048-1.055.058-1.37.058-4.041v-.08c0-2.597-.01-2.917-.058-3.96-.045-.976-.207-1.505-.344-1.858a3.097 3.097 0 00-.748-1.15 3.098 3.098 0 00-1.15-.748c-.353-.137-.882-.3-1.857-.344-1.023-.047-1.351-.058-3.807-.058zM12 6.865a5.135 5.135 0 110 10.27 5.135 5.135 0 010-10.27zm0 1.802a3.333 3.333 0 100 6.666 3.333 3.333 0 000-6.666zm5.338-3.205a1.2 1.2 0 110 2.4 1.2 1.2 0 010-2.4z" />
              </svg>
            </motion.a>
          </div>
        </div>
      </div>
    </footer>
  );
};

// Main Landing Page Component
const LandingPage = () => {
  const handleNavClick = (e, href) => {
    e.preventDefault();
    const element = document.querySelector(href);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-white">
      <Navigation onNavClick={handleNavClick} />
      <HeroSection />
      <AboutSection />
      <ProblemSection />
      <SolutionSection />
      <FAQSection />
      <ContactSection />
      <Footer onNavClick={handleNavClick} />
    </div>
  );
};

export default LandingPage;
