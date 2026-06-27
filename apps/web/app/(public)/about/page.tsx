import React from "react";
import Link from "next/link";

export const metadata = {
  title: "About NuruShop",
  description:
    "Learn more about NuruShop — our mission, values, and commitment to delivering quality natural products to you.",
};

export default function AboutPage() {
  return (
   <main className="min-h-screen bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 px-4 md:px-8 lg:px-16 pt-20 md:pt-24 pb-8 md:pb-12 transition-colors duration-300">
  <section className="max-w-4xl mx-auto">
    {/* Header with decorative elements - Now visible below navbar */}
    <div className="mb-8 md:mb-12">
      <div className="flex items-center gap-3 mb-4">
        <div className="h-10 w-2 bg-emerald-500 rounded-full"></div>
        <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-sky-700 dark:text-emerald-400">
          About NuruShop
        </h1>
      </div>
      <div className="h-1 w-20 bg-gradient-to-r from-sky-500 to-emerald-500 rounded-full mb-6"></div>
    </div>
        {/* Introduction with improved typography */}
        <div className="space-y-6 mb-10">
          <div className="bg-gradient-to-br from-sky-50 to-emerald-50 dark:from-slate-800 dark:to-slate-800/50 p-6 rounded-2xl border border-sky-100 dark:border-slate-700 shadow-sm">
            <p className="text-lg leading-relaxed md:text-xl md:leading-relaxed">
              <strong className="text-sky-700 dark:text-emerald-400 text-2xl">NuruShop</strong> is your trusted online marketplace for natural,
              faith-inspired, and health-based products. We are committed to
              reconnecting people with the pure, simple, and healing principles of
              nature — as originally designed by the Creator.
            </p>
          </div>

          <p className="text-lg leading-relaxed">
            Founded under the vision of{" "}
            <Link 
              href="https://adventnurutech.xyz" 
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-600 dark:text-emerald-400 font-semibold hover:text-sky-800 dark:hover:text-emerald-300 underline underline-offset-4 transition-colors"
            >
              Advent NuruTech
            </Link>
            , NuruShop blends modern technology with timeless values of integrity,
            service, and wellness. Our platform was built to make it easy for
            everyone to access high-quality herbs, oils, EGW books, pioneer writings,
            and health essentials — all in one trusted place.
          </p>
        </div>

        {/* Mission & Vision Cards */}
        <div className="grid md:grid-cols-2 gap-6 mb-10">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-sky-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-sky-100 dark:bg-sky-900/30 rounded-lg">
                <span className="text-2xl">🌿</span>
              </div>
              <h2 className="text-2xl font-semibold text-sky-600 dark:text-emerald-400">
                Our Mission
              </h2>
            </div>
            <p className="text-lg leading-relaxed">
              To promote healthy living and spiritual growth by providing genuine,
              affordable, and nature-based products that nurture the body, mind, and
              soul.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl border border-sky-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                <span className="text-2xl">💡</span>
              </div>
              <h2 className="text-2xl font-semibold text-sky-600 dark:text-emerald-400">
                Our Vision
              </h2>
            </div>
            <p className="text-lg leading-relaxed">
              To become the leading marketplace for natural remedies, sacred books,
              and wellness tools — empowering every home to live in harmony with
              nature and truth.
            </p>
          </div>
        </div>

        {/* Core Values */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-1 bg-emerald-500 rounded-full"></div>
            <h2 className="text-2xl md:text-3xl font-semibold text-sky-600 dark:text-emerald-400">
              Our Core Values
            </h2>
          </div>
          
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { title: "Integrity", desc: "We deliver what we promise.", icon: "✨" },
              { title: "Purity", desc: "Every product is carefully sourced and verified.", icon: "🌱" },
              { title: "Service", desc: "We exist to uplift lives, not just make sales.", icon: "🤝" },
              { title: "Faith", desc: "Guided by divine principles of stewardship.", icon: "🙏" },
              { title: "Innovation", desc: "Using technology to make wellness accessible.", icon: "💻" },
              { title: "Community", desc: "Building connections through shared values.", icon: "👥" }
            ].map((value, index) => (
              <div 
                key={index} 
                className="bg-white dark:bg-slate-800 p-5 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-sky-300 dark:hover:border-emerald-500 transition-all hover:translate-y-[-2px]"
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{value.icon}</span>
                  <div>
                    <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100 mb-1">
                      {value.title}
                    </h3>
                    <p className="text-slate-600 dark:text-slate-300">
                      {value.desc}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Why Choose NuruShop */}
        <div className="mb-10">
          <div className="flex items-center gap-3 mb-6">
            <div className="h-10 w-1 bg-sky-500 rounded-full"></div>
            <h2 className="text-2xl md:text-3xl font-semibold text-sky-600 dark:text-emerald-400">
              Why Choose NuruShop?
            </h2>
          </div>
          
          <div className="bg-gradient-to-r from-sky-50 to-emerald-50 dark:from-slate-800 dark:to-slate-800/50 p-6 md:p-8 rounded-2xl border border-sky-100 dark:border-slate-700">
            <p className="text-lg leading-relaxed md:text-xl md:leading-relaxed mb-6">
              NuruShop stands apart by blending technology, natural living, and
              spiritual wellness into one ecosystem. From health-enhancing herbs to
              uplifting literature, we curate everything with purpose — helping you
              make informed choices that lead to abundant life.
            </p>
            
            <div className="flex flex-wrap gap-4">
              <Link 
                href="/shop"
                className="inline-flex items-center gap-2 bg-sky-600 hover:bg-sky-700 dark:bg-emerald-600 dark:hover:bg-emerald-700 text-white px-6 py-3 rounded-lg font-medium transition-colors shadow-sm hover:shadow-md"
              >
                <span>Browse Products</span>
                <span>→</span>
              </Link>
              
              <Link 
                href="https://adventnurutech.xyz"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 bg-white dark:bg-slate-800 border border-sky-300 dark:border-emerald-500 text-sky-700 dark:text-emerald-400 hover:bg-sky-50 dark:hover:bg-slate-700 px-6 py-3 rounded-lg font-medium transition-colors"
              >
                <span>Visit Advent NuruTech</span>
                <span>↗</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Commitment Section */}
        <div className="mb-12">
          <div className="bg-gradient-to-br from-sky-500/10 via-emerald-500/10 to-transparent dark:from-sky-900/20 dark:via-emerald-900/20 p-8 rounded-2xl border-2 border-sky-200 dark:border-emerald-900/50">
            <div className="flex items-center gap-4 mb-4">
              <div className="p-3 bg-sky-100 dark:bg-sky-900/40 rounded-xl">
                <span className="text-3xl">✨</span>
              </div>
              <h3 className="text-2xl font-bold text-sky-700 dark:text-emerald-400">
                Our Commitment
              </h3>
            </div>
            
            <p className="text-lg leading-relaxed mb-6">
              We are more than an online shop — we&apos;re a movement for truth,
              wellness, and simplicity. Every purchase supports community growth,
              education, and digital empowerment initiatives led by{" "}
              <Link 
                href="https://adventnurutech.xyz"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-600 dark:text-emerald-400 font-semibold hover:underline"
              >
                Advent NuruTech
              </Link>
              .
            </p>
            
            <div className="grid sm:grid-cols-2 gap-4 mt-6">
              <div className="bg-white/50 dark:bg-slate-800/50 p-4 rounded-lg">
                <h4 className="font-bold text-sky-700 dark:text-emerald-400 mb-2">🌾 Community Impact</h4>
                <p className="text-slate-700 dark:text-slate-300">Supporting local farmers and artisans</p>
              </div>
              <div className="bg-white/50 dark:bg-slate-800/50 p-4 rounded-lg">
                <h4 className="font-bold text-sky-700 dark:text-emerald-400 mb-2">📚 Educational Resources</h4>
                <p className="text-slate-700 dark:text-slate-300">Free wellness guides and tutorials</p>
              </div>
            </div>
          </div>
        </div>

        {/* Inspirational Quote */}
        <div className="text-center py-8 border-t border-slate-200 dark:border-slate-700">
          <div className="max-w-2xl mx-auto">
            <p className="text-xl italic text-slate-700 dark:text-slate-300 mb-4">
              &quot;Let your food be your medicine, and your mind be filled with light.&quot;
            </p>
            <div className="flex justify-center items-center gap-4">
              <Link 
                href="/shop"
                className="text-sky-600 dark:text-emerald-400 hover:text-sky-800 dark:hover:text-emerald-300 font-medium hover:underline"
              >
                Shop Natural Products
              </Link>
              <span className="text-slate-400">•</span>
              <Link 
                href="https://adventnurutech.xyz"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sky-600 dark:text-emerald-400 hover:text-sky-800 dark:hover:text-emerald-300 font-medium hover:underline"
              >
                Learn About Our Mission
              </Link>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}