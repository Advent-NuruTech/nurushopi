import Image from "next/image";

export default function AuthHero() {
  return (
    <section className="relative isolate min-h-[22rem] overflow-hidden bg-[#00351b] sm:min-h-[26rem] lg:min-h-screen lg:flex-1">
      <Image
        src="/assets/auth-botanical-hero.png"
        alt="Natural wellness products on a wooden table"
        fill
        priority
        sizes="(min-width: 1024px) 50vw, 100vw"
        className="object-cover object-center"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-[#002b17]/20 via-[#002b17]/20 to-[#002b17]/45" />
      <div className="relative z-10 flex h-full min-h-[22rem] flex-col items-center px-6 pt-10 text-center sm:min-h-[26rem] lg:min-h-screen lg:pt-16">
        <Image
          src="/assets/logo.png"
          alt="NuruShop"
          width={104}
          height={104}
          className="h-20 w-20 rounded-[1.35rem] object-contain drop-shadow-lg sm:h-24 sm:w-24"
        />
        <div className="mt-5 max-w-sm text-white [text-shadow:0_2px_12px_rgb(0_0_0_/_35%)]">
          <p className="text-2xl font-medium tracking-tight sm:text-3xl">Marketplace for</p>
          <h1 className="mt-1 text-4xl font-extrabold leading-none sm:text-5xl">Health and Truth</h1>
          <span className="mx-auto mt-5 block h-1 w-16 rounded-full bg-[#00C83A]" />
        </div>
      </div>
    </section>
  );
}
