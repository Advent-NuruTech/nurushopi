"use client";

import React from "react";
import Link from "next/link";
import { PICKUP_POLICY_PATH } from "@/lib/pickupPaths";

const ShippingPolicy: React.FC = () => {
  return (
    <main className="max-w-4xl mx-auto p-6 space-y-8 pt-32">
      <h1 className="text-3xl font-bold">Nurushop — Shipping &amp; Delivery Policy</h1>
      <p className="text-gray-600">Last Updated: 13 September 2026</p>

      <p>
        At Nurushop, we deliver to your convenience through available pickup stations and doorstep
        delivery. This policy explains how delivery (parceling) works, what it costs, and what you
        can expect from the time you place your order until it reaches your door.
      </p>

      <section>
        <h2 className="text-2xl font-semibold mt-6 mb-2">1. Where We Deliver</h2>
        <p>
          Nurushop is an online marketplace based in Kenya and delivers across Kenya. Checkout also
          supports a wide range of countries — including Uganda, Tanzania, Rwanda, Ethiopia, South
          Africa, and beyond — so international orders can be arranged with our customer care team.
        </p>
        <p className="mt-2">
          Nurushop will confirm your exact location before approving delivery to make sure your
          order reaches the right place.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mt-6 mb-2">2. How Delivery Is Arranged</h2>
        <ul className="list-disc list-inside space-y-1">
          <li>
            Delivery (parceling) is the responsibility of the seller/product owner, coordinated by
            Nurushop.
          </li>
          <li>Buyers are informed of the delivery fee before making payment.</li>
          <li>Nurushop confirms the buyer&apos;s exact location before approving delivery.</li>
          <li>We always choose the cheapest reliable delivery option for your distance.</li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mt-6 mb-2">3. Delivery Costs</h2>
        <p>
          Parceling fees are based on distance and the seller&apos;s delivery method. There is no
          hidden charge: you will always be told the exact delivery fee before you pay for your
          order.
        </p>
        <ul className="list-disc list-inside space-y-1">
          <li>Delivery cost depends on your distance.</li>
          <li>The cheapest suitable option is always chosen.</li>
          <li>Delivery fees are non-refundable once delivery has started (see Section 6).</li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mt-6 mb-2">4. Delivery Time</h2>
        <p>
          Delivery time depends on the seller&apos;s schedule, the distance to your location, and
          transport conditions. Once the seller dispatches your order, our team keeps you updated on
          its progress.
        </p>
        <p className="mt-2">
          Weather, transport disruption, security incidents, or other events beyond reasonable
          control may cause delay. We will communicate material delays and available options, and
          this does not remove any remedy required by law.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mt-6 mb-2">5. Order Confirmation &amp; Updates</h2>
        <ul className="list-disc list-inside space-y-1">
          <li>You receive a unique order number when you place your order.</li>
          <li>Confirmation is sent via WhatsApp and/or Email.</li>
          <li>
            For live updates, message us on WhatsApp with your order number, or view{" "}
            <Link href="/myoders" className="text-sky-600 dark:text-emerald-400 hover:underline">
              My Orders
            </Link>
            .
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mt-6 mb-2">6. Non-Delivery &amp; Refunds</h2>
        <ul className="list-disc list-inside space-y-1">
          <li>If the seller fails to deliver after payment, Nurushop refunds the buyer in full.</li>
          <li>
            Delivery costs already reasonably incurred may be deducted only where disclosed and
            permitted by law. They remain refundable where required by law or where the failed
            service is attributable to Nurushop or its fulfilment provider.
          </li>
          <li>
            Please report visible issues within 24 hours (or promptly after an expected delivery
            date passes) and concealed issues as soon as reasonably possible. This request does not
            shorten non-excludable statutory rights.
          </li>
        </ul>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mt-6 mb-2">7. Pickup Stations</h2>
        <p>
          Where pickup is enabled, checkout shows the active stations currently available for your
          order. You will be notified when the parcel is ready and must complete the stated identity
          and collection checks. Read the full{" "}
          <Link
            href={PICKUP_POLICY_PATH}
            className="font-semibold text-brand-strong hover:underline dark:text-brand-bright"
          >
            Pickup Station Policy
          </Link>{" "}
          before selecting a station. A pickup point entered manually remains subject to NuruShop
          confirming availability, charges, and collection arrangements.
        </p>
      </section>

      <section>
        <h2 className="text-2xl font-semibold mt-6 mb-2">8. Questions?</h2>
        <p>For any delivery questions, contact Nurushop Support:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Phone: +254 759 167 209 / +254 142 225 233</li>
          <li>WhatsApp: +254 142 225 233</li>
          <li>Email: nurushoponline@gmail.com</li>
          <li>
            Website:{" "}
            <Link href="/" className="text-sky-600 dark:text-emerald-400 hover:underline">
              nurushop.co.ke
            </Link>
          </li>
        </ul>
      </section>
    </main>
  );
};

export default ShippingPolicy;
