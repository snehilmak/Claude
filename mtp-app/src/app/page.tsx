import Link from 'next/link';
import {
  ArrowRight,
  BarChart3,
  Building2,
  CheckCircle,
  FileText,
  Globe,
  Shield,
  Users,
  Zap,
} from 'lucide-react';

const features = [
  {
    icon: BarChart3,
    title: 'Transaction Tracking',
    description:
      'Monitor every transfer in real time. Track status, control numbers, and confirmation details across all your money transfer companies.',
  },
  {
    icon: Users,
    title: 'Customer Management',
    description:
      'Maintain a complete customer database with ID verification, compliance flags, and full transfer history per sender.',
  },
  {
    icon: Globe,
    title: 'Multi-Company Rates',
    description:
      'Work with Intermex, Vigo, Ria, Barri, Maxi, MoneyGram, ViaAmericas, and more — all from a single unified dashboard.',
  },
  {
    icon: FileText,
    title: 'Compliance Reports',
    description:
      'Automatically flag CTR-eligible transactions over $1,000 daily aggregate. Generate audit-ready reports in seconds.',
  },
  {
    icon: Shield,
    title: 'Built-in Compliance',
    description:
      'Stay ahead of BSA/AML requirements with built-in SAR tracking, CTR reporting, and customer due diligence workflows.',
  },
  {
    icon: Zap,
    title: 'Fast & Reliable',
    description:
      'Process transfers in under 60 seconds. Optimized for the busy pace of your agency floor, with offline-tolerant design.',
  },
];

const companies = [
  'Intermex',
  'Vigo',
  'Ria',
  'Barri',
  'Maxi',
  'MoneyGram',
  'ViaAmericas',
  'Western Union',
  'Sigue',
  'Dolex',
];

const pricingFeatures = [
  'Unlimited transactions',
  'All money transfer companies',
  'Customer management',
  'Compliance & CTR reporting',
  'Multi-user access',
  'Email support',
  'Data export (CSV/PDF)',
  'Audit trail & logs',
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-slate-100 bg-white sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-900">TransferPro</span>
            </div>
            <div className="flex items-center gap-4">
              <Link
                href="/login"
                className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/register"
                className="text-sm font-medium bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Get started
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 text-white py-24 px-4">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-blue-600/20 border border-blue-500/30 rounded-full px-4 py-1.5 mb-6">
            <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
            <span className="text-sm text-blue-300 font-medium">Built for money transfer agencies</span>
          </div>
          <h1 className="text-5xl sm:text-6xl font-bold leading-tight tracking-tight mb-6">
            Manage every transfer.
            <br />
            <span className="text-blue-400">Stay compliant. Grow faster.</span>
          </h1>
          <p className="text-xl text-slate-300 max-w-2xl mx-auto mb-10">
            TransferPro is the all-in-one platform for businesses that process in-person money
            transfers. Unify Intermex, Ria, Vigo, MoneyGram, and more — with compliance built in
            from day one.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/register"
              className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-8 py-4 rounded-xl transition-colors text-lg"
            >
              Start free trial
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white font-semibold px-8 py-4 rounded-xl transition-colors text-lg"
            >
              Sign in to dashboard
            </Link>
          </div>
          <p className="text-sm text-slate-400 mt-4">14-day free trial · No credit card required</p>
        </div>
      </section>

      {/* Supported companies */}
      <section className="bg-slate-50 py-12 px-4 border-b border-slate-100">
        <div className="max-w-7xl mx-auto">
          <p className="text-center text-sm font-semibold text-slate-500 uppercase tracking-widest mb-8">
            Works with all major transfer companies
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            {companies.map((company) => (
              <span
                key={company}
                className="bg-white border border-slate-200 text-slate-700 font-medium px-4 py-2 rounded-lg text-sm shadow-sm"
              >
                {company}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Everything your agency needs
            </h2>
            <p className="text-xl text-slate-500 max-w-2xl mx-auto">
              From the first customer interaction to end-of-day reporting, TransferPro covers every
              step of your money transfer workflow.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className="bg-white border border-slate-200 rounded-2xl p-6 hover:shadow-md transition-shadow"
                >
                  <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center mb-4">
                    <Icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">{feature.title}</h3>
                  <p className="text-slate-500 leading-relaxed">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="bg-slate-50 py-24 px-4" id="pricing">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">Simple, transparent pricing</h2>
            <p className="text-xl text-slate-500">One plan. Everything included. No surprises.</p>
          </div>
          <div className="max-w-md mx-auto">
            <div className="bg-white border-2 border-blue-600 rounded-2xl p-8 shadow-xl relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="bg-blue-600 text-white text-sm font-semibold px-4 py-1.5 rounded-full">
                  Most popular
                </span>
              </div>
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-slate-900 mb-2">Agency Plan</h3>
                <div className="flex items-end justify-center gap-1">
                  <span className="text-5xl font-bold text-slate-900">$49</span>
                  <span className="text-slate-500 mb-2">/location/month</span>
                </div>
                <p className="text-sm text-slate-500 mt-2">
                  Billed monthly · Add more locations anytime
                </p>
              </div>
              <ul className="space-y-3 mb-8">
                {pricingFeatures.map((feat) => (
                  <li key={feat} className="flex items-center gap-3">
                    <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                    <span className="text-slate-700">{feat}</span>
                  </li>
                ))}
              </ul>
              <Link
                href="/register"
                className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-xl transition-colors text-lg"
              >
                Start free trial
              </Link>
              <p className="text-center text-sm text-slate-400 mt-3">14 days free · No credit card</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-blue-600 py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-bold text-white mb-4">
            Ready to streamline your agency?
          </h2>
          <p className="text-blue-100 text-xl mb-8 max-w-2xl mx-auto">
            Join hundreds of money transfer agencies using TransferPro to process faster, stay
            compliant, and grow their business.
          </p>
          <Link
            href="/register"
            className="inline-flex items-center gap-2 bg-white text-blue-600 font-bold px-10 py-4 rounded-xl hover:bg-blue-50 transition-colors text-lg"
          >
            Create your free account
            <ArrowRight className="w-5 h-5" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12 px-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-blue-600 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-white">TransferPro</span>
          </div>
          <p className="text-sm">
            &copy; {new Date().getFullYear()} TransferPro. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm">
            <Link href="/login" className="hover:text-white transition-colors">
              Sign in
            </Link>
            <Link href="/register" className="hover:text-white transition-colors">
              Register
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
