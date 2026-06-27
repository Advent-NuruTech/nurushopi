export const metadata = {
  title: "Offline | NuruShop",
};

export default function OfflinePage() {
  return (
    <main className="min-h-screen bg-white flex items-center justify-center px-6 py-16">
      <div className="max-w-md text-center space-y-3">
        <div className="mx-auto h-12 w-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center text-lg font-semibold">
          !
        </div>
        <h1 className="text-2xl font-semibold text-slate-900">You&apos;re offline</h1>
        <p className="text-sm text-slate-600">
          We&apos;re showing a saved version of the site. Please reconnect to continue shopping.
        </p>
      </div>
    </main>
  );
}
