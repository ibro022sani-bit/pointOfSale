import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowDown,
  ArrowRight,
  BadgeCheck,
  Building2,
  CheckCircle2,
  ChevronRight,
  Globe2,
  Handshake,
  Menu,
  Package,
  ShieldCheck,
  ShoppingBag,
  Truck,
  Users,
  X,
} from 'lucide-react';

const company = {
  name: 'Almubeen General Enterprises',
  location: 'Nigeria',
  phone: '', // Add your official phone number
  email: '', // Add your official business email
  address: '', // Add your business address
};

const services = [
  {
    number: '01',
    icon: ShoppingBag,
    title: 'General Merchandise',
    description:
      'A broad range of products and essential goods to meet individual, business, and organizational needs.',
  },
  {
    number: '02',
    icon: Package,
    title: 'Product Sourcing',
    description:
      'Helping customers source suitable products with attention to quality, value, and availability.',
  },
  {
    number: '03',
    icon: Truck,
    title: 'Supply & Distribution',
    description:
      'Reliable supply solutions designed to help customers obtain the products they need efficiently.',
  },
  {
    number: '04',
    icon: Handshake,
    title: 'Business Partnerships',
    description:
      'Building lasting commercial relationships with customers, suppliers, and business partners.',
  },
];

const benefits = [
  {
    icon: ShieldCheck,
    title: 'Trust & Integrity',
    description:
      'We believe in honest dealings, clear communication, and responsible business practices.',
  },
  {
    icon: BadgeCheck,
    title: 'Quality Focus',
    description:
      'We aim to provide suitable products and dependable service for every business relationship.',
  },
  {
    icon: Users,
    title: 'Customer First',
    description:
      'We value every customer and work to understand their needs and expectations.',
  },
];

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);

  const closeMenu = () => setMenuOpen(false);

  return (
    <div className="min-h-screen overflow-hidden bg-white font-sans text-slate-900">
      {/* Top announcement bar */}
      <div className="bg-[#101d35] px-4 py-2.5 text-center text-xs font-medium tracking-wide text-white sm:text-sm">
        Your trusted partner for general trading and supplies.
      </div>

      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white/95 backdrop-blur-lg">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 sm:px-8 lg:px-10">
          <a
            href="#home"
            onClick={closeMenu}
            className="flex min-w-0 items-center gap-3"
            aria-label="Almubeen General Enterprises home"
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#101d35] text-amber-400 shadow-md">
              <Building2 size={26} strokeWidth={1.8} />
            </div>

            <div className="min-w-0">
              <span className="block text-sm font-extrabold leading-tight tracking-tight text-[#101d35] sm:text-base">
                ALMUBEEN
              </span>
              <span className="mt-1 block text-[9px] font-bold uppercase tracking-[0.19em] text-amber-600 sm:text-[10px]">
                General Enterprises
              </span>
            </div>
          </a>

          <div className="hidden items-center gap-8 lg:flex">
            <a href="#home" className="text-sm font-semibold text-slate-700 transition hover:text-amber-600">
              Home
            </a>
            <a href="#about" className="text-sm font-semibold text-slate-700 transition hover:text-amber-600">
              About Us
            </a>
            <a href="#services" className="text-sm font-semibold text-slate-700 transition hover:text-amber-600">
              Our Services
            </a>
            <a href="#why-us" className="text-sm font-semibold text-slate-700 transition hover:text-amber-600">
              Why Choose Us
            </a>
            <a href="#contact" className="text-sm font-semibold text-slate-700 transition hover:text-amber-600">
              Contact
            </a>
          </div>

          <div className="hidden items-center gap-4 lg:flex">
            <Link
              to="/login"
              className="text-sm font-bold text-[#101d35] transition hover:text-amber-600"
            >
              Staff Login
            </Link>
            <a
              href="#contact"
              className="inline-flex items-center gap-2 rounded-lg bg-amber-500 px-5 py-3 text-sm font-bold text-[#101d35] transition hover:bg-amber-400"
            >
              Get in Touch <ArrowRight size={16} />
            </a>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-slate-200 text-[#101d35] lg:hidden"
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? <X size={23} /> : <Menu size={23} />}
          </button>
        </nav>

        {menuOpen && (
          <div className="border-t border-slate-100 bg-white px-5 py-5 shadow-lg lg:hidden">
            <div className="mx-auto flex max-w-7xl flex-col gap-1">
              {[
                ['Home', '#home'],
                ['About Us', '#about'],
                ['Our Services', '#services'],
                ['Why Choose Us', '#why-us'],
                ['Contact', '#contact'],
              ].map(([label, href]) => (
                <a
                  key={href}
                  href={href}
                  onClick={closeMenu}
                  className="rounded-lg px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-amber-600"
                >
                  {label}
                </a>
              ))}

              <Link
                to="/login"
                onClick={closeMenu}
                className="mt-2 rounded-lg border border-slate-200 px-4 py-3 text-center text-sm font-bold text-[#101d35]"
              >
                Staff Login
              </Link>

              <a
                href="#contact"
                onClick={closeMenu}
                className="mt-2 rounded-lg bg-amber-500 px-4 py-3 text-center text-sm font-bold text-[#101d35]"
              >
                Get in Touch
              </a>
            </div>
          </div>
        )}
      </header>

      <main>
        {/* Hero */}
        <section id="home" className="relative isolate bg-[#101d35]">
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <div className="absolute -right-20 -top-20 h-96 w-96 rounded-full border border-white/10" />
            <div className="absolute -right-5 top-10 h-72 w-72 rounded-full border border-amber-400/20" />
            <div className="absolute -bottom-44 left-1/3 h-96 w-96 rounded-full bg-blue-400/5 blur-3xl" />
            <div className="absolute inset-0 opacity-[0.06] [background-image:linear-gradient(rgba(255,255,255,0.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.5)_1px,transparent_1px)] [background-size:50px_50px]" />
          </div>

          <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 py-20 sm:px-8 sm:py-28 lg:grid-cols-[1.1fr_0.9fr] lg:px-10 lg:py-32">
            <div>
              <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-amber-300 sm:text-sm">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                Excellence in General Trading
              </div>

              <h1 className="max-w-3xl text-4xl font-black leading-[1.12] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-[4.25rem]">
                Your Trusted Partner in{' '}
                <span className="text-amber-400">Trade & Supplies.</span>
              </h1>

              <p className="mt-7 max-w-xl text-base leading-8 text-slate-300 sm:text-lg">
                Welcome to Almubeen General Enterprises. We are focused on
                connecting customers and businesses with products and supply
                solutions that support their everyday needs and business goals.
              </p>

              <div className="mt-9 flex flex-col gap-4 sm:flex-row">
                <a
                  href="#services"
                  className="inline-flex items-center justify-center gap-3 rounded-lg bg-amber-500 px-7 py-4 font-bold text-[#101d35] shadow-lg shadow-black/10 transition hover:-translate-y-0.5 hover:bg-amber-400"
                >
                  Explore Our Services <ArrowRight size={18} />
                </a>

                <a
                  href="#about"
                  className="inline-flex items-center justify-center gap-3 rounded-lg border border-white/20 px-7 py-4 font-bold text-white transition hover:border-amber-400 hover:text-amber-300"
                >
                  Discover Our Company <ChevronRight size={18} />
                </a>
              </div>

              <div className="mt-12 flex flex-wrap gap-x-7 gap-y-4 border-t border-white/15 pt-7">
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <CheckCircle2 size={17} className="text-amber-400" />
                  Customer-focused service
                </div>
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <CheckCircle2 size={17} className="text-amber-400" />
                  Business partnerships
                </div>
              </div>
            </div>

            {/* Hero visual */}
            <div className="relative mx-auto w-full max-w-lg lg:max-w-none">
              <div className="absolute -inset-4 rounded-[2rem] border border-amber-400/20" />

              <div className="relative overflow-hidden rounded-[1.5rem] border border-white/10 bg-[#182943] p-6 shadow-2xl sm:p-9">
                <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-amber-400/10 blur-3xl" />

                <div className="relative flex items-center justify-between border-b border-white/10 pb-6">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-400">
                      Our Commitment
                    </p>
                    <h2 className="mt-2 text-2xl font-extrabold text-white">
                      Trade with Confidence
                    </h2>
                  </div>
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-400 text-[#101d35]">
                    <Globe2 size={29} />
                  </div>
                </div>

                <div className="relative mt-7 space-y-4">
                  {[
                    {
                      icon: Package,
                      title: 'Product Solutions',
                      detail: 'Products to suit your requirements',
                    },
                    {
                      icon: Truck,
                      title: 'Supply Support',
                      detail: 'Practical and organized service',
                    },
                    {
                      icon: Handshake,
                      title: 'Lasting Relationships',
                      detail: 'Partnerships built on trust',
                    },
                  ].map((item) => {
                    const Icon = item.icon;

                    return (
                      <div
                        key={item.title}
                        className="flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.04] p-4 transition hover:border-amber-400/40 hover:bg-white/[0.07]"
                      >
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-400/10 text-amber-400">
                          <Icon size={23} />
                        </div>
                        <div>
                          <h3 className="font-bold text-white">{item.title}</h3>
                          <p className="mt-1 text-sm text-slate-400">
                            {item.detail}
                          </p>
                        </div>
                        <ChevronRight
                          size={18}
                          className="ml-auto shrink-0 text-slate-500"
                        />
                      </div>
                    );
                  })}
                </div>

                <div className="relative mt-7 rounded-xl bg-amber-400 p-5">
                  <p className="text-xs font-extrabold uppercase tracking-[0.17em] text-[#101d35]/70">
                    Our Business Philosophy
                  </p>
                  <p className="mt-2 text-lg font-extrabold leading-snug text-[#101d35]">
                    Creating value through service, trust, and opportunity.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <a
            href="#about"
            aria-label="Scroll to about section"
            className="absolute bottom-5 left-1/2 hidden -translate-x-1/2 text-white/50 transition hover:text-amber-400 lg:block"
          >
            <ArrowDown size={22} />
          </a>
        </section>

        {/* Company highlights */}
        <section className="border-b border-slate-100 bg-white">
          <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-5 py-8 sm:grid-cols-3 sm:px-8 lg:px-10">
            {[
              {
                icon: Building2,
                title: 'Business Oriented',
                text: 'Solutions for individual and business needs',
              },
              {
                icon: ShieldCheck,
                title: 'Integrity Driven',
                text: 'Professional and responsible dealings',
              },
              {
                icon: Handshake,
                title: 'Relationship Focused',
                text: 'Building long-term business connections',
              },
            ].map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className="flex items-center gap-4 sm:justify-center"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                    <Icon size={24} />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-[#101d35]">
                      {item.title}
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">{item.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* About */}
        <section id="about" className="scroll-mt-24 bg-slate-50 py-20 sm:py-28">
          <div className="mx-auto grid max-w-7xl items-center gap-14 px-5 sm:px-8 lg:grid-cols-2 lg:px-10">
            <div className="relative">
              <div className="rounded-3xl bg-[#101d35] p-7 sm:p-10">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-400 text-[#101d35]">
                  <Building2 size={34} />
                </div>

                <p className="mt-10 text-xs font-extrabold uppercase tracking-[0.2em] text-amber-400">
                  Who We Are
                </p>

                <h3 className="mt-3 text-3xl font-black leading-tight text-white sm:text-4xl">
                  Business built around people and possibilities.
                </h3>

                <p className="mt-5 leading-8 text-slate-300">
                  We aim to make business transactions straightforward by
                  understanding customer needs, communicating clearly, and
                  focusing on dependable service.
                </p>

                <div className="mt-8 border-t border-white/15 pt-6">
                  <p className="text-sm font-bold text-amber-300">
                    ALMUBEEN GENERAL ENTERPRISES
                  </p>
                  <p className="mt-2 text-sm text-slate-400">
                    General trading · Merchandise · Supply solutions
                  </p>
                </div>
              </div>

              <div className="absolute -bottom-4 -right-3 -z-10 h-28 w-28 rounded-3xl bg-amber-400/30 sm:-right-5" />
            </div>

            <div>
              <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-amber-600">
                About Our Company
              </p>

              <h2 className="mt-4 text-3xl font-black leading-tight tracking-tight text-[#101d35] sm:text-4xl lg:text-5xl">
                Connecting needs with the right opportunities.
              </h2>

              <p className="mt-6 leading-8 text-slate-600">
                Almubeen General Enterprises is a general trading business
                committed to serving customers through merchandise, product
                sourcing, supply, and commercial relationships.
              </p>

              <p className="mt-4 leading-8 text-slate-600">
                We understand that trust, communication, and consistency matter
                in business. Our goal is to develop lasting relationships by
                approaching every customer and business opportunity with
                professionalism.
              </p>

              <div className="mt-8 space-y-4">
                {[
                  'A customer-focused approach',
                  'Clear and professional communication',
                  'Commitment to responsible business practices',
                ].map((item) => (
                  <div key={item} className="flex items-start gap-3">
                    <CheckCircle2
                      size={21}
                      className="mt-0.5 shrink-0 text-amber-600"
                    />
                    <span className="font-medium text-slate-700">{item}</span>
                  </div>
                ))}
              </div>

              <a
                href="#contact"
                className="mt-9 inline-flex items-center gap-2 font-extrabold text-[#101d35] transition hover:text-amber-600"
              >
                Connect With Our Team <ArrowRight size={18} />
              </a>
            </div>
          </div>
        </section>

        {/* Services */}
        <section id="services" className="scroll-mt-24 bg-white py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <div className="mx-auto max-w-3xl text-center">
              <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-amber-600">
                What We Do
              </p>

              <h2 className="mt-4 text-3xl font-black tracking-tight text-[#101d35] sm:text-4xl lg:text-5xl">
                Practical solutions for your business needs.
              </h2>

              <p className="mt-5 leading-8 text-slate-600">
                Explore our core areas of business and discover how we aim to
                support customers, organizations, and commercial partners.
              </p>
            </div>

            <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {services.map((service) => {
                const Icon = service.icon;

                return (
                  <article
                    key={service.number}
                    className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white p-7 transition duration-300 hover:-translate-y-2 hover:border-amber-300 hover:shadow-xl hover:shadow-slate-900/5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[#101d35] text-amber-400 transition group-hover:bg-amber-400 group-hover:text-[#101d35]">
                        <Icon size={27} />
                      </div>
                      <span className="text-sm font-black tracking-widest text-slate-300">
                        {service.number}
                      </span>
                    </div>

                    <h3 className="mt-7 text-xl font-extrabold text-[#101d35]">
                      {service.title}
                    </h3>

                    <p className="mt-4 flex-1 text-sm leading-7 text-slate-600">
                      {service.description}
                    </p>

                    <a
                      href="#contact"
                      className="mt-7 inline-flex items-center gap-2 text-sm font-extrabold text-[#101d35] transition group-hover:text-amber-600"
                    >
                      Make an Enquiry
                      <ArrowRight
                        size={16}
                        className="transition group-hover:translate-x-1"
                      />
                    </a>

                    <div className="absolute bottom-0 left-0 h-1 w-0 bg-amber-400 transition-all duration-300 group-hover:w-full" />
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        {/* Why choose us */}
        <section id="why-us" className="scroll-mt-24 bg-slate-50 py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-center">
              <div>
                <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-amber-600">
                  Why Almubeen
                </p>

                <h2 className="mt-4 text-3xl font-black leading-tight tracking-tight text-[#101d35] sm:text-4xl lg:text-5xl">
                  A business relationship you can build on.
                </h2>

                <p className="mt-6 leading-8 text-slate-600">
                  Choosing a trading partner is about more than products. It
                  is also about trust, communication, and the way business is
                  conducted.
                </p>

                <a
                  href="#contact"
                  className="mt-8 inline-flex items-center gap-3 rounded-lg bg-[#101d35] px-6 py-4 font-bold text-white transition hover:bg-[#1c3153]"
                >
                  Let's Discuss Your Needs <ArrowRight size={18} />
                </a>
              </div>

              <div className="space-y-5">
                {benefits.map((benefit) => {
                  const Icon = benefit.icon;

                  return (
                    <div
                      key={benefit.title}
                      className="flex gap-5 rounded-2xl border border-slate-200 bg-white p-6 sm:p-7"
                    >
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                        <Icon size={27} />
                      </div>

                      <div>
                        <h3 className="text-lg font-extrabold text-[#101d35]">
                          {benefit.title}
                        </h3>
                        <p className="mt-2 text-sm leading-7 text-slate-600">
                          {benefit.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Contact CTA */}
        <section id="contact" className="scroll-mt-24 bg-[#101d35] py-20 sm:py-24">
          <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
            <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-[#182943] p-7 sm:p-12 lg:p-16">
              <div className="absolute -right-20 -top-28 h-80 w-80 rounded-full border border-amber-400/20" />
              <div className="absolute -bottom-32 -right-5 h-72 w-72 rounded-full bg-amber-400/10 blur-3xl" />

              <div className="relative grid gap-10 lg:grid-cols-[1fr_auto] lg:items-center">
                <div className="max-w-2xl">
                  <p className="text-sm font-extrabold uppercase tracking-[0.2em] text-amber-400">
                    Let's Work Together
                  </p>

                  <h2 className="mt-4 text-3xl font-black leading-tight text-white sm:text-4xl lg:text-5xl">
                    Have a product or supply enquiry?
                  </h2>

                  <p className="mt-5 leading-8 text-slate-300">
                    We welcome enquiries from customers, organizations, and
                    prospective business partners. Get in touch to discuss your
                    requirements and explore how we can work together.
                  </p>
                </div>

                <a
                  href={
                    company.email
                      ? `mailto:${company.email}`
                      : company.phone
                        ? `tel:${company.phone}`
                        : '#footer'
                  }
                  className="inline-flex items-center justify-center gap-3 rounded-lg bg-amber-500 px-7 py-4 font-extrabold text-[#101d35] transition hover:-translate-y-0.5 hover:bg-amber-400"
                >
                  Contact Our Business <ArrowRight size={18} />
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer id="footer" className="bg-white">
        <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:px-10">
          <div className="grid gap-10 border-b border-slate-200 pb-10 md:grid-cols-2 lg:grid-cols-[1.4fr_0.8fr_1fr]">
            <div>
              <a href="#home" className="inline-flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#101d35] text-amber-400">
                  <Building2 size={26} />
                </div>
                <div>
                  <span className="block font-extrabold text-[#101d35]">
                    ALMUBEEN
                  </span>
                  <span className="mt-1 block text-[10px] font-bold uppercase tracking-[0.16em] text-amber-600">
                    General Enterprises
                  </span>
                </div>
              </a>

              <p className="mt-5 max-w-sm text-sm leading-7 text-slate-500">
                Your partner for general trading, merchandise, supply
                solutions, and lasting business relationships.
              </p>
            </div>

            <div>
              <h3 className="font-extrabold text-[#101d35]">Quick Links</h3>
              <div className="mt-5 flex flex-col items-start gap-3 text-sm text-slate-500">
                <a href="#home" className="transition hover:text-amber-600">Home</a>
                <a href="#about" className="transition hover:text-amber-600">About Us</a>
                <a href="#services" className="transition hover:text-amber-600">Our Services</a>
                <a href="#contact" className="transition hover:text-amber-600">Contact Us</a>
              </div>
            </div>

            <div>
              <h3 className="font-extrabold text-[#101d35]">Contact Information</h3>

              <div className="mt-5 space-y-4 text-sm text-slate-500">
                {company.phone ? (
                  <a
                    href={`tel:${company.phone}`}
                    className="block transition hover:text-amber-600"
                  >
                    Phone: {company.phone}
                  </a>
                ) : (
                  <p>Phone: Add your official number</p>
                )}

                {company.email ? (
                  <a
                    href={`mailto:${company.email}`}
                    className="block break-all transition hover:text-amber-600"
                  >
                    Email: {company.email}
                  </a>
                ) : (
                  <p>Email: Add your official email</p>
                )}

                <p>
                  Location: {company.address || company.location}
                </p>
              </div>

              <Link
                to="/login"
                className="mt-6 inline-flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-bold text-[#101d35] transition hover:border-amber-400 hover:text-amber-600"
              >
                Staff Login <ArrowRight size={15} />
              </Link>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-6 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
            <p>
              © {new Date().getFullYear()} {company.name}. All rights reserved.
            </p>
            <a href="#home" className="font-semibold transition hover:text-amber-600">
              Back to top ↑
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}