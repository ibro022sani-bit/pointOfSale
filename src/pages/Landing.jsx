import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Bird,
  CheckCircle2,
  ChevronRight,
  Headphones,
  Leaf,
  MessageCircle,
  Package,
  Phone,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  Truck,
  Users,
  Wallet,
  Wheat,
  HeartHandshake,
} from 'lucide-react'

import Logo from '../components/common/Logo'
import InstallButton from '../components/common/InstallButton'

function Facebook({ size = 24, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M14 8h3V4h-3c-2.8 0-5 2.2-5 5v2H6v4h3v5h4v-5h3l1-4h-4V9c0-.6.4-1 1-1z" />
    </svg>
  )
}
function WhatsApp({ size = 24, className = '' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M20.5 3.5A11.9 11.9 0 0 0 12.03 0C5.46 0 .11 5.34.11 11.91c0 2.1.55 4.15 1.6 5.96L.02 24l6.27-1.64a11.9 11.9 0 0 0 5.74 1.46h.01c6.56 0 11.91-5.34 11.91-11.91 0-3.18-1.24-6.17-3.45-8.41ZM12.04 21.7h-.01a9.8 9.8 0 0 1-5-1.37l-.36-.21-3.72.98.99-3.63-.23-.37a9.8 9.8 0 1 1 8.33 4.6Zm5.37-7.34c-.29-.15-1.72-.85-1.99-.94-.27-.1-.46-.15-.65.15-.19.29-.75.94-.92 1.13-.17.19-.34.22-.63.07-.29-.15-1.22-.45-2.33-1.44-.86-.77-1.44-1.72-1.61-2.01-.17-.29-.02-.45.13-.6.13-.13.29-.34.44-.51.15-.17.19-.29.29-.48.1-.19.05-.36-.02-.51-.07-.15-.65-1.58-.89-2.16-.23-.56-.47-.48-.65-.49h-.55c-.19 0-.51.07-.78.36-.27.29-1.02.99-1.02 2.42s1.04 2.81 1.18 3c.15.19 2.05 3.13 4.97 4.39.69.3 1.23.48 1.65.61.69.22 1.32.19 1.82.12.55-.08 1.72-.7 1.96-1.37.24-.68.24-1.26.17-1.38-.07-.12-.27-.19-.56-.34Z" />
    </svg>
  )
}
function Landing() {
  const WHATSAPP_NUMBER = '2348064713835'

  const whatsappChat = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(
    'Hello Sadeeq Agrovet, I need some assistance.'
  )}`

  // Replace these with your actual community links
  const FACEBOOK_COMMUNITY = 'https://facebook.com/profile.php?id=100054411492776'
  const WHATSAPP_COMMUNITY = 'https://chat.whatsapp.com/YOUR_COMMUNITY_LINK'

  return (
    <div className="min-h-screen bg-white text-gray-800 overflow-hidden">
      {/* =========================================================
          NAVIGATION
      ========================================================== */}
      <header className="sticky top-0 z-50 border-b border-green-100/80 bg-white/90 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-20 flex items-center justify-between">
            <Logo
              size={42}
              subtitle="AND GENERAL MERCHANT"
              textClassName="text-base"
            />

            <nav className="hidden lg:flex items-center gap-8 text-sm font-medium text-gray-600">
              <a
                href="#about"
                className="hover:text-green-600 transition"
              >
                About Us
              </a>

              <a
                href="#services"
                className="hover:text-green-600 transition"
              >
                What We Offer
              </a>

              <a
                href="#why-us"
                className="hover:text-green-600 transition"
              >
                Why Us
              </a>

              <a
                href="#community"
                className="hover:text-green-600 transition"
              >
                Community
              </a>

              <a
                href="#contact"
                className="hover:text-green-600 transition"
              >
                Contact
              </a>
            </nav>

            <div className="flex items-center gap-3">
              <InstallButton />

              <Link
                to="/customer/login"
                className="hidden sm:inline-flex items-center justify-center px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-700 hover:border-green-300 hover:text-green-700 transition"
              >
                Login
              </Link>

              <Link
                to="/customer/register"
                className="hidden sm:inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white text-sm font-semibold shadow-lg shadow-green-600/20 transition"
              >
                Get Started
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* =========================================================
          HERO
      ========================================================== */}
      <section className="relative bg-gradient-to-br from-green-50 via-white to-emerald-50">
        {/* Decorative background */}
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-green-200/30 rounded-full blur-3xl" />
        <div className="absolute top-1/2 -left-40 w-96 h-96 bg-emerald-100/40 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="min-h-[650px] grid lg:grid-cols-2 gap-12 items-center py-16 lg:py-24">
            {/* Hero copy */}
            <div>
              <div className="inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-green-100 text-green-700 text-sm font-semibold mb-6">
                <Sparkles size={15} />
                Growing with you, serving with care
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-gray-900 leading-[1.05]">
                Everything you need
                <span className="block text-green-600">
                  for a better livestock and poultry services
                </span>
              </h1>

              <p className="mt-6 max-w-xl text-lg leading-8 text-gray-600">
                Welcome to Sadeeq Agrovet & General Merchant — your trusted
                partner for quality animal feeds, day-old chicks, farm
                supplies and dependable agricultural support.
              </p>

              {/* Main actions */}
              <div className="mt-8 flex flex-col sm:flex-row gap-3">
                <Link
                  to="/customer/register"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold shadow-xl shadow-green-600/20 transition hover:-translate-y-0.5"
                >
                  Create an account here
                  <ArrowRight size={18} />
                </Link>

                <a
                  href={whatsappChat}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white border border-green-200 text-green-700 hover:bg-green-50 font-bold transition"
                >
                  <MessageCircle size={18} />
                  Message us directly on whatsapp
                </a>
              </div>

              {/* Trust indicators */}
              <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-5">
                <div>
                  <p className="text-2xl font-black text-gray-900">100%</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Customer focused
                  </p>
                </div>

                <div>
                  <p className="text-2xl font-black text-gray-900">24/7</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Online access
                  </p>
                </div>

                <div>
                  <p className="text-2xl font-black text-gray-900">Fast</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Order processing
                  </p>
                </div>

                <div>
                  <p className="text-2xl font-black text-gray-900">Trusted</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Supports
                  </p>
                </div>
              </div>
            </div>

            {/* Hero visual */}
            <div className="relative">
              <div className="relative rounded-[2rem] bg-gradient-to-br from-green-600 to-emerald-800 p-1 shadow-2xl shadow-green-900/20">
                <div className="rounded-[1.85rem] bg-white overflow-hidden">
                  {/* Top visual area */}
                  <div className="relative h-72 sm:h-80 bg-gradient-to-br from-green-100 to-emerald-50 flex items-center justify-center">
                    <div className="absolute inset-0 opacity-30">
                      <div className="absolute top-10 left-10 w-20 h-20 rounded-full bg-green-300 blur-xl" />
                      <div className="absolute bottom-10 right-10 w-28 h-28 rounded-full bg-emerald-300 blur-xl" />
                    </div>

                    <div className="relative w-48 h-48 rounded-full bg-white shadow-xl flex items-center justify-center">
                      <div className="w-36 h-36 rounded-full bg-green-50 flex items-center justify-center">
                        <Wheat
                          size={82}
                          strokeWidth={1.3}
                          className="text-green-600"
                        />
                      </div>
                    </div>

                    {/* Floating cards */}
                    <div className="absolute top-6 left-5 bg-white rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-green-100 flex items-center justify-center">
                        <Bird
                          size={19}
                          className="text-green-600"
                        />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">
                          Available
                        </p>
                        <p className="text-sm font-bold">
                          Day-old Chicks
                        </p>
                      </div>
                    </div>

                    <div className="absolute bottom-6 right-5 bg-white rounded-2xl shadow-lg px-4 py-3 flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-100 flex items-center justify-center">
                        <Package
                          size={19}
                          className="text-emerald-600"
                        />
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">
                          Quality
                        </p>
                        <p className="text-sm font-bold">
                          Animal and poultry Supplies
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Card bottom */}
                  <div className="p-6 sm:p-8">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-green-600">
                          Sadeeq Agrovet
                        </p>
                        <h3 className="text-xl font-black mt-1">
                          Your Animals, our commitment.
                        </h3>
                      </div>

                      <div className="w-11 h-11 shrink-0 rounded-xl bg-green-100 flex items-center justify-center">
                        <HeartHandshake
                          className="text-green-600"
                          size={22}
                        />
                      </div>
                    </div>

                    <p className="mt-3 text-sm leading-6 text-gray-500">
                      From your first order to your next harvest, we're
                      here to make agricultural supplies easier.
                    </p>
                  </div>
                </div>
              </div>

              {/* Decorative dots */}
              <div className="absolute -bottom-8 -left-8 grid grid-cols-5 gap-2 opacity-40">
                {Array.from({ length: 25 }).map((_, index) => (
                  <div
                    key={index}
                    className="w-1.5 h-1.5 rounded-full bg-green-500"
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          QUICK ACTIONS
      ========================================================== */}
      <section className="relative -mt-8 z-10 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="grid gap-3 max-w-xs">
            <a
              href={whatsappChat}
              target="_blank"
              rel="noreferrer"
              className="group bg-white rounded-2xl p-5 shadow-xl shadow-gray-900/5 border border-gray-100 hover:border-green-200 hover:-translate-y-1 transition"
            >
              <div className="flex items-center justify-between">
                <div className="w-11 h-11 rounded-xl bg-emerald-100 flex items-center justify-center">
                  <Headphones
                    size={21}
                    className="text-emerald-600"
                  />
                </div>

                <ArrowRight
                  size={18}
                  className="text-gray-300 group-hover:text-green-600 group-hover:translate-x-1 transition"
                />
              </div>

              <h3 className="mt-4 font-bold">Need Help?</h3>
              <p className="text-sm text-gray-500 mt-1">
                Chat directly with our team.
              </p>
            </a>
          </div>
        </div>
      </section>

      {/* =========================================================
          ABOUT US
      ========================================================== */}
      <section id="about" className="py-24 px-4">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <div className="inline-flex items-center gap-2 text-green-600 text-sm font-bold">
              <Leaf size={17} />
              ABOUT SADEEQ AGROVET
            </div>

            <h2 className="mt-4 text-3xl sm:text-4xl font-black text-gray-900 leading-tight">
              Helping farmers get what they need,
              <span className="text-green-600">
                {" "}when they need it.
              </span>
            </h2>

            <p className="mt-6 text-gray-600 leading-8">
              At Sadeeq Agrovet & General Merchant, we believe that
              access to quality agricultural products should be simple,
              reliable and convenient.
            </p>

            <p className="mt-4 text-gray-600 leading-8">
              We serve farmers, poultry keepers and agricultural
              businesses with products and services designed to help
              them operate with confidence and grow sustainably.
            </p>

            <div className="mt-8 space-y-4">
              {[
                'Quality agricultural products',
                'Convenient online ordering',
                'Responsive customer support',
              ].map((item) => (
                <div
                  key={item}
                  className="flex items-center gap-3"
                >
                  <CheckCircle2
                    size={20}
                    className="text-green-600 shrink-0"
                  />
                  <span className="font-medium text-gray-700">
                    {item}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="rounded-[2rem] bg-gradient-to-br from-green-600 to-emerald-700 p-8 sm:p-10 shadow-2xl shadow-green-900/10">
              <div className="bg-white/10 backdrop-blur rounded-3xl p-7 text-white">
                <Leaf size={42} strokeWidth={1.5} />

                <h3 className="text-2xl font-black mt-8">
                  More than a supplier.
                </h3>

                <p className="mt-4 text-green-50 leading-7">
                  We're building a community where farmers can
                  access products, information and support from one
                  convenient place.
                </p>

                <div className="mt-10 grid grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-white/10 p-5">
                    <Users size={23} />
                    <p className="mt-4 text-sm font-bold">
                      Farmer focused
                    </p>
                  </div>

                  <div className="rounded-2xl bg-white/10 p-5">
                    <HeartHandshake size={23} />
                    <p className="mt-4 text-sm font-bold">
                      Service driven
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      

      {/* =========================================================
          WHY US
      ========================================================== */}
      <section id="why-us" className="py-24 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 text-green-600 text-sm font-bold">
              <ShieldCheck size={17} />
              WHY CHOOSE US
            </div>

            <h2 className="mt-4 text-3xl sm:text-4xl font-black">
              Built around your convenience.
            </h2>

            <p className="mt-4 text-gray-500 leading-7">
              We combine agricultural products with technology and
              customer service to make your experience easier.
            </p>
          </div>

          <div className="mt-14 grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center">
                <ShieldCheck
                  size={28}
                  className="text-green-600"
                />
              </div>

              <h3 className="mt-5 font-black text-lg">
                Reliable
              </h3>

              <p className="mt-2 text-sm text-gray-500 leading-6">
                We focus on dependable service and products you can
                confidently plan around.
              </p>
            </div>

            <div className="text-center">
            </div>

            <div className="text-center">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-green-100 flex items-center justify-center">
                <HeartHandshake
                  size={28}
                  className="text-green-600"
                />
              </div>

              <h3 className="mt-5 font-black text-lg">
                Customer First
              </h3>

              <p className="mt-2 text-sm text-gray-500 leading-6">
                Our relationship with you doesn't end after you place
                an order.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          COMMUNITY
      ========================================================== */}
      <section
        id="community"
        className="py-24 px-4 bg-gradient-to-br from-green-50 to-emerald-50"
      >
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-2 text-green-600 text-sm font-bold">
              <Users size={17} />
              JOIN OUR COMMUNITY
            </div>

            <h2 className="mt-4 text-3xl sm:text-4xl font-black">
              Don't just shop with us.
              <span className="block text-green-600">
                Grow with us.
              </span>
            </h2>

            <p className="mt-4 text-gray-500 leading-7">
              Join our online communities for updates, agricultural
              information, product announcements and conversations
              with other members.
            </p>
          </div>

          <div className="mt-12 grid md:grid-cols-2 gap-6">
            {/* Facebook */}
            <a
              href={FACEBOOK_COMMUNITY}
              target="_blank"
              rel="noreferrer"
              className="group rounded-3xl bg-white border border-gray-100 p-7 sm:p-9 hover:-translate-y-1 hover:shadow-xl transition"
            >
              <div className="flex items-start justify-between">
                <div className="w-14 h-14 rounded-2xl bg-blue-50 flex items-center justify-center">
                  <Facebook
                    size={27}
                    className="text-blue-600"
                  />
                </div>

                <ArrowRight
                  className="text-gray-300 group-hover:text-green-600 group-hover:translate-x-1 transition"
                  size={22}
                />
              </div>

              <h3 className="mt-7 text-xl font-black">
                Facebook Community
              </h3>

              <p className="mt-3 text-gray-500 leading-6">
                Follow us and join the conversation on Facebook.
                Get updates, announcements and useful farming content.
              </p>

              <span className="inline-flex mt-6 text-sm font-bold text-blue-600">
                Visit Facebook →
              </span>
            </a>
          </div>
        </div>
      </section>

      {/* =========================================================
          FINAL CTA
      ========================================================== */}
      <section className="pb-24 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-green-100 flex items-center justify-center">
            <Leaf
              size={27}
              className="text-green-600"
            />
          </div>

          <h2 className="mt-6 text-3xl sm:text-4xl font-black">
            Ready to get started?
          </h2>

          <p className="mt-4 text-gray-500 max-w-xl mx-auto leading-7">
            Create your account and start enjoying a simpler way to
            manage your agricultural purchases.
          </p>

          <div className="mt-7 flex flex-col sm:flex-row justify-center gap-3">
            <Link
              to="/customer/register"
              className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-bold shadow-lg shadow-green-600/20 transition"
            >
              Create Account
              <ArrowRight size={18} />
            </Link>

            <Link
              to="/customer/login"
              className="inline-flex items-center justify-center px-7 py-3.5 rounded-xl border border-gray-200 hover:border-green-300 text-gray-700 font-bold transition"
            >
              I Already Have an Account
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================
          FOOTER
      ========================================================== */}
      <footer
        id="contact"
        className="border-t border-gray-100 bg-gray-950 text-white"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-10">
            {/* Brand */}
            <div>
              <Logo
                size={40}
                subtitle="AND GENERAL MERCHANT"
                textClassName="text-base"
              />

              <p className="mt-5 text-sm text-gray-400 leading-6">
                Quality agricultural products, convenient ordering and
                dependable customer support.
              </p>
            </div>

            {/* Company */}
            <div>
              <h3 className="font-bold">Company</h3>

              <div className="mt-5 space-y-3 text-sm text-gray-400">
                <a
                  href="#about"
                  className="block hover:text-white transition"
                >
                  About Us
                </a>

                <a
                  href="#services"
                  className="block hover:text-white transition"
                >
                  Our Services
                </a>
              </div>
            </div>

            {/* Community */}
            <div>
              <h3 className="font-bold">Community</h3>

              <div className="mt-5 space-y-3 text-sm text-gray-400">
                <a
                  href={FACEBOOK_COMMUNITY}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 hover:text-white transition"
                >
                  <Facebook size={15} />
                  Facebook Community
                </a>


                <a
                  href={whatsappChat}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-2 hover:text-white transition"
                >
                  <Headphones size={15} />
                  Customer Support
                </a>
              </div>
            </div>

            {/* Account */}
            <div>
              <h3 className="font-bold">Your Account</h3>

              <div className="mt-5 space-y-3 text-sm text-gray-400">
                <Link
                  to="/customer/register"
                  className="block hover:text-white transition"
                >
                  Create Account
                </Link>

                <Link
                  to="/customer/login"
                  className="block hover:text-white transition"
                >
                  Customer Login
                </Link>

                <Link
                  to="/login"
                  className="flex items-center gap-2 text-gray-500 hover:text-gray-300 transition"
                >
                  <ShieldCheck size={14} />
                  Staff Login
                </Link>
              </div>
            </div>
          </div>

          <div className="mt-12 pt-7 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-gray-500">
              © {new Date().getFullYear()} Sadeeq Agrovet & General
              Merchant. All rights reserved.
            </p>
          </div>
        </div>
      </footer>

      {/* =========================================================
          FLOATING WHATSAPP BUTTON
      ========================================================== */}
      <a
        href={whatsappChat}
        target="_blank"
        rel="noreferrer"
        aria-label="Chat with Sadeeq Agrovet"
        className="fixed bottom-5 right-5 z-50 w-14 h-14 rounded-full bg-green-600 hover:bg-green-700 text-white flex items-center justify-center shadow-2xl shadow-green-900/30 hover:scale-105 transition"
      >
        <MessageCircle size={25} />
      </a>
    </div>
  )
}

export default Landing