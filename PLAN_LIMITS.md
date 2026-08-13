# What a "user" is in FinMatrix — and why plans meter delivery personnel

**Short answer:** you were right. Customers, vendors and employees are *records*, not users — nothing limits them and nothing should. Delivery personnel are the only resource that is both a real cost and actually enforced, which makes them the only honest basis for pricing.

This document records the evidence, so the decision doesn't get re-litigated later.

---

## 1. The four things people confuse

| Concept | What it actually is | Can it log in? | Limited? |
|---|---|---|:--:|
| **User** | A row in `users` with an email + password hash. A person who signs into the app. Linked to a company through `user_companies`. | **Yes** | No |
| **Customer** | A row in `customers` — someone you *invoice*. Name, address, payment terms, AR balance. | No | **No** |
| **Vendor** | A row in `vendors` — someone you *buy from*. Feeds AP and bills. | No | **No** |
| **Employee** | A row in `employees` — someone you *pay*. Feeds payroll runs and paystubs. | No | **No** |
| **Delivery personnel** | A row in `delivery_personnel_profiles` **plus a real `users` row with `role: 'delivery'`** — a rider who signs into the delivery app. | **Yes** | **Yes — this is the meter** |

The load-bearing distinction: **customers, vendors and employees carry no `userId` and no credentials.** They are business data. Adding your ten-thousandth customer costs the platform a database row. Adding a delivery rider creates a login, an active mobile session, GPS/location logging, delivery assignments, photo uploads and status history.

Verified in `delivery-personnel.service.ts` — creating personnel creates a `User` with `role: 'delivery'`:

```ts
// src/modules/delivery-personnel/delivery-personnel.service.ts:109
role: 'delivery',
```

---

## 2. "Up to 25 users" was decorative — it was never enforced

The old plan cards showed a seat count. It meant nothing.

**`maxUsers` is not checked anywhere in the codebase.** Grepping the whole backend for it returns only:

| Where | What it is |
|---|---|
| `super-admin/entities/subscription-plan.entity.ts:19` | A column on the **legacy DB-backed plan table**, superseded by `billing/plan-config.ts` |
| `super-admin/super-admin.service.ts:369` | A **hardcoded display value**: `maxUsers: p.companyType === 'small_business' ? 3 : 25` |
| `database/seeds/super-admin-seed.ts` | Seed data for the same legacy table |
| `dto/create-subscription-plan.dto.ts` | A field on an endpoint that **rejects every call** with `PLANS_CONFIG_DEFINED` |

There is no guard, no comparison, no thrown error. Nothing counts your team members against it. The "25" on the Large Organization card was a literal in a ternary.

`maxInvoices` is the same story — a legacy column, never enforced.

**So the card was making a promise the system never kept, in both directions:** it implied a ceiling that didn't exist, and implied the plans differed in a way they didn't.

---

## 3. `deliveryPersonnelLimit` *is* enforced — it's the only real limit

Unlike `maxUsers`, this one is genuinely checked before a rider is created:

```ts
// src/modules/delivery-personnel/delivery-personnel.service.ts:83
if (activeCount >= planConfig.deliveryPersonnelLimit) {
  throw new BadRequestException({
    message: `Your ${planConfig.label} plan allows ${planConfig.deliveryPersonnelLimit} ...`,
    limit: planConfig.deliveryPersonnelLimit,
  });
}
```

Note `activeCount` — it counts **currently active** personnel, so deactivating a rider frees the slot. The limit is a concurrency cap, not a lifetime quota.

This is why it works as a pricing lever: it maps to something the customer can feel and the platform can measure, and it is already wired end to end.

---

## 4. The resulting plan model

Everything in FinMatrix is unlimited **except** active delivery personnel.

| | Starter | Growth | Scale |
|---|:--:|:--:|:--:|
| **Active delivery personnel** | **2** | **5** | **10** |
| Team members (users) | Unlimited | Unlimited | Unlimited |
| Customers | Unlimited | Unlimited | Unlimited |
| Vendors | Unlimited | Unlimited | Unlimited |
| Employees / payroll | Unlimited | Unlimited | Unlimited |
| Invoices, bills, payments | Unlimited | Unlimited | Unlimited |
| Inventory items, POs, deliveries | Unlimited | Unlimited | Unlimited |
| Accounting, reports, period close | Full | Full | Full |
| **3 months** | Rs 9,000 | Rs 12,000 | Rs 18,000 |
| **6 months** | Rs 13,500 | Rs 18,000 | Rs 27,000 |

The 6-month price is 75% of the 3-month monthly rate — a flat 25% saving for paying longer up front.

**Every accounting and warehouse feature is on every plan.** A two-rider operation gets the same double-entry ledger, inventory valuation, GRNI matching and financial statements as a ten-rider one. You are selling delivery capacity, not accounting features.

---

## 5. What changed in the code

- Plan cards no longer show a seat count. `maxUsers` was removed from the app's display model entirely, rather than left rendering a number nothing honours.
- The delivery-personnel allowance is now shown on every plan card — it is the only difference between them, so hiding it would make all six plans look identical apart from price.
- `plan-config.ts` carries the 2/5/10 ladder, with a spec asserting the rungs, both billing periods per rung, and that a bigger allowance never costs less per month.

---

## 6. One thing to watch

`deliveryPersonnelLimit` counts **active** personnel. A warehouse on Starter (2) can rotate through twenty riders over a year as long as no more than two are active at once. If you ever want to bill on *total* riders onboarded rather than concurrent ones, that is a different check and would need a new counter — the current one deliberately measures concurrency.
