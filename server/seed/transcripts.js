export const SEED_DEALS = [
  {
    key: 'acme',
    company_name: 'Acme Corp',
    contact_name: 'Sarah Chen',
    deal_value: 185000,
    stage: 'negotiation',
    created_at: '2026-07-13 09:00:00',
    calls: [
      {
        call_date: '2026-07-20',
        transcript: `Jordan Ellis (DealMind AE): Sarah, thanks for making time today. Before we go deep, do you mind if I record this so I can send you an accurate recap?

Sarah Chen (VP Operations, Acme Corp): Sure, go ahead. I want to be upfront, we are not shopping right now. We just came off a bad rollout last year with another vendor and I am gun-shy.

Jordan Ellis: That is fair, and honestly more useful to me than a warm pitch. Can you tell me about that?

Sarah Chen: We rolled out a field service scheduling tool to about 300 technicians. Eight weeks in, adoption was maybe 15 percent. Nobody told us anything. It quietly died and we ate the implementation cost. So I am not looking for another tool, I am looking for something that will not embarrass me in front of my board.

Jordan Ellis: That is a completely reasonable bar. Who else would be in the room when this gets decided?

Sarah Chen: Me, Dana Ruiz, she is our Director of Revenue Operations. And eventually our CFO, Priya Nair, but she is allergic to process and will only show up once we have numbers.

Jordan Ellis: That is helpful. What would make this a no-go for you?

Sarah Chen: If it does not do multi-site scheduling. We have 14 sites and each one has different shift patterns. I have been burned by tools that assume one schedule for everybody.

Jordan Ellis: Noted, multi-site is a hard requirement. Let me ask the boring procurement question now, is there a budget conversation we should plan for?

Sarah Chen: There will be. I have a placeholder in next year's plan but it is not approved. If I cannot show a number, Priya will not move.

Jordan Ellis: Understood. I will come back with something you can actually take to her. What does a good outcome look like for you at Acme?

Sarah Chen: If I can get 80 percent of technicians actively using it within the first quarter, and I can prove it, I will champion this hard.

Jordan Ellis: That is a measurable target and I like it. I will put together a plan around exactly that.

Sarah Chen: Alright. Honestly, that is the most useful first call I have had with a vendor in a while. Send me something I can forward internally.`,
      },
      {
        call_date: '2026-07-27',
        transcript: `Jordan Ellis (DealMind AE): Sarah, as promised, here is the number you can take to Priya. Sixty-eight thousand a year for the multi-site tier.

Sarah Chen (VP Operations, Acme Corp): Sixty-eight. Okay. I told Priya it would be under fifty. I said under fifty, Jordan.

Jordan Ellis: Under fifty for single site. Multi-site is a different product and that is where your fourteen locations land.

Sarah Chen: This is 15 percent above list. I did the math on the way in from the parking lot. We are being asked to pay a 15 percent premium over list, and I have to defend that to a CFO who thinks we are overpaying everywhere.

Jordan Ellis: I hear you, and I would push back slightly. Your list price is for 50 users. You have 300 technicians and 14 sites. Per technician, you are below the tier midpoint.

Sarah Chen: I do not care about per technician math. I care that when Priya asks why we are 15 percent above list, I need a sentence. What is the sentence?

Jordan Ellis: The honest sentence is that multi-site scheduling is a different product and the alternative is either a second vendor for the other 13 sites or a custom build.

Sarah Chen: Do not give me a custom build. We tried an internal custom build once. It was a disaster and it consumed two engineers for a year.

Jordan Ellis: Understood, so multi-vendor or us. Fair.

Sarah Chen: Right now though I am unconvinced the value story is strong enough. I can see the product is good. I cannot see the ROI. If I take sixty-eight thousand to Priya and she asks what we get that we do not get from the free tier, I have nothing.

Jordan Ellis: That is fair, and that is on me, I did not build the business case. Can I send you a one-page ROI model with your actual technician count, utilization rate and dispatch cost?

Sarah Chen: Yes. And bring something about implementation timeline too, because if this drags past our planning cycle in October it is dead until next year.

Jordan Ellis: You will have both. I will also bring a volume discount structure so you have something to negotiate against.

Sarah Chen: Fine. But I am not moving on price yet. I need the ROI first.`,
      },
      {
        call_date: '2026-08-10',
        transcript: `Jordan Ellis (DealMind AE): Sarah, did the ROI model hold up?

Sarah Chen (VP Operations, Acme Corp): It did. Dana stress-tested it and it survived. We are at about 300,000 dollars in recovered dispatch time per year against 68,000 spend. That clears the bar, assuming implementation goes well.

Jordan Ellis: That is a 4.4x. I would rather we plan for the downside case though, what happens if adoption lands at 50 percent instead of 80?

Sarah Chen: Then it is still positive, maybe 2x. Fine. Price is not my problem right now.

Jordan Ellis: Good, so let me ask the thing I have been putting off. Who else is in the running?

Sarah Chen: We are also talking to Salesforce. Their field service product is bundled into an agreement we already have, so from a procurement standpoint it is close to free. Priya loves that argument.

Jordan Ellis: Understood. Bundled looks free until you count what it actually does. Do they have a multi-site scheduler that handles 14 different shift patterns?

Sarah Chen: I have not tested that specifically. I know their scheduling is more rigid. I asked their SE about it and he sort of changed the subject, which I noticed.

Dana Ruiz (Director of Revenue Operations, Acme Corp): Jordan, I will be honest. The free angle is doing a lot of work internally. If you are 20 percent cheaper than list, this becomes an easy approval.

Jordan Ellis: I hear that. I am not going to match free, but I can look at what we can do on a multi-year term. Give me something to take to your finance team.

Dana Ruiz: Multi-year is hard. Our fiscal year resets in January and we do not like long commitments when the rollout is unproven.

Sarah Chen: Also, and I want to be transparent about this, the Salesforce conversation has a champion on their side. Our existing account manager is pushing it and he is genuinely helpful. That makes it harder.

Jordan Ellis: I appreciate the directness. I would rather compete against a good incumbent rep than a bad one. If Salesforce is bundled for you at zero marginal cost, the argument has to be capability, not price. Can I get 45 minutes with Dana and one of your dispatch leads to see whether a rigid schedule actually works for your 14 sites?

Sarah Chen: I can do the dispatch lead. Dana?

Dana Ruiz: Sure, that works.

Sarah Chen: Alright. But Jordan, if the scheduling demo flops, this is over.`,
      },
      {
        call_date: '2026-08-24',
        transcript: `Jordan Ellis (DealMind AE): Tom, thanks for jumping on. Sarah said you are the one who has to say yes to anything that touches the network.

Tom Bradley (IT Director, Acme Corp): That is a fair summary. I inherited an environment that has been breached once, so I am careful. Two things, and if I do not like them we are done.

Jordan Ellis: Go ahead.

Tom Bradley: First, identity. We are a Microsoft shop. Everything goes through Entra ID. If I cannot do SAML SSO and automated user provisioning, nobody gets installed.

Jordan Ellis: SAML SSO and SCIM provisioning are both in the platform. I can have our solutions engineer walk through the exact Entra configuration on the call.

Tom Bradley: Second, and this is the one that kills deals, compliance. I need a current SOC 2 Type II report. Not a summary deck, the actual report. And I need to know where my data physically lives, because we have a Canadian subsidiary with data residency obligations.

Jordan Ellis: SOC 2 Type II we have, current as of April, and I can send the report under NDA today. Data residency, the US and EU regions are separate, and Canada is currently a request from two other customers, so I will not pretend we have it. I can tell you exactly what the timeline would be and what it would cost.

Tom Bradley: Canada is a hard requirement for us. Not negotiable.

Jordan Ellis: Understood. Then let me be straight with you, Tom. If Canada is a true hard requirement, I am not going to tell you a roadmap date that slips. Let me get you an honest answer in writing this week and you can decide whether to keep the conversation going.

Tom Bradley: I appreciate that more than you know. Most vendors promise me everything in the first call.

Dana Ruiz (Director of Revenue Operations, Acme Corp): Can I jump in? I do not want to lose momentum over residency. If we had to run the Canadian entity on a separate deployment, is that workable?

Jordan Ellis: Technically yes, it is the same product with a different region. Operationally it is a second admin relationship and you would be supporting two environments.

Tom Bradley: Two environments is what I am trying to get away from. Single sign-on is fine. Residency is the real question. Send the honest answer and I will take it to my CISO.

Sarah Chen (VP Operations, Acme Corp): I agree with Tom, this is the gating item. Everything else we like.

Jordan Ellis: Understood. Honest answer by Thursday.`,
      },
      {
        call_date: '2026-09-14',
        transcript: `Jordan Ellis (DealMind AE): Sarah, Priya, Tom. I brought three things. The ROI model with your real numbers, the SOC 2 Type II report, and an honest answer on data residency. Resolved objection one, the 15 percent above list pricing.

Sarah Chen (VP Operations, Acme Corp): Go ahead.

Jordan Ellis: On a three-year term with 250 users, I have approval to go to list. That removes the premium you could not defend to Priya, and it gives you price protection for three years.

Priya Nair (CFO, Acme Corp): That is a meaningful difference. From fifteen percent over to list, with a three-year cap. I can live with that, and I can defend it, because I can say we locked our price.

Jordan Ellis: Thank you. Resolved objection two, Tom's security and compliance review. SOC 2 Type II is current, the report is in the shared folder, and the penetration test summary from March is attached.

Tom Bradley (IT Director, Acme Corp): I read the SOC 2 last week. It is clean. The subprocessor list is missing two vendors you had last year, but otherwise this is a pass for me.

Jordan Ellis: Noted on the subprocessor list, I will fix that today. And the honest answer on Canada, which I promised you would not be a promise: the Canada region is not available this year. It is a 2027 engineering investment. I would rather you hear that from me now.

Sarah Chen: That is going to be a problem.

Jordan Ellis: It is, and I will not pretend otherwise. Here is what I propose. Acme Corp operates in the US and the UK, both of which we serve today out of existing regions. The Canadian entity runs on a separate deployment, supported by your existing team, and I will personally make sure the Canadian rollout is the last phase, not the first. When Canada opens, you migrate at no cost.

Priya Nair: How long does that put the Canadian entity on manual processes?

Jordan Ellis: Nine to twelve months.

Tom Bradley: That is acceptable if the alternative is a no.

Sarah Chen: Resolved objection three, the Salesforce comparison. Dana, want to take this one?

Dana Ruiz (Director of Revenue Operations, Acme Corp): I want to be honest. We ran their scheduler against two of our sites and it could not handle a rotating shift pattern. Their SE acknowledged the limitation and said it would be on the 2027 roadmap. When your demo did the same scenario live, it just worked. That decided it for me.

Jordan Ellis: Thank you for being straight about that. I would rather win on a capability gap than a discount.

Sarah Chen: So where does that leave us. Priya?

Priya Nair: From finance I am a yes. I will approve the three-year at list.

Tom Bradley: From IT I am a yes, pending the SSO configuration working. I want your solutions engineer on the implementation kickoff.

Sarah Chen: Then Jordan, what do you need from me to sign?

Jordan Ellis: Three things. A 30-day pilot on two sites starting October 1, a mutual NDA countersigned today, and a kickoff with your IT lead in the first week. If the pilot hits 80 percent technician adoption in 30 days, that becomes our rollout scope.

Sarah Chen: Agreed. Send the paperwork today, I will sign.

Jordan Ellis: You will have it within the hour. One last thing, I will send a two-year plan for Priya with the Canadian phase costed separately, so finance is not surprised later.

Priya Nair: Please do. Send it to me directly.`,
      },
    ],
  },
  {
    key: 'northwind',
    company_name: 'Northwind Retail',
    contact_name: 'Daniel Okafor',
    deal_value: 96000,
    stage: 'proposal',
    created_at: '2026-07-27 09:00:00',
    calls: [
      {
        call_date: '2026-08-03',
        transcript: `Jordan Ellis (DealMind AE): Daniel, thanks for taking this. You mentioned on your form that you had a bad experience with pricing from a previous vendor. What happened?

Daniel Okafor (Director of IT, Northwind Retail): We were quoted a low headline price and then got a change order for data migration. Eleven thousand dollars, which was never in the original. Our CFO killed the project over it.

Jordan Ellis: That is exactly the kind of thing I would want to know about. Our contracts are fixed scope, and migration is included in the tier you are in. I will put that in writing rather than in a deck.

Daniel Okafor: I appreciate that. We have 240 stores and about 1,900 users. The real question is whether you can handle our peak. Black Friday is 4x our normal transaction volume.

Jordan Ellis: We run at 11x Black Friday volumes for two other retail customers. I will give you the reference and the load test results.

Daniel Okafor: Do that. Also, I need to know about security. Our insurance renewal comes up in October and our assessor will ask about SOC 2.

Jordan Ellis: We have a current SOC 2 Type II. I will send it under NDA this week.

Daniel Okafor: One more thing. My director, Grace Kim, has to sign off on anything touching identity management. SAML SSO and automated provisioning, that is her gate.

Jordan Ellis: Both supported. I will bring a solutions engineer for that conversation.`,
      },
      {
        call_date: '2026-08-31',
        transcript: `Jordan Ellis (DealMind AE): Daniel, where did we land on the security pack?

Daniel Okafor (Director of IT, Northwind Retail): SOC 2 report went to our assessor and it came back clean. That hurdle is cleared.

Jordan Ellis: Good. What is left?

Daniel Okafor: Grace, as usual. She wants automated user provisioning because we onboard seasonal staff in waves and manual account creation is a fire drill every November.

Jordan Ellis: SCIM provisioning handles that. She can sandbox it with our team.

Daniel Okafor: She is pushing for a competitive quote before sign-off. Anytime now we have a renewal conversation, someone will float a lower number from a competitor and I have to justify why we are not switching.

Jordan Ellis: That is the part I want to talk to you about rather than around. We are not the cheapest and I will not pretend otherwise. At your volume, per user, we are competitive. Where we are not competitive is implementation, and implementation is exactly where your seasonal onboarding risk lives.

Daniel Okafor: If you can commit to a November go-live with a named implementation manager, that is worth something to me. Vendor risk in Q4 is how I lose my job.

Jordan Ellis: I can commit to November 3rd as the go-live and Dana on our side will be your named manager. That date is in the contract.

Daniel Okafor: Then take it to my CFO. Also send the security documentation to Grace directly, she does not like going through me.

Jordan Ellis: Will do.`,
      },
    ],
  },
  {
    key: 'globex',
    company_name: 'Globex Manufacturing',
    contact_name: 'Ingrid Sorensen',
    deal_value: 240000,
    stage: 'qualification',
    created_at: '2026-08-10 09:00:00',
    calls: [
      {
        call_date: '2026-08-17',
        transcript: `Jordan Ellis (DealMind AE): Ingrid, you took the call during plant shutdown week. I will keep us to 25 minutes.

Ingrid Sorensen (CIO, Globex Manufacturing): I will give you 20. We are in the middle of an ERP consolidation, I do not have budget or bandwidth for another platform project.

Jordan Ellis: Understood. Then let me be direct. I am not asking for a decision today, I want to know if this belongs in your 2027 planning cycle or if I should close the file.

Ingrid Sorensen: Put it in 2027. Not because you are not interesting, because I have two other platform bets in front of it.

Jordan Ellis: That is a fair answer. What would have to be true for you to move it up?

Ingrid Sorensen: Two things. First, the plant systems integration. We run Siemens and we need this to talk to the MES layer, not sit next to it. If your integration story is a CSV export, we are done.

Jordan Ellis: We have a documented API and we have done two MES integrations. I will get you the architecture pack.

Ingrid Sorensen: Second, OT security. Anything connected to a plant floor has to go through our security review, and that review adds six to eight weeks. My team does not have the bandwidth this year.

Jordan Ellis: Then we should start the review now so it is not the bottleneck in Q1.

Ingrid Sorensen: That is actually a good idea. Get me your compliance documentation and I will open the review ticket.

Jordan Ellis: SOC 2 Type II, ISO 27001 and our pen test summary, all under NDA, this week.

Ingrid Sorensen: Good. And tell me who else you are working with in manufacturing, I want to know if you have seen OT environments like mine.

Jordan Ellis: Fair. I will be transparent, we are working with two discrete manufacturers in similar situations.

Ingrid Sorensen: Send it all over.`,
      },
      {
        call_date: '2026-09-07',
        transcript: `Jordan Ellis (DealMind AE): Ingrid, did the compliance pack get through your review?

Ingrid Sorensen (CIO, Globex Manufacturing): It did, and the security team has started the ticket. Six weeks, they told me, because of the OT boundary. That is the clock that matters now.

Jordan Ellis: Understood. What is the integration architecture looking like from your side?

Ingrid Sorensen: Our Siemens team wants to see a real message flow, not a diagram. They have been burned by vendors who demoed beautifully and then took eleven months to build. I need a fixed implementation timeline in the contract or I cannot get internal approval.

Jordan Ellis: I can commit to a 90-day integration with a fixed price. If it takes longer that is our problem, not yours.

Ingrid Sorensen: That is a strong position and it is the only way I get this past my plant leadership.

Jordan Ellis: Then let me get the legal pack moving. Your procurement team will want a DPA and a standard MSA.

Ingrid Sorensen: Send both. Legal is the last gate, and their only objection historically has been liability caps, which our counsel pushes hard on.

Jordan Ellis: I will have our counsel pre-negotiate the cap so we are not doing that from scratch. One more thing, are you still evaluating anyone else? I want to be sure I am not assuming.

Ingrid Sorensen: We had a conversation with a competitor in July, a smaller vendor, cheaper on paper. I have not progressed them because their integration capability for OT was weak. I would not be honest with you if I said they were out, but they are behind.

Jordan Ellis: Appreciate the straight answer. I will keep pushing on the 90-day commitment.`,
      },
    ],
  },
]

export const SEED_DEAL_COUNT = SEED_DEALS.length
export const SEED_CALL_COUNT = SEED_DEALS.reduce((sum, deal) => sum + deal.calls.length, 0)
