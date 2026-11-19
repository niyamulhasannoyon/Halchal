# Halchal (হালচাল) — Bangladeshi Legal & Privacy Compliance Memorandum

> **Compliance Status:** Draft Policy Prepared for Legal Review  
> **Mandatory Action:** Must be formally reviewed by a qualified Bangladeshi Cyber Lawyer / Advocate of the Supreme Court of Bangladesh prior to pilot launch.  
> **Document Date:** 2026-11-19

---

## 1. Legal Context in Bangladesh (2024–2026 Landscape)

The digital legal landscape in Bangladesh is in a period of active legislative transition. DevSecOps and Product teams must operate with extreme caution regarding crowd-sourced public utility reporting and citizen data storage:

1. **Information and Communication Technology (ICT) Act, 2006 (Amended 2013):**
   - Regulates electronic records, cyber crimes, and digital signatures.
   - Sections regarding false or defamatory digital communications mandate that crowd-sourced platforms maintain strict anti-defamation safeguards.
2. **Digital Security Act (DSA) 2018 & Cyber Security Act (CSA) 2023:**
   - Underwent widespread debate and active transition/repeal discussions by the interim government in late 2024 through 2026.
   - Provisions concerning "spreading false information or rumors regarding state infrastructure or public utilities" carry heightened sensitivity.
   - **Halchal's Architectural Immunity:** Halchal mitigates this risk by:
     - Disclaiming that statuses are **"community-reported, not an official measurement"** (`নাগরিকদের তথ্যের ভিত্তিতে তৈরি, এটি কোনো অফিশিয়াল পরিমাপ নয়`).
     - Requiring multi-reporter consensus (`distinct_reporters >= 3` AND `weighted_score >= 3.0`) before any confirmed state is published.
     - Strictly barring user-submitted free-text comments, vendor names, or editorializing.
3. **Draft Personal Data Protection Act (PDPA):**
   - Mandates citizen consent, purpose limitation, data minimization, right to erasure, and strict restrictions on cross-border transfer of sensitive personal data.
   - **Halchal's Compliance:** Halchal does not store or process sensitive personal data (no National ID, biometric data, phone numbers, or exact residential addresses).
4. **Bangladesh Telecommunication Regulatory Commission (BTRC) Guidelines:**
   - Governing push notifications, SMS alerts, and public network broadcasting.

---

## 2. Halchal Privacy Architecture vs. Regulatory Requirements

| Regulatory Principle | Halchal Architecture Implementation | Compliance Status |
| :--- | :--- | :--- |
| **Data Minimization** | Ephemeral latitude/longitude discarded immediately in server memory; only H3 Res 8 hexagonal cell (~0.74 km²) is stored. Zero raw GPS storage. | **Fully Compliant** (ADR-0005) |
| **Right to Erasure (Deletion)** | Dedicated `/api/user/delete` endpoint and UI button in `/settings`. Permanently deletes user profile, push subscriptions, and historical reports. | **Fully Compliant** |
| **Data Retention Limits** | Raw individual reports are permanently deleted after 72 hours via automated `pg_cron` jobs (`expire_and_rollup`). | **Fully Compliant** |
| **Anti-Defamation & Vendor Protection** | Zero names of shopkeepers, dealers, or individuals permitted anywhere in the system. LPG cylinder prices require `>= 5` reports and display only area medians. | **Fully Compliant** |
| **Content Abuse & Takedown** | Dedicated contact points: `takedown@halchal.bd` and `privacy@halchal.bd` with guaranteed 24–48 hour response time. | **Fully Compliant** |

---

## 3. Mandatory Lawyer Review Notice (Bangla & English)

> ### ⚠️ আইনি পর্যালোচনা ও ছাড়পত্র নোটিশ (Mandatory Legal Review Notice)
> **হালচাল উন্মুক্ত করার পূর্বে আবশ্যক:**  
> এই গোপনীয়তা নীতি (`web/src/app/privacy/page.tsx`) এবং ব্যবহারের শর্তাবলী (`web/src/app/terms/page.tsx`) বর্তমান বাংলাদেশী তথ্যপ্রযুক্তি আইন, সাইবার সুরক্ষা অধ্যাদেশ এবং উপাত্ত সুরক্ষা খসড়া আইনের আলোকে প্রস্তুত করা হয়েছে।  
> তবে সাধারণ নাগরিকদের জন্য পাইলট আকারে উন্মুক্ত করার পূর্বে **বাংলাদেশ সুপ্রিম কোর্টের একজন নিবন্ধিত সাইবার আইনজীবী (Advocate / Cyber Law Specialist)** দ্বারা এই খসড়াগুলোর আইনি বৈধতা পুঙ্খানুপুঙ্খভাবে যাচাই এবং আনুষ্ঠানিক অনুমোদন গ্রহণ করা বাধ্যতামূলক।

---

## 4. Checklist for Enrolled Legal Counsel

Before granting launch clearance, the reviewing advocate should verify:
- [ ] Language in `/terms` provides adequate disclaimer under Bangladesh Contract Act 1872 and Tort principles.
- [ ] The absence of free-text comments protects the platform under safe-harbor intermediary guidelines.
- [ ] Right to Erasure implementation satisfies evolving draft Personal Data Protection Act requirements.
- [ ] Contact details (`takedown@halchal.bd`) meet grievance officer requirements for digital platforms in Bangladesh.
