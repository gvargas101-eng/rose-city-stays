// Rose City Stays — Texas Short-Term Rental Lease Agreement
// This agreement is displayed to guests before checkout and must be accepted.

export const RENTAL_AGREEMENT_VERSION = "2026-07";

export const RENTAL_AGREEMENT_SECTIONS = [
  {
    id: "parties",
    title: "1. Parties to This Agreement",
    content: `This Short-Term Rental Agreement ("Agreement") is entered into between **Rose City Stays** ("Host" or "Owner"), a short-term rental management company operating in Tyler, Smith County, Texas, and the individual completing the booking ("Guest"). This Agreement governs the temporary occupancy of the rental property selected by the Guest (the "Property") for the dates specified at checkout (the "Rental Period").

By completing the booking and checking the acknowledgment box, the Guest agrees to be bound by all terms and conditions set forth in this Agreement. This Agreement constitutes a legally binding contract under the laws of the State of Texas.`,
  },
  {
    id: "occupancy",
    title: "2. Occupancy and Use",
    content: `The Property is rented exclusively for residential, short-term lodging purposes. The Guest agrees that the total number of occupants shall not exceed the maximum occupancy stated on the property listing at any time. Occupancy by any person other than the registered Guest and approved guests is strictly prohibited.

The Guest shall use the Property only for lawful purposes. Any use of the Property for commercial activities, events, parties, gatherings, or any purpose other than private residential lodging is expressly prohibited unless prior written consent has been obtained from the Host. Violation of this provision is grounds for immediate termination of this Agreement without refund.`,
  },
  {
    id: "checkin_checkout",
    title: "3. Check-In and Check-Out",
    content: `**Check-In Time:** 3:00 PM (Central Time) on the first day of the Rental Period. Early check-in may be available upon request and is subject to Host approval and availability. Early check-in is never guaranteed.

**Check-Out Time:** 11:00 AM (Central Time) on the last day of the Rental Period. Late check-out may be available upon request and is subject to Host approval and an additional fee. Failure to vacate by the check-out time may result in a late check-out fee of up to one additional night's rate.

The Guest is responsible for ensuring all personal belongings are removed from the Property at check-out. The Host is not responsible for items left behind, though reasonable efforts will be made to return found items at the Guest's expense.`,
  },
  {
    id: "payment",
    title: "4. Rental Fees and Payment",
    content: `The total rental fee consists of the nightly rate, a cleaning fee, applicable Texas state and local occupancy taxes, and any applicable extra guest fees, all as displayed at checkout. Payment is due in full at the time of booking. All payments are processed securely through Stripe.

**Texas Hotel Occupancy Tax:** Pursuant to Texas Tax Code Chapter 156, short-term rentals of 30 days or fewer are subject to Texas state hotel occupancy tax (6%) and applicable Smith County and City of Tyler local hotel occupancy taxes. These taxes are included in the total displayed at checkout.

All fees are non-negotiable. The Host reserves the right to charge the Guest's payment method on file for any additional fees incurred during the stay, including but not limited to damage, excessive cleaning, unauthorized late check-out, or violation of this Agreement.`,
  },
  {
    id: "cancellation",
    title: "5. Cancellation and Refund Policy",
    content: `The cancellation policy applicable to the Guest's booking is displayed on the property listing page and at checkout. By completing the booking, the Guest acknowledges and agrees to the cancellation policy in effect at the time of booking.

In the event of a cancellation by the Host due to circumstances beyond the Host's reasonable control (including but not limited to property damage, natural disaster, or safety concerns), the Guest will receive a full refund of all amounts paid. The Host's liability in such circumstances is limited to a refund of amounts paid and does not extend to any consequential damages, travel costs, or other expenses incurred by the Guest.

No refunds will be issued for early departures, unused nights, or dissatisfaction with the Property unless the Property materially fails to conform to its listing description, in which case the Guest must notify the Host within 24 hours of check-in.`,
  },
  {
    id: "damage_deposit",
    title: "6. Property Condition and Damage",
    content: `The Guest agrees to maintain the Property in the same condition as found at check-in, reasonable wear and tear excepted. The Guest is responsible for any damage to the Property, its furnishings, fixtures, appliances, or contents caused by the Guest or any occupant or visitor during the Rental Period.

The Guest authorizes the Host to charge the Guest's payment method on file for the cost of repairing or replacing any damaged items. The Host will provide documentation of any damage charges. In the event of significant damage, the Host reserves the right to pursue additional remedies available under Texas law.

The Guest agrees to report any pre-existing damage or maintenance issues to the Host within 2 hours of check-in to avoid being held responsible for pre-existing conditions.`,
  },
  {
    id: "house_rules",
    title: "7. House Rules",
    content: `The Guest agrees to comply with all house rules applicable to the Property, which are displayed on the property listing page and incorporated herein by reference. The following rules apply to all Rose City Stays properties:

**No Smoking:** Smoking of any substance (including tobacco, marijuana, vaping, or e-cigarettes) is strictly prohibited inside the Property, in any enclosed area, or within 25 feet of any entrance. A minimum cleaning fee of $250 will be charged for any evidence of smoking inside the Property.

**No Pets:** Pets are not permitted at the Property unless the listing explicitly states "pets allowed" and prior written approval has been obtained from the Host. Unauthorized pets will result in a minimum fee of $150 per pet per night.

**No Parties or Events:** The Property may not be used for parties, events, gatherings, or any assembly of persons beyond the registered guest count. Quiet hours are in effect from 10:00 PM to 8:00 AM. Excessive noise at any time that disturbs neighbors is prohibited.

**No Illegal Activity:** The Guest agrees not to engage in any illegal activity on or about the Property. Any illegal activity is grounds for immediate termination of this Agreement and may be reported to law enforcement.

**Guest Registration:** All adult occupants (18+) must be registered with the Host prior to or upon check-in. Unregistered guests are not permitted to stay overnight.

**Property Care:** The Guest agrees to treat the Property with respect, dispose of trash properly, and leave the Property in a reasonably clean condition at check-out. Dishes should be washed or placed in the dishwasher, and all trash should be placed in the designated receptacles.`,
  },
  {
    id: "liability",
    title: "8. Limitation of Liability and Indemnification",
    content: `The Guest acknowledges that the use of the Property and its amenities is at the Guest's own risk. The Host shall not be liable for any injury, loss, damage, or theft of personal property occurring on or about the Property during the Rental Period, except to the extent caused by the Host's gross negligence or willful misconduct.

**TO THE MAXIMUM EXTENT PERMITTED BY TEXAS LAW, THE HOST'S TOTAL LIABILITY TO THE GUEST FOR ANY CLAIM ARISING OUT OF OR RELATED TO THIS AGREEMENT SHALL NOT EXCEED THE TOTAL RENTAL FEES PAID BY THE GUEST FOR THE APPLICABLE RENTAL PERIOD.**

The Guest agrees to indemnify, defend, and hold harmless the Host, its officers, employees, and agents from and against any claims, damages, losses, costs, and expenses (including reasonable attorneys' fees) arising out of or related to the Guest's use of the Property, violation of this Agreement, or the acts or omissions of the Guest or any occupant or visitor.`,
  },
  {
    id: "texas_law",
    title: "9. Governing Law and Dispute Resolution",
    content: `This Agreement shall be governed by and construed in accordance with the laws of the State of Texas, without regard to its conflict of law principles. Any dispute arising out of or relating to this Agreement shall be subject to the exclusive jurisdiction of the state and federal courts located in Smith County, Texas.

In the event of a dispute, the parties agree to first attempt resolution through good-faith negotiation. If negotiation fails, the parties agree to non-binding mediation before pursuing litigation. The prevailing party in any legal action to enforce this Agreement shall be entitled to recover reasonable attorneys' fees and costs.

**Texas Property Code Notice:** This Agreement is subject to applicable provisions of the Texas Property Code, including but not limited to provisions governing residential tenancies and landlord-tenant relationships, to the extent applicable to short-term rentals.`,
  },
  {
    id: "entire_agreement",
    title: "10. Entire Agreement and Severability",
    content: `This Agreement, together with the property listing, house rules, and cancellation policy displayed at checkout, constitutes the entire agreement between the parties with respect to the subject matter hereof and supersedes all prior agreements, understandings, and representations. No modification of this Agreement shall be binding unless made in writing and signed by both parties.

If any provision of this Agreement is found to be invalid or unenforceable, the remaining provisions shall continue in full force and effect. The failure of either party to enforce any provision of this Agreement shall not constitute a waiver of that party's right to enforce such provision in the future.

By completing the booking and checking the acknowledgment box, the Guest represents that they are at least 21 years of age, have read and understood this Agreement in its entirety, and agree to be bound by its terms.`,
  },
];

export const AGREEMENT_ACKNOWLEDGMENT_TEXT =
  "By checking this box, I confirm that I am at least 21 years of age, I have read and agree to the Rose City Stays Short-Term Rental Agreement and House Rules, and I understand that this constitutes a legally binding contract under Texas law.";
