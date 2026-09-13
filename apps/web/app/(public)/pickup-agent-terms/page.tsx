import type { Metadata } from "next";
import Link from "next/link";
import { ClipboardCheck, LockKeyhole, PackageCheck, Scale, ShieldCheck } from "lucide-react";
import { PICKUP_POLICY_PATH } from "@/lib/pickupPaths";

export const metadata: Metadata = {
  title: "Pickup Station Partner & Agent Terms | NuruShop",
  description:
    "Operational and legal terms for NuruShop pickup station partners and their authorised agents in Kenya.",
};

const sectionClass =
  "scroll-mt-24 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7 dark:border-slate-800 dark:bg-slate-900";
const headingClass = "text-xl font-black text-slate-950 dark:text-white";
const listClass =
  "mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-slate-700 dark:text-slate-300";
const linkClass =
  "font-semibold text-brand-strong underline underline-offset-2 dark:text-brand-bright";

const contents = [
  ["agreement", "Agreement and parties"],
  ["eligibility", "Eligibility and onboarding"],
  ["authority", "Limited role and authority"],
  ["standards", "Service standards"],
  ["receipt", "Parcel receipt"],
  ["custody", "Custody and storage"],
  ["handover", "Customer handover"],
  ["uncollected", "Uncollected parcels and returns"],
  ["incidents", "Incidents and escalation"],
  ["data", "Data protection"],
  ["systems", "Accounts and cybersecurity"],
  ["money", "Fees, money and taxes"],
  ["records", "Records and audit"],
  ["risk", "Insurance and liability"],
  ["integrity", "Integrity and prohibited conduct"],
  ["relationship", "Relationship and personnel"],
  ["brand", "Brand and confidentiality"],
  ["ending", "Suspension and termination"],
  ["disputes", "Disputes and governing law"],
] as const;

export default function PickupAgentTermsPage() {
  return (
    <main className="mx-auto w-full max-w-6xl px-2 py-8 sm:px-4 sm:py-12">
      <header className="overflow-hidden rounded-[2rem] border border-brand-strong/50 bg-gradient-to-br from-brand-ink via-brand-strong to-slate-950 p-6 text-white sm:p-10">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-bright text-brand-ink shadow-lg shadow-black/20">
          <ClipboardCheck aria-hidden="true" />
        </div>
        <p className="mt-6 text-sm font-bold uppercase tracking-[0.18em] text-brand-bright">
          Station operations
        </p>
        <h1 className="mt-2 max-w-4xl text-3xl font-black tracking-tight sm:text-5xl">
          Pickup Station Partner &amp; Agent Terms
        </h1>
        <p className="mt-4 max-w-4xl text-base leading-7 text-green-50">
          These terms set the minimum legal, security, service, and parcel-custody standards for
          every business operating a NuruShop pickup station and every person using a station-agent
          account in Kenya.
        </p>
        <div className="mt-6 flex flex-wrap gap-2 text-xs font-bold text-green-50">
          <span className="rounded-full border border-brand-bright/40 bg-black/15 px-3 py-1.5">
            Version 2026-09-13
          </span>
          <span className="rounded-full border border-brand-bright/40 bg-black/15 px-3 py-1.5">
            Effective 13 September 2026
          </span>
        </div>
      </header>

      <div className="mt-8 grid items-start gap-7 lg:grid-cols-[260px_minmax(0,1fr)]">
        <aside className="rounded-3xl border border-slate-200 bg-white p-5 lg:sticky lg:top-24 dark:border-slate-800 dark:bg-slate-900">
          <h2 className="font-black text-slate-950 dark:text-white">On this page</h2>
          <nav
            aria-label="Station terms sections"
            className="mt-3 max-h-[68vh] overflow-y-auto pr-1"
          >
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
          <section className="grid gap-3 sm:grid-cols-3" aria-label="Core station duties">
            {[
              [
                PackageCheck,
                "Protect every parcel",
                "Maintain an auditable chain of custody from receipt to release.",
              ],
              [
                LockKeyhole,
                "Protect customer data",
                "Use order and identity data only for authorised fulfilment.",
              ],
              [
                ShieldCheck,
                "Release safely",
                "Verify the collector before recording a completed handover.",
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

          <section className="rounded-3xl border border-amber-200 bg-amber-50 p-5 text-sm leading-7 text-amber-950 sm:p-6 dark:border-amber-900 dark:bg-amber-950/25 dark:text-amber-100">
            <strong>Important:</strong> These online terms are minimum platform rules. They do not
            replace the signed station agreement, fee schedule, data-processing terms, service
            levels, or premises schedule issued to the Station Partner. If documents conflict,
            mandatory law prevails; then the signed agreement prevails on commercial terms; then
            these terms apply to portal use and daily operations.
          </section>

          <section id="agreement" className={sectionClass}>
            <h2 className={headingClass}>1. Agreement, definitions and acceptance</h2>
            <p className="mt-3 text-sm leading-7 text-slate-700 dark:text-slate-300">
              The <strong>Station Partner</strong> is the person or entity contracted to operate the
              named location. An <strong>Agent</strong> is its authorised worker or representative
              given access to the NuruShop station portal. <strong>NuruShop</strong> is the platform
              operated by Advent NuruTech. A <strong>Parcel</strong> is an order consignment
              assigned to the station. Logging in, accepting a parcel, or performing station work
              confirms that the Agent has read these terms and is authorised by the Station Partner.
              The Station Partner must give every Agent access to the current terms and remains
              responsible for its personnel, except where the law provides otherwise.
            </p>
          </section>

          <section id="eligibility" className={sectionClass}>
            <h2 className={headingClass}>2. Eligibility, due diligence and onboarding</h2>
            <ul className={listClass}>
              <li>
                The Station Partner and each Agent must be at least 18, legally capable, truthful in
                all onboarding information, and not disqualified from the relevant business
                activity.
              </li>
              <li>
                The Station Partner must provide accurate identity, beneficial ownership, contact,
                bank/payment, tax, premises, and registration information reasonably requested for
                due diligence.
              </li>
              <li>
                It must maintain all county business permits, land-use approvals, fire and
                public-health requirements, tax registrations, workplace registrations, licences,
                and consents applicable to the premises and activities.
              </li>
              <li>
                It warrants that it has a lawful right to use the premises as a public
                parcel-collection point and that doing so does not breach its lease, title
                conditions, zoning, or third-party rights.
              </li>
              <li>
                NuruShop may verify documents and premises, screen for fraud/sanctions where lawful,
                and refuse or pause onboarding where required information, safety, suitability, or
                authority is not established.
              </li>
              <li>
                Changes to ownership, control, premises, permits, bank details, security, operating
                hours, or key personnel must be reported before they affect service, or promptly
                where advance notice is impossible.
              </li>
            </ul>
          </section>

          <section id="authority" className={sectionClass}>
            <h2 className={headingClass}>3. Limited appointment and authority</h2>
            <ul className={listClass}>
              <li>
                The appointment is non-exclusive, station-specific, revocable, and limited to
                receiving, safeguarding, updating status, notifying as instructed, and releasing
                assigned parcels.
              </li>
              <li>
                Neither Partner nor Agent may bind NuruShop or a seller, vary prices or terms,
                approve returns/refunds, make product or health claims, offer credit, subcontract
                the service, redirect parcels, or collect money unless expressly authorised in
                writing.
              </li>
              <li>
                Agents must clearly identify themselves as an independent NuruShop pickup location
                and must not claim that the premises or business is owned by NuruShop.
              </li>
              <li>
                No lien, retention right, pledge, sale, use, opening, consolidation, substitution,
                or other dealing with a parcel is permitted except as required by law or
                NuruShop&apos;s written instruction.
              </li>
            </ul>
          </section>

          <section id="standards" className={sectionClass}>
            <h2 className={headingClass}>4. Service and premises standards</h2>
            <ul className={listClass}>
              <li>
                Keep the approved address open during published hours, adequately staffed, visibly
                identifiable, clean, sanitary, secure, well lit, and reasonably accessible to
                customers.
              </li>
              <li>
                Provide safe entry and exit, unobstructed escape routes, suitable fire equipment,
                incident procedures, and trained personnel as required by occupational safety, fire,
                building, and county rules.
              </li>
              <li>
                Serve customers promptly, respectfully, and without unlawful discrimination. Make
                reasonable operational accommodations for persons with disabilities and other
                customers needing assistance.
              </li>
              <li>
                Do not materially change hours or close during published hours without advance
                notice to NuruShop, except in an emergency. Display temporary closure instructions
                where safe and practicable.
              </li>
              <li>
                Meet the signed agreement&apos;s service levels. Repeated queues, unexplained
                closures, failed scans, release errors, complaints, or unsafe conditions may trigger
                corrective action or suspension.
              </li>
            </ul>
          </section>

          <section id="receipt" className={sectionClass}>
            <h2 className={headingClass}>5. Receiving and recording parcels</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-7 text-slate-700 dark:text-slate-300">
              <li>
                Accept parcels only from an authorised carrier/person and only for the assigned
                station.
              </li>
              <li>
                Match the order or manifest, parcel count, label, and station. Do not expose
                customer information to bystanders.
              </li>
              <li>
                Inspect the exterior for visible damage, broken seals, leakage, odour, infestation,
                prohibited contents, or temperature concerns without opening the parcel.
              </li>
              <li>
                Record exceptions before signing the carrier record; photograph visible condition
                where authorised; refuse an unsafe or clearly misdirected parcel and escalate.
              </li>
              <li>
                Immediately record arrival in the portal only after physical receipt. Never mark a
                parcel ready while it is still in transit.
              </li>
              <li>
                Place it in its assigned secure storage position and preserve the label and seal.
              </li>
            </ol>
            <p className="mt-3 text-sm leading-7 text-slate-700 dark:text-slate-300">
              The portal status history is an operational record. False, premature, backdated, or
              omitted updates are a serious breach and may also expose customers to fraud or loss.
            </p>
          </section>

          <section id="custody" className={sectionClass}>
            <h2 className={headingClass}>6. Custody, storage and inventory control</h2>
            <ul className={listClass}>
              <li>
                Keep parcels in a locked, dry, clean, pest-controlled, access-controlled area
                separate from personal goods, retail stock, waste, food preparation, water, direct
                sunlight, and hazardous material.
              </li>
              <li>
                Restrict storage access to trained authorised personnel and keep keys, codes, and
                devices under individual accountability.
              </li>
              <li>
                Follow orientation, stacking, fragility, temperature, security, and segregation
                labels. Do not accept goods requiring capability the station does not have.
              </li>
              <li>
                High-value, sensitive, age-restricted, perishable, temperature-controlled,
                pharmaceutical, or hazardous goods require NuruShop&apos;s prior written approval
                and any legally required licence or handling control.
              </li>
              <li>
                Reconcile physical parcels to portal records at least once each operating day and
                immediately investigate any mismatch.
              </li>
              <li>
                Do not open, sample, use, repair, relabel, photograph contents, combine, split, or
                permit inspection of sealed parcels unless NuruShop gives a lawful written
                instruction.
              </li>
            </ul>
          </section>

          <section id="handover" className={sectionClass}>
            <h2 className={headingClass}>7. Identity verification and handover</h2>
            <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-7 text-slate-700 dark:text-slate-300">
              <li>
                Ask for the order number and the approved verification factors: matching original
                identification and, where issued, an OTP or collection code.
              </li>
              <li>
                Compare only the details required for release. Do not copy or photograph
                identification unless a documented NuruShop procedure expressly requires it and the
                required privacy notice has been given.
              </li>
              <li>
                For a representative, verify their identification, the customer&apos;s
                authorisation, and any additional confirmation required by the portal or support
                team.
              </li>
              <li>
                Confirm parcel count and visible external condition with the collector. Record any
                concern before release.
              </li>
              <li>
                Physically hand over the parcel before selecting <strong>Picked up</strong>. Record
                an accurate note where there is an exception.
              </li>
            </ol>
            <p className="mt-3 text-sm leading-7 text-slate-700 dark:text-slate-300">
              Pause and escalate mismatched details, suspected impersonation, a compromised code,
              disputed payment, coercion, intoxication creating a risk, or any unsafe/unlawful
              release. Never disclose whether another person has a parcel at the station.
            </p>
          </section>

          <section id="uncollected" className={sectionClass}>
            <h2 className={headingClass}>8. Uncollected parcels, refusals and returns</h2>
            <ul className={listClass}>
              <li>
                Continue secure custody through the collection period and follow the authorised
                reminder workflow; do not contact customers from a personal number unless expressly
                approved.
              </li>
              <li>
                Do not impose a fee, return a parcel, change its station, or treat it as abandoned
                without a written platform instruction.
              </li>
              <li>
                A refused parcel remains in custody. Record the reason without changing
                product/refund status and await return instructions.
              </li>
              <li>
                Accept customer returns only where the portal or NuruShop support provides a valid
                return authorisation. Record condition and seal the return as instructed.
              </li>
              <li>
                For transfer or return, verify the authorised carrier, scan the handoff, obtain a
                receipt/manifest, and retain the prescribed custody record.
              </li>
            </ul>
          </section>

          <section id="incidents" className={sectionClass}>
            <h2 className={headingClass}>9. Incidents, emergencies and escalation</h2>
            <ul className={listClass}>
              <li>
                Immediately protect life and contact police, fire, or medical services for threats,
                violence, fire, hazardous leakage, or medical emergencies; then notify NuruShop as
                soon as safe.
              </li>
              <li>
                Report missing, stolen, damaged, wet, opened, tampered, misdirected, or wrongly
                released parcels immediately and no later than the same operating day.
              </li>
              <li>
                Report suspected fraud, bribery, account compromise, unauthorised system access, or
                customer-data exposure immediately. A suspected personal-data breach must reach
                NuruShop within 12 hours of discovery so statutory assessment and notification
                deadlines can be met.
              </li>
              <li>
                Preserve CCTV, packaging, manifests, device logs, messages, photographs, witness
                details, and other evidence. Do not alter records, admit legal liability, promise
                compensation, or make a public statement without authority.
              </li>
              <li>
                Cooperate with lawful investigations, recalls, safety notices, insurer requirements,
                and corrective actions.
              </li>
            </ul>
          </section>

          <section id="data" className={sectionClass}>
            <h2 className={headingClass}>10. Data protection and confidentiality</h2>
            <ul className={listClass}>
              <li>
                NuruShop determines the permitted purposes and means of customer-data processing for
                platform fulfilment. The Station Partner and Agents may process that data only on
                documented instructions and only for receipt, notification, verification, release,
                incident response, support, and legal compliance.
              </li>
              <li>
                Use the minimum data needed; keep it accurate; restrict access; protect it from
                loss, alteration, disclosure, and unauthorised access; and retain it only for the
                instructed period.
              </li>
              <li>
                Do not export portal data to personal phones, notebooks, messaging groups, cloud
                drives, contact lists, marketing systems, or CCTV overlays unless expressly
                authorised and secured.
              </li>
              <li>
                Do not sell, profile, advertise to, solicit, or privately contact customers, and do
                not disclose order activity to family members, employers, neighbours, or other third
                parties.
              </li>
              <li>
                Forward every access, correction, deletion, objection, restriction, portability, or
                privacy complaint to NuruShop without delay; do not respond substantively unless
                authorised.
              </li>
              <li>
                The Station Partner must ensure personnel confidentiality, suitable training,
                documented access controls, secure disposal, assistance with impact assessments and
                breaches, and deletion/return of data at termination.
              </li>
            </ul>
          </section>

          <section id="systems" className={sectionClass}>
            <h2 className={headingClass}>11. Portal accounts and cybersecurity</h2>
            <ul className={listClass}>
              <li>
                Every Agent must use their own account. Shared credentials, password reuse,
                credential forwarding, unattended sessions, and access outside assigned duties are
                prohibited.
              </li>
              <li>
                Use a strong unique password, supported updated devices, device lock, approved
                networks, and any multi-factor authentication NuruShop enables.
              </li>
              <li>
                Verify the NuruShop domain before entering credentials. Do not install unapproved
                tools, bypass controls, scrape data, probe security, or connect automated systems
                without written approval.
              </li>
              <li>
                Sign out or lock the device when leaving it, prevent customers from seeing other
                orders, and promptly report lost devices, phishing, malware, or suspected account
                access.
              </li>
              <li>
                NuruShop may log access and actions, restrict sessions, require a password reset,
                and suspend an account to protect customers, parcels, evidence, or systems.
              </li>
            </ul>
          </section>

          <section id="money" className={sectionClass}>
            <h2 className={headingClass}>12. Service fees, customer money and taxes</h2>
            <ul className={listClass}>
              <li>
                NuruShop pays only fees set out in the signed fee schedule, subject to accurate
                records, invoices where required, lawful deductions/withholding, and resolution of
                genuine disputes.
              </li>
              <li>
                No Agent may demand customer cash, add storage/release/verification fees, redirect
                payment, borrow against a parcel, or use a customer payment for any purpose unless
                an approved cash-collection procedure expressly applies.
              </li>
              <li>
                Where cash collection is authorised, issue the approved receipt, record the exact
                amount immediately, keep funds separate and secure, and remit/reconcile within the
                prescribed time. No set-off is allowed without written authority.
              </li>
              <li>
                Each party is responsible for its own taxes, registrations, returns, invoices, and
                records under Kenyan law. NuruShop may deduct withholding required by law and issue
                the applicable evidence.
              </li>
              <li>
                Bank or mobile-money detail changes require the secure verification process;
                instructions sent only by an unexpected message must not be trusted.
              </li>
            </ul>
          </section>

          <section id="records" className={sectionClass}>
            <h2 className={headingClass}>13. Records, monitoring and audit</h2>
            <ul className={listClass}>
              <li>
                Maintain accurate custody, receipt, collection, exception, return, incident,
                training, permit, staff-access, and payment records for the period stated in the
                signed agreement or required by law.
              </li>
              <li>
                NuruShop may review portal logs, service metrics, complaints, parcel
                reconciliations, and relevant records and may inspect the approved
                operational/storage area on reasonable notice, or without notice where fraud,
                safety, data, or parcel risk reasonably requires urgent action.
              </li>
              <li>
                Inspections must respect unrelated confidential business information, customer
                privacy, safety, and applicable law.
              </li>
              <li>
                Falsifying, deleting, concealing, backdating, or obstructing access to relevant
                records is a material breach.
              </li>
            </ul>
          </section>

          <section id="risk" className={sectionClass}>
            <h2 className={headingClass}>14. Insurance, responsibility and liability</h2>
            <ul className={listClass}>
              <li>
                The Station Partner must maintain insurance reasonably appropriate to its premises
                and agreed services, which may include public liability, employer/work-injury cover,
                fire/theft, parcel/custody, cyber, and fidelity cover, at the limits in the signed
                agreement.
              </li>
              <li>
                Each party is responsible for direct loss caused by its breach, negligence, fraud,
                wilful misconduct, unlawful processing, or acts/omissions of persons for whom it is
                legally responsible, subject to the signed agreement and mandatory law.
              </li>
              <li>
                The Partner must promptly mitigate loss and must not repair, replace, settle, or
                dispose of affected parcels without authorisation, except for urgent safety
                measures.
              </li>
              <li>
                Any indemnity or liability cap in the signed agreement will not exclude liability
                that Kenyan law does not permit a party to exclude, including liability for fraud or
                wilful misconduct and non-waivable consumer, data-protection, employment, or
                health-and-safety duties.
              </li>
              <li>
                Neither party is liable for delay caused solely by an event beyond reasonable
                control where it took reasonable precautions, notified the other party, protected
                parcels/data, and resumed performance promptly. Payment already due and duties
                concerning safety, data, custody, and incident reporting continue.
              </li>
            </ul>
          </section>

          <section id="integrity" className={sectionClass}>
            <h2 className={headingClass}>15. Integrity and prohibited conduct</h2>
            <ul className={listClass}>
              <li>
                No bribery, kickback, facilitation payment, theft, fraud, collusion, false scan,
                fake order, identity misuse, money laundering, counterfeit substitution, harassment,
                retaliation, or concealment of an incident.
              </li>
              <li>
                Do not accept prohibited or illegal goods. Isolate without unnecessary handling and
                escalate any parcel reasonably suspected to contain a weapon, explosive, narcotic,
                dangerous chemical, leaking substance, stolen item, unlawful wildlife product, or
                other illegal/hazardous content.
              </li>
              <li>
                Declare conflicts of interest that could affect impartial fulfilment, including
                ownership links to sellers/carriers or personal involvement in a disputed order.
              </li>
              <li>
                Cooperate with product recalls and lawful directions from regulators or law
                enforcement; where legally permitted, notify NuruShop before disclosing data or
                surrendering a parcel.
              </li>
            </ul>
          </section>

          <section id="relationship" className={sectionClass}>
            <h2 className={headingClass}>16. Relationship, personnel and employment rights</h2>
            <p className="mt-3 text-sm leading-7 text-slate-700 dark:text-slate-300">
              The commercial Station Partner is an independent business and has no general power to
              act for NuruShop. The Partner controls and is responsible for its personnel, payroll,
              supervision, statutory deductions, training, discipline, and workplace duties. An
              individual&apos;s legal status depends on the signed arrangements and the real working
              relationship, not merely the word “agent.” Nothing here waives or reduces any right
              that applies under the Employment Act, labour legislation, work-injury law, or
              social-security law. The Partner may not subcontract or assign station services
              without NuruShop&apos;s prior written approval.
            </p>
          </section>

          <section id="brand" className={sectionClass}>
            <h2 className={headingClass}>
              17. NuruShop brand, communications and confidential information
            </h2>
            <ul className={listClass}>
              <li>
                Use NuruShop names, marks, signs, uniforms, materials, and portal content only as
                supplied or approved, only for the station service, and remove/return them when
                instructed.
              </li>
              <li>
                Do not register confusing names/domains, alter official notices, make public
                statements for NuruShop, or use the relationship to endorse unrelated goods or
                services.
              </li>
              <li>
                Commercial terms, security processes, non-public system information, seller/customer
                data, and incident material are confidential. Disclose them only to authorised
                persons with a need to know or where law requires.
              </li>
              <li>
                Confidentiality, data-protection, record-preservation, payment, and accrued
                liability duties survive termination as applicable.
              </li>
            </ul>
          </section>

          <section id="ending" className={sectionClass}>
            <h2 className={headingClass}>18. Corrective action, suspension and termination</h2>
            <ul className={listClass}>
              <li>
                NuruShop may require training, a corrective plan, restricted access, stock
                reconciliation, or service improvement for a remediable issue.
              </li>
              <li>
                It may immediately suspend accounts, deliveries, customer collection, or the station
                where reasonably necessary for safety, fraud, data security, missing parcels,
                unlawful conduct, repeated release failures, expired permits, insolvency risk, or
                material breach.
              </li>
              <li>
                Termination rights and notice periods are in the signed agreement. Urgent suspension
                does not decide final liability and NuruShop will give reasons and a reasonable
                opportunity to respond where law and safety permit.
              </li>
              <li>
                On suspension or termination, stop representing the station as active; preserve and
                reconcile every parcel; follow transfer instructions; return property; revoke
                personnel access; preserve required evidence; and securely return/delete data as
                instructed.
              </li>
              <li>
                Neither Partner nor Agent may hold parcels or customer data hostage because of a
                payment or contractual dispute.
              </li>
            </ul>
          </section>

          <section id="disputes" className={sectionClass}>
            <h2 className={headingClass}>19. Notices, changes, disputes and Kenyan law</h2>
            <ul className={listClass}>
              <li>
                Operational notices may be delivered through the portal or verified contact details.
                Formal contractual notices follow the signed station agreement.
              </li>
              <li>
                NuruShop may update these terms for law, security, or service changes. Material
                changes will be notified before they take effect where reasonably practicable.
                Continued portal use after the effective date constitutes acceptance only to the
                extent permitted by law; a change requiring express consent will be presented for
                acceptance.
              </li>
              <li>
                Raise operational disputes promptly with NuruShop. The parties should first have
                authorised representatives negotiate in good faith, without delaying urgent
                protection of people, parcels, funds, or data.
              </li>
              <li>
                The signed agreement controls any mediation, arbitration, court, venue, or notice
                process. If it is silent, Kenyan law governs and Kenyan courts with jurisdiction may
                hear the dispute. Either party may seek urgent interim relief and may report a
                matter to a competent regulator or law-enforcement body.
              </li>
              <li>
                Invalid terms are severed to the minimum extent necessary. Delay in enforcement is
                not a waiver. These terms do not confer rights on a person who is not a party except
                where law provides otherwise.
              </li>
            </ul>

            <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm dark:bg-slate-950">
              <h3 className="flex items-center gap-2 font-black text-slate-900 dark:text-white">
                <Scale size={18} className="text-brand" aria-hidden="true" /> Kenyan legal framework
              </h3>
              <ul className="mt-3 space-y-2 text-slate-600 dark:text-slate-300">
                <li>
                  <a
                    className={linkClass}
                    href="https://new.kenyalaw.org/akn/ke/act/2012/46/eng@2022-12-31"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Consumer Protection Act, 2012
                  </a>{" "}
                  — fair practices, disclosures, internet agreements, quality, and remedies.
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
                  and{" "}
                  <a
                    className={linkClass}
                    href="https://new.kenyalaw.org/akn/ke/act/ln/2021/263/eng@2022-12-31"
                    target="_blank"
                    rel="noreferrer"
                  >
                    General Regulations
                  </a>{" "}
                  — lawful processing, processor controls, security, rights, and breach response.
                </li>
                <li>
                  <a
                    className={linkClass}
                    href="https://new.kenyalaw.org/akn/ke/act/2007/15/eng@2007-11-09"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Occupational Safety and Health Act, 2007
                  </a>{" "}
                  and{" "}
                  <a
                    className={linkClass}
                    href="https://new.kenyalaw.org/akn/ke/act/1921/38/eng@2022-12-31"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Public Health Act
                  </a>{" "}
                  — safe workplaces and sanitary premises.
                </li>
                <li>
                  <a
                    className={linkClass}
                    href="https://new.kenyalaw.org/akn/ke/act/2007/11/eng@2024-04-26"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Employment Act, 2007
                  </a>{" "}
                  — minimum employee rights where an employment relationship exists.
                </li>
                <li>
                  <a
                    className={linkClass}
                    href="https://new.kenyalaw.org/akn/ke/act/2015/29/eng@2022-07-01"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Tax Procedures Act
                  </a>{" "}
                  and other applicable tax law — registration, records, returns, and statutory
                  deductions.
                </li>
                <li>
                  <a
                    className={linkClass}
                    href="https://new.kenyalaw.org/akn/ke/act/2018/5/eng@2018-05-18"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Computer Misuse and Cybercrimes Act, 2018
                  </a>{" "}
                  — unauthorised access, interference, and misuse of credentials or data.
                </li>
              </ul>
            </div>
          </section>

          <section className="rounded-3xl bg-brand-ink p-6 text-white sm:p-8">
            <h2 className="text-xl font-black">Station support and incident reporting</h2>
            <p className="mt-2 text-sm leading-6 text-green-50">
              Use the verified operations contact in the signed station agreement for urgent
              incidents. General support: +254 142 225 233 or nurushoponline@gmail.com.
            </p>
            <p className="mt-3 text-xs leading-5 text-green-100">
              Customers should be directed to the{" "}
              <Link
                href={PICKUP_POLICY_PATH}
                className="font-bold text-white underline underline-offset-2"
              >
                Pickup Station Policy
              </Link>{" "}
              for collection rights and procedures.
            </p>
          </section>
        </article>
      </div>
    </main>
  );
}
