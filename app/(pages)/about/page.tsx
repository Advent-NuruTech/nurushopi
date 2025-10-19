import React from "react";

export const metadata = {
  title: "About NuruShop",
  description:
    "Learn more about NuruShop — our mission, values, and commitment to delivering quality natural products to you.",
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-white text-slate-800 px-6 md:px-16 py-12">
      <section className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-6 text-sky-700">About NuruShop</h1>

        <p className="text-lg leading-relaxed mb-4">
          <strong>NuruShop</strong> is your trusted online marketplace for natural,
          faith-inspired, and health-based products. We are committed to
          reconnecting people with the pure, simple, and healing principles of
          nature — as originally designed by the Creator.
        </p>

        <p className="text-lg leading-relaxed mb-4">
          Founded under the vision of <strong>Advent NuruTech</strong>, NuruShop
          blends modern technology with timeless values of integrity, service,
          and wellness. Our platform was built to make it easy for everyone to
          access high-quality herbs, oils, EGW books, pioneer writings, and
          health essentials — all in one trusted place.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-3 text-sky-600">
          🌿 Our Mission
        </h2>
        <p className="text-lg leading-relaxed mb-4">
          To promote healthy living and spiritual growth by providing genuine,
          affordable, and nature-based products that nurture the body, mind, and
          soul.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-3 text-sky-600">
          💡 Our Vision
        </h2>
        <p className="text-lg leading-relaxed mb-4">
          To become the leading marketplace for natural remedies, sacred books,
          and wellness tools — empowering every home to live in harmony with
          nature and truth.
        </p>

        <h2 className="text-2xl font-semibold mt-8 mb-3 text-sky-600">
          💖 Our Core Values
        </h2>
        <ul className="list-disc list-inside space-y-2 text-lg">
          <li><strong>Integrity</strong> – We deliver what we promise.</li>
          <li><strong>Purity</strong> – Every product is carefully sourced and verified.</li>
          <li><strong>Service</strong> – We exist to uplift lives, not just make sales.</li>
          <li><strong>Faith</strong> – Our work is guided by divine principles of stewardship and love.</li>
          <li><strong>Innovation</strong> – Using technology to make good health and truth accessible to all.</li>
        </ul>

        <h2 className="text-2xl font-semibold mt-8 mb-3 text-sky-600">
          🌍 Why Choose NuruShop?
        </h2>
        <p className="text-lg leading-relaxed mb-4">
          NuruShop stands apart by blending technology, natural living, and
          spiritual wellness into one ecosystem. From health-enhancing herbs to
          uplifting literature, we curate everything with purpose — helping you
          make informed choices that lead to abundant life.
        </p>

        <div className="mt-10 p-6 bg-sky-50 border border-sky-200 rounded-xl">
          <h3 className="text-xl font-semibold mb-2 text-sky-700">
            ✨ Our Commitment
          </h3>
          <p className="text-lg leading-relaxed">
            We are more than an online shop — we’re a movement for truth,
            wellness, and simplicity. Every purchase supports community growth,
            education, and digital empowerment initiatives led by Advent
            NuruTech.
          </p>
        </div>

        <p className="text-center text-sky-700 mt-12 font-medium">
          “Let your food be your medicine, and your mind be filled with light.” 🌾
        </p>
      </section>
    </main>
  );
}
