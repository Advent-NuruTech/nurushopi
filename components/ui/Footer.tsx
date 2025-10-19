'use client';


// nurushop/components/Footer.tsx
import React from 'react';


export default function Footer() {
return (
<footer className="bg-slate-50 border-t mt-8">
<div className="container mx-auto px-4 py-6 text-sm text-slate-600">
<div className="flex flex-col sm:flex-row justify-between items-center">
<div>© {new Date().getFullYear()} NuruShop — Health & Truth</div>
<div className="mt-2 sm:mt-0">Contact: <a href="tel:+254759167209" className="underline">+254 759 167 209</a></div>
</div>
</div>
</footer>
);
}