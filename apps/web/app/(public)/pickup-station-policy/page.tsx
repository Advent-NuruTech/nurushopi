import type { Metadata } from "next";
import Link from "next/link";
import { AlertTriangle, Clock3, MapPin, PackageCheck, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Pickup Station Policy | NuruShop",
  description:
    "How NuruShop pickup stations work, including collection, identification, storage, returns, privacy, and customer rights in Kenya.",
};

const sectionClass =
  "scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7 dark:border-slate-800 dark:bg-slate-900";
const headingClass = "text-xl font-black text-slate-950 dark:text-white";
const listClass =
  "mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700 dark:text-slate-300";
const linkClass =
  "font-semibold text-brand-strong underline underline-offset-2 dark:text-brand-bright";

const contents = [
  ["scope", "Scope and roles"],
  ["choosing", "Choosing a station"],
  ["fees", "Fees and timing"],
  ["arrival", "Arrival and notice"],
  ["collection", "Collection requirements"],
  ["storage", "Storage and parcel care"],
  ["uncollected", "Uncollected parcels"],
  ["problems", "Loss, damage and wrong items"],
  ["returns", "Returns, refunds and cancellations"],
  ["privacy", "Privacy and identity checks"],
  ["conduct", "Safety and conduct"],
  ["complaints", "Complaints and disputes"],
] as const;

export default function PickupStationPolicyPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-2 py-8 sm:px-4 sm:py-12">
      <header className="overflow-hidden rounded-[2rem] border border-brand-border bg-gradient-to-br from-brand-surface via-white to-brand-surface-strong p-6 sm:p-10 dark:border-brand-strong/50 dark:from-slate-900 dark:via-slate-950 dark:to-brand-ink/40">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-white shadow-lg shadow-green-950/15">
          <MapPin aria-hidden="true" />
        </div>
        <p className="mt-6 text-sm font-bold uppercase tracking-[0.18em] text-brand-strong dark:text-brand-bright">
          Customer policy
        </p>
        <h1 className="mt-2 max-w-3xl text-3xl font-black tracking-tight text-slate-950 sm:text-5xl dark:text-white">
          Pickup Station Policy
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-700 dark:text-slate-300">
          This policy explains what happens when you ask NuruShop to deliver an order to a pickup
          station in Kenya. It forms part of the NuruShop Terms and applies from checkout until the
          parcel is collected, returned, or otherwise resolved.
        </p>
        <div className="mt-6 flex flex-wrap gap-2 text-xs font-bold text-slate-700 dark:text-slate-200">
          <span className="rounded-full border border-brand-border bg-white/80 px-3 py-1.5 dark:bg-slate-900">
            Effective 13 September 2026
          </span>
          <span className="rounded-full border border-brand-border bg-white/80 px-3 py-1.5 dark:bg-slate-900">
            Kenya
          </span>
        </div>
      </header>

      <div className="mt-8 grid items-start gap-7 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="rounded-3xl border border-slate-200 bg-white p-5 lg:sticky lg:top-24 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="font-black text-slate-950 dark:text-white">On this page</h2>
          <nav aria-label="Pickup policy sections" className="mt-3">
            <ol className="space-y-1 text-sm">
              {contents.map(([id, label], index) => (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    className="block rounded-xl px-3 py-2 text-slate-600 hover:bg-brand-surface hover:text-brand-strong dark:text-slate-300 dark:hover:bg-brand-ink/30 dark:hover:text-brand-bright"
                  >
                    {index + 1}. {label}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
        </aside>

        <article className="min-w-0 space-y-5">
          <section className="grid gap-3 sm:grid-cols-3" aria-label="Pickup highlights">
            {[
              [
                PackageCheck,
                "Recorded handover",
                "Station scans and status updates create a custody record.",
              ],
              [
                ShieldCheck,
                "Protected collection",
                "Order details and identity are checked before release.",
              ],
              [
                Clock3,
                "Clear collection window",
                "Your ready notice tells you when and where to collect.",
              ],
            ].map(([Icon, title, description]) => {
              const HighlightIcon = Icon as typeof PackageCheck;
              return (
                <div
                  key={String(title)}
                  className="min-w-0 rounded-2xl border border-brand-border bg-brand-surface p-4 dark:border-brand-strong/40 dark:bg-brand-ink/25"
                >
                  <HighlightIcon className="text-brand" size={20} aria-hidden="true" />
                  <h2 className="mt-3 text-sm font-black text-brand-ink dark:text-brand-bright">
                    {String(title)}
                  </h2>
                  <p className="mt-1 text-xs leading-5 text-slate-600 dark:text-slate-300">
                    {String(description)}
                  </p>
                </div>
              );
            })}
          </section>

          <section id="scope" className={sectionClass}>
            <h2 className={headingClass}>1. Scope and roles</h2>
            <p className="mt-3 text-sm leading-7 text-slate-700 dark:text-slate-300">
              A <strong>pickup station</strong> is a collection location approved by NuruShop to
              receive, safeguard, and hand over parcels. The station and its authorised agent act as
              limited fulfilment service providers; they are not the seller or manufacturer and
              cannot change the product contract, price, warranty, return decision, or refund.
              NuruShop remains your contact for the order and coordinates the seller, carrier, and
              station as applicable.
            </p>
            <p className="mt-3 text-sm leading-7 text-slate-700 dark:text-slate-300">
              This policy supplements the general{" "}
              <Link href="/terms" className={linkClass}>
                Terms &amp; Conditions
              </Link>
              ,{" "}
              <Link href="/shipping-policy" className={linkClass}>
                Shipping &amp; Delivery Policy
              </Link>
              , and{" "}
              <Link href="/privacy" className={linkClass}>
                Privacy Policy
              </Link>
              . If they conflict, mandatory Kenyan law prevails, then the term that gives the
              consumer greater lawful protection for the pickup service.
            </p>
          </section>

          <section id="choosing" className={sectionClass}>
            <h2 className={headingClass}>2. Choosing or changing a station</h2>
            <ul className={listClass}>
              <li>
                Checkout shows active stations, their address, available operating hours,
                instructions, delivery estimate, and any published fee.
              </li>
              <li>
                Check the location and hours before ordering. Hours may change for holidays,
                emergencies, security incidents, or county restrictions; material changes will be
                communicated where reasonably possible.
              </li>
              <li>
                A manually requested pickup point is only a request. It becomes confirmed when
                NuruShop verifies the location, service availability, fee, and collection process
                with you.
              </li>
              <li>
                Ask NuruShop to change the station before dispatch. A change after dispatch depends
                on route and custody status and may add a disclosed fee or delay. No extra charge is
                due unless you accept it.
              </li>
              <li>
                If the selected station becomes unavailable, NuruShop will offer a reasonable
                alternative, doorstep delivery where available, or cancellation/refund in accordance
                with your legal rights.
              </li>
            </ul>
          </section>

          <section id="fees" className={sectionClass}>
            <h2 className={headingClass}>3. Fees, estimates and payment</h2>
            <ul className={listClass}>
              <li>
                The pickup fee and order total will be shown before payment when a route price is
                available.
              </li>
              <li>
                If checkout says a quote is pending, no parcel will be dispatched on the quoted
                route until NuruShop discloses the fee and you accept it.
              </li>
              <li>
                Delivery dates and times are estimates unless NuruShop expressly guarantees them in
                writing. We will communicate a material delay and available options.
              </li>
              <li>
                Pay only through a payment method officially confirmed by NuruShop. A station agent
                may not add storage, release, identity-check, or convenience fees unless NuruShop
                disclosed and authorised them in writing before they became payable.
              </li>
              <li>
                You will receive or can access an electronic order record showing the order number,
                items, price, delivery method, contact details, and applicable terms.
              </li>
            </ul>
          </section>

          <section id="arrival" className={sectionClass}>
            <h2 className={headingClass}>4. Arrival, ready notice and collection window</h2>
            <ul className={listClass}>
              <li>
                A parcel is ready only when the tracker shows <strong>Ready for pickup</strong> or
                NuruShop sends an official ready notice. A dispatch notice does not mean it has
                reached the station.
              </li>
              <li>
                The notice identifies the order, station, address, and any available instructions.
                Keep your order number private and verify unexpected messages through NuruShop
                support.
              </li>
              <li>
                Collect during the station&apos;s published hours and within the period stated in
                the ready notice or order record. If no period is stated, contact support if you
                cannot collect within seven calendar days; the parcel is not automatically forfeited
                after seven days.
              </li>
              <li>
                NuruShop may correct an accidental ready status or move a parcel for safety or
                operational reasons, but will promptly tell you and preserve your statutory
                remedies.
              </li>
            </ul>
          </section>

          <section id="collection" className={sectionClass}>
            <h2 className={headingClass}>5. Who may collect and what to bring</h2>
            <ul className={listClass}>
              <li>
                Bring the order number and an original, valid identification document matching the
                named customer. If an OTP or collection code was issued, bring it and do not share
                it before handover.
              </li>
              <li>
                If you do not have the requested identification, contact support before travelling
                so that a lawful alternative verification method can be agreed.
              </li>
              <li>
                An authorised representative must bring their own identification, the order details,
                and the customer&apos;s verifiable authorisation. NuruShop or the station may
                contact the customer before release.
              </li>
              <li>
                For a minor or person requiring assistance, a parent, guardian, or authorised adult
                should collect unless NuruShop has approved another safe method.
              </li>
              <li>
                The station may refuse or pause release where details do not match, authority is
                doubtful, the code appears compromised, payment remains due, or release would be
                unsafe or unlawful. It must explain the next verification step without unlawful
                discrimination.
              </li>
              <li>
                Do not sign or allow the order to be marked <strong>Picked up</strong> until the
                parcel has physically been handed to you or your verified representative.
              </li>
            </ul>
          </section>

          <section id="storage" className={sectionClass}>
            <h2 className={headingClass}>6. Storage, parcel care and inspection</h2>
            <ul className={listClass}>
              <li>
                Stations must keep parcels in a secure, clean, dry, access-controlled area and
                follow written handling labels and NuruShop instructions.
              </li>
              <li>
                Temperature-controlled, fragile, perishable, hazardous, age-restricted,
                prescription, or specially regulated goods may use a station only where NuruShop has
                expressly confirmed that suitable handling is available.
              </li>
              <li>
                At handover, check the name/order number, parcel count, seals, and visible external
                damage before leaving. The agent may record visible damage and photographs with your
                knowledge.
              </li>
              <li>
                A station ordinarily cannot open sealed parcels or decide whether the contents
                conform to the listing. Product defects and hidden damage remain subject to the
                seller&apos;s obligations and your consumer rights.
              </li>
            </ul>
          </section>

          <section id="uncollected" className={sectionClass}>
            <h2 className={headingClass}>7. Uncollected, refused and returned parcels</h2>
            <ul className={listClass}>
              <li>
                NuruShop may send collection reminders using the contact details on the order.
              </li>
              <li>
                If a parcel is not collected within the stated period, NuruShop will give reasonable
                notice and instructions before arranging return to the seller, transfer to another
                secure location, or another lawful disposition.
              </li>
              <li>
                Reasonable return or re-delivery costs may be charged only where disclosed,
                attributable to the customer&apos;s failure to collect, and permitted by law.
                NuruShop will provide the amount and basis before requiring payment.
              </li>
              <li>
                Refusing a parcel at the station does not itself cancel the product contract or
                guarantee a refund. Contact NuruShop so eligibility, return transport, and refund
                treatment can be confirmed.
              </li>
              <li>
                No station agent obtains ownership of an uncollected parcel and no parcel may be
                sold, used, pledged, or discarded outside NuruShop&apos;s written instructions and
                applicable law.
              </li>
            </ul>
          </section>

          <section id="problems" className={sectionClass}>
            <h2 className={headingClass}>8. Loss, damage, shortage or wrong parcel</h2>
            <div className="mt-4 flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
              <AlertTriangle className="mt-0.5 shrink-0" size={19} aria-hidden="true" />
              <p>
                Do not accept a parcel addressed to someone else or one with a visibly broken seal
                without asking the agent to record the issue.
              </p>
            </div>
            <ul className={listClass}>
              <li>
                Report visible loss, tampering, shortage, or damage at the station where possible
                and contact NuruShop promptly with the order number, photographs, and a description.
              </li>
              <li>
                If you discover concealed damage or a wrong/defective item later, preserve the
                product and packaging and report it as soon as reasonably possible. A short
                reporting request does not remove any non-excludable legal right.
              </li>
              <li>
                NuruShop will review custody scans, status history, photographs, carrier/station
                records, and seller information, then communicate the remedy and reasons.
              </li>
              <li>
                Depending on the facts and law, a remedy may include locating or re-delivering the
                parcel, replacement, repair, partial refund, full refund, or compensation. Product
                and delivery fees are handled according to responsibility and applicable consumer
                law.
              </li>
            </ul>
          </section>

          <section id="returns" className={sectionClass}>
            <h2 className={headingClass}>9. Returns, refunds and cancellations</h2>
            <ul className={listClass}>
              <li>
                A pickup station is not automatically a returns counter. Obtain return authorisation
                and instructions from NuruShop before leaving an item there.
              </li>
              <li>
                Return the item, included accessories, and packaging in the condition reasonably
                required for the applicable remedy, except where opening or use was necessary to
                discover a defect.
              </li>
              <li>
                Cancellations before dispatch are generally easier to process. After dispatch or
                arrival, reasonable transport already performed may affect the refundable amount
                only to the extent permitted by law and disclosed terms.
              </li>
              <li>
                Nothing in this policy excludes rights relating to merchantable quality, accurate
                information, unfair practices, internet agreements, late delivery, or compensation
                under Kenyan law.
              </li>
            </ul>
          </section>

          <section id="privacy" className={sectionClass}>
            <h2 className={headingClass}>10. Privacy and identity verification</h2>
            <ul className={listClass}>
              <li>
                NuruShop shares only the order and contact information reasonably needed for
                receipt, notification, verification, handover, fraud prevention, support, and legal
                compliance.
              </li>
              <li>
                Agents must not use customer data for marketing, personal contact, credit,
                profiling, or any unrelated purpose.
              </li>
              <li>
                An agent should inspect identification only as needed to verify collection and
                should not copy or photograph it unless NuruShop has a lawful, documented reason and
                provides the required notice.
              </li>
              <li>
                Authorised records may include who collected, verification outcome, handover time,
                status notes, and incident evidence. Retention and data-subject requests are
                governed by the NuruShop Privacy Policy and the Data Protection Act.
              </li>
              <li>
                Report suspicious use of your order details, OTP, or identity to NuruShop
                immediately.
              </li>
            </ul>
          </section>

          <section id="conduct" className={sectionClass}>
            <h2 className={headingClass}>11. Safety, accessibility and conduct</h2>
            <ul className={listClass}>
              <li>
                Customers and representatives must follow reasonable access, queue, security,
                health, and fire-safety directions at the premises.
              </li>
              <li>
                Threats, harassment, bribery, fraud, violence, intoxication that creates a safety
                risk, weapons, and attempts to obtain another person&apos;s parcel are prohibited.
              </li>
              <li>
                Stations must provide service without unlawful discrimination and should offer
                reasonable assistance to persons with disabilities, older persons, pregnant
                customers, and others who reasonably need help, subject to the premises and
                applicable law.
              </li>
              <li>
                For an immediate threat or medical emergency, move to safety and contact the
                appropriate emergency service or police before contacting NuruShop.
              </li>
            </ul>
          </section>

          <section id="complaints" className={sectionClass}>
            <h2 className={headingClass}>12. Complaints, governing law and statutory rights</h2>
            <p className="mt-3 text-sm leading-7 text-slate-700 dark:text-slate-300">
              Start a complaint with NuruShop Support and provide the order number, station, issue,
              requested outcome, and available evidence. We will acknowledge it, investigate with
              the relevant seller/carrier/station, and communicate an outcome within a reasonable
              period. You may escalate unresolved matters to the relevant Kenyan regulator or a
              court with jurisdiction. This policy is governed by Kenyan law and does not restrict
              any non-excludable remedy, regulator complaint, class proceeding, or right of access
              to justice.
            </p>
            <div className="mt-5 rounded-2xl bg-slate-50 p-4 text-sm dark:bg-slate-950">
              <h3 className="font-black text-slate-900 dark:text-white">Legal framework</h3>
              <ul className="mt-2 space-y-2 text-slate-600 dark:text-slate-300">
                <li>
                  <a
                    className={linkClass}
                    href="https://new.kenyalaw.org/akn/ke/act/2010/constitution/eng@2010-09-03"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Constitution of Kenya, Article 46
                  </a>{" "}
                  — consumer quality, information, safety, economic interests, and redress.
                </li>
                <li>
                  <a
                    className={linkClass}
                    href="https://new.kenyalaw.org/akn/ke/act/2012/46/eng@2022-12-31"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Consumer Protection Act, 2012
                  </a>{" "}
                  — fair practices, quality, disclosures, internet agreements, delivery, and
                  remedies.
                </li>
                <li>
                  <a
                    className={linkClass}
                    href="https://new.kenyalaw.org/akn/ke/act/2019/24/eng@2019-11-15"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Data Protection Act, 2019
                  </a>{" "}
                  and the applicable regulations — lawful, secure, and limited processing of
                  personal data.
                </li>
              </ul>
            </div>
          </section>

          <section className="rounded-3xl bg-brand-ink p-6 text-white sm:p-8">
            <h2 className="text-xl font-black">Need pickup help?</h2>
            <p className="mt-2 text-sm leading-6 text-green-50">
              Contact NuruShop before handing over money, identification copies, an OTP, or a parcel
              to anyone whose authority you cannot verify.
            </p>
            <ul className="mt-4 space-y-1 text-sm text-green-50">
              <li>Phone / WhatsApp: +254 142 225 233</li>
              <li>Email: nurushoponline@gmail.com</li>
            </ul>
          </section>
        </article>
      </div>
    </main>
  );
}
