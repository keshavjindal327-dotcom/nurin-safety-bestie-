import { useEffect, useState, type ReactNode } from 'react';
import { submitEarlyAccess, type EarlyAccessInput } from '@/lib/signups';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowDown, ArrowRight, Check, Menu, Shield, X } from 'lucide-react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { ErrorBoundary } from '@/components/error-boundary';
import { Form } from '@/components/ui/form';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import AdminPage from '@/pages/admin';
import NotFound from '@/pages/not-found';
import { Route, Switch, useLocation, Router as WouterRouter } from 'wouter';

const queryClient = new QueryClient();

// Real contact address, set at build time via VITE_CONTACT_EMAIL.
// When it is not set, no contact line is shown (we never ship a placeholder address).
const contactEmail = (import.meta.env.VITE_CONTACT_EMAIL as string | undefined)?.trim() || '';

const navItems = [
  ['The Concept', '#concept'],
  ['How It Works', '#how-it-works'],
  ['Pricing', '#pricing'],
  ['Our Vision', '#vision'],
  ['FAQ', '#faq'],
];

const earlyAccessFormSchema = z.object({
  firstName: z.string().trim().min(1, 'Please enter your first name.').max(80),
  email: z.string().trim().email('Enter a valid email address.').max(254),
  audience: z.enum(['student', 'professional', 'commuter', 'parent', 'other']),
  purchaseInterest: z.enum(['definitely', 'probably', 'unsure', 'probably_not']),
  priceFeeling: z.enum(['good_value', 'reasonable', 'slightly_high', 'too_high', 'cant_say']),
  priorityFeature: z.enum([
    'sos',
    'emergency_contacts',
    'location_sharing',
    'discreet_design',
    'affordability',
  ]),
  useReason: z.string().max(500).optional(),
  consent: z.boolean().refine((value) => value, 'Please agree before continuing.'),
});

type EarlyAccessFormValues = z.infer<typeof earlyAccessFormSchema>;

const faqItems = [
  {
    question: 'Is Safety Bestie available to purchase?',
    answer: 'Not yet. Safety Bestie is currently in the concept and development stage. No finished physical product is available.',
  },
  {
    question: 'Are the SOS and location-sharing features working?',
    answer: 'No. SOS activation, emergency contact messaging and location-sharing are proposed concepts only. They are not working or validated features.',
  },
  {
    question: 'Does joining the early-access list cost anything?',
    answer: 'No. Joining the early-access list is free. It is an expression of interest, not a purchase or preorder, and no payment details are collected.',
  },
  {
    question: 'Does signing up guarantee access or availability?',
    answer: 'No. Signing up does not guarantee early access, a finished product, or future availability. It helps us understand what people value as the concept develops.',
  },
  {
    question: 'What is the proposed price?',
    answer: 'The proposed price is approximately ₹2,600, subject to feasibility and market validation. No final price has been set.',
  },
  {
    question: 'When will Safety Bestie launch?',
    answer: 'No launch date has been confirmed. Development, feasibility and testing are still ahead.',
  },
];

function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 border-b border-[#292D27]/10 bg-[#FAF9F6]/95 backdrop-blur">
      <div className="section-wrap flex h-[76px] items-center justify-between">
        <a href="#top" className="flex items-center gap-2 no-underline" aria-label="NURIN home" data-testid="link-brand">
          <span className="grid h-[30px] w-[30px] place-items-center rounded-full bg-[#657153] text-[#FAF9F6]">
            <Shield size={15} strokeWidth={1.8} aria-hidden="true" />
          </span>
          <span className="text-[17px] font-bold tracking-[.19em]">NURIN</span>
        </a>
        <nav className="hidden items-center gap-8 md:flex" aria-label="Main navigation">
          {navItems.map(([label, href]) => (
            <a className="nav-link text-[12px] font-medium" href={href} key={label} data-testid={`link-nav-${label.toLowerCase().replaceAll(' ', '-')}`}>{label}</a>
          ))}
          <a className="primary-button min-h-[42px] px-[17px] text-[11px]" href="#early-access" data-testid="link-nav-early-access">
            Join Early Access <ArrowRight size={14} aria-hidden="true" />
          </a>
        </nav>
        <button
          className="grid h-11 w-11 place-items-center border border-[#292D27]/20 bg-transparent md:hidden"
          aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
          aria-expanded={menuOpen}
          aria-controls="mobile-navigation"
          onClick={() => setMenuOpen((open) => !open)}
          data-testid="button-mobile-menu"
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>
      {menuOpen && (
        <nav id="mobile-navigation" className="section-wrap flex flex-col gap-0 pb-4 md:hidden" aria-label="Mobile navigation">
          {navItems.map(([label, href]) => (
            <a key={label} href={href} onClick={() => setMenuOpen(false)} className="nav-link border-t border-[#292D27]/10 py-3 text-sm" data-testid={`link-mobile-${label.toLowerCase().replaceAll(' ', '-')}`}>{label}</a>
          ))}
          <a href="#early-access" onClick={() => setMenuOpen(false)} className="primary-button mt-2" data-testid="link-mobile-early-access">Join Early Access <ArrowRight size={15} /></a>
        </nav>
      )}
    </header>
  );
}

function EarlyAccessForm() {
  const [pending, setPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formError, setFormError] = useState('');
  const form = useForm<EarlyAccessFormValues>({
    resolver: zodResolver(earlyAccessFormSchema),
    defaultValues: {
      firstName: '',
      email: '',
      audience: undefined,
      purchaseInterest: undefined,
      priceFeeling: undefined,
      priorityFeature: undefined,
      useReason: '',
      consent: false,
    },
  });

  async function handleSubmit(values: EarlyAccessFormValues) {
    setFormError('');
    const payload: EarlyAccessInput = {
      firstName: values.firstName,
      email: values.email,
      audience: values.audience,
      purchaseInterest: values.purchaseInterest,
      priceFeeling: values.priceFeeling,
      priorityFeature: values.priorityFeature,
      useReason: values.useReason?.trim() || undefined,
      consent: true,
    };
    setPending(true);
    try {
      await submitEarlyAccess(payload);
      setSubmitted(true);
    } catch {
      setFormError('We couldn’t submit your interest just now. Please try again.');
    } finally {
      setPending(false);
    }
  }

  if (submitted) {
    return (
      <div className="rounded-[3px] border border-[#657153]/25 bg-[#FAF9F6] px-7 py-10 sm:px-10" role="status" data-testid="status-early-access-success">
        <span className="mb-6 grid h-12 w-12 place-items-center rounded-full bg-[#E7EBDD] text-[#4F5C40]"><Check size={23} aria-hidden="true" /></span>
        <p className="eyebrow mb-3 text-[#657153]">Early access interest</p>
        <h3 className="serif mb-4 text-3xl sm:text-4xl">You're on the list.</h3>
        <p className="max-w-[510px] text-sm leading-7 text-[#62645C]">Thank you for helping shape Safety Bestie. We're still developing the concept, and your feedback helps us understand what future customers value most. We'll share updates as development progresses.</p>
        <a href="#top" className="secondary-button mt-7" data-testid="link-success-back">Back to the page <ArrowRight size={15} /></a>
      </div>
    );
  }

  return (
      <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6" noValidate data-testid="form-early-access">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="firstName">First name <span aria-hidden="true">*</span></label>
           <input className="form-field" id="firstName" type="text" autoComplete="given-name" maxLength={80} required placeholder="Your first name" aria-invalid={Boolean(form.formState.errors.firstName)} aria-describedby="error-first-name" {...form.register('firstName')} data-testid="input-first-name" />
           {form.formState.errors.firstName && <p id="error-first-name" role="alert" className="mt-1 text-xs text-[#8B3C35]" data-testid="error-first-name">{form.formState.errors.firstName.message}</p>}
        </div>
        <div>
          <label className="field-label" htmlFor="email">Email address <span aria-hidden="true">*</span></label>
           <input className="form-field" id="email" type="email" autoComplete="email" maxLength={254} required placeholder="you@example.com" aria-invalid={Boolean(form.formState.errors.email)} aria-describedby="error-email" {...form.register('email')} data-testid="input-email" />
           {form.formState.errors.email && <p id="error-email" role="alert" className="mt-1 text-xs text-[#8B3C35]" data-testid="error-email">{form.formState.errors.email.message}</p>}
        </div>
      </div>
      <div>
        <label className="field-label" htmlFor="audience">Which best describes you? <span aria-hidden="true">*</span></label>
         <select className="form-field" id="audience" defaultValue="" required aria-invalid={Boolean(form.formState.errors.audience)} aria-describedby="error-audience" {...form.register('audience')} data-testid="select-audience">
          <option value="" disabled>Select one</option>
          <option value="student">Student</option>
          <option value="professional">Working professional</option>
          <option value="commuter">Daily commuter</option>
          <option value="parent">Parent or guardian</option>
          <option value="other">Other</option>
        </select>
         {form.formState.errors.audience && <p id="error-audience" role="alert" className="mt-1 text-xs text-[#8B3C35]" data-testid="error-audience">Please choose the option that best describes you.</p>}
      </div>
      <fieldset>
               <legend className="field-label">Would you consider purchasing Safety Bestie at a proposed price of ₹2,600? <span aria-hidden="true">*</span></legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            ['definitely', 'Definitely interested'],
            ['probably', 'Probably interested'],
            ['unsure', 'Not sure yet'],
            ['probably_not', 'Probably not'],
          ].map(([value, label]) => (
            <label className="choice-card" key={value}>
               <input type="radio" value={value} required aria-invalid={Boolean(form.formState.errors.purchaseInterest)} aria-describedby="error-purchase-interest" {...form.register('purchaseInterest')} data-testid={`radio-interest-${value}`} />
              <span>{label}</span>
            </label>
          ))}
        </div>
         {form.formState.errors.purchaseInterest && <p id="error-purchase-interest" role="alert" className="mt-2 text-xs text-[#8B3C35]" data-testid="error-purchase-interest">Please choose one option.</p>}
      </fieldset>
      <fieldset>
        <legend className="field-label">How does a proposed price of around ₹2,600 feel to you? <span aria-hidden="true">*</span></legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            ['good_value', 'Good value'],
            ['reasonable', 'Reasonable'],
            ['slightly_high', 'A little high'],
            ['too_high', 'Too high'],
            ['cant_say', 'Hard to say yet'],
          ].map(([value, label]) => (
            <label className="choice-card" key={value}>
              <input type="radio" value={value} required aria-invalid={Boolean(form.formState.errors.priceFeeling)} aria-describedby="error-price-feeling" {...form.register('priceFeeling')} data-testid={`radio-price-${value}`} />
              <span>{label}</span>
            </label>
          ))}
        </div>
        {form.formState.errors.priceFeeling && <p id="error-price-feeling" role="alert" className="mt-2 text-xs text-[#8B3C35]" data-testid="error-price-feeling">Please choose one option.</p>}
      </fieldset>
      <fieldset>
        <legend className="field-label">Which proposed feature matters most to you? <span aria-hidden="true">*</span></legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {[
            ['sos', 'One-press SOS alert'],
            ['emergency_contacts', 'Emergency contact messaging'],
            ['location_sharing', 'Smartphone-assisted location sharing'],
            ['discreet_design', 'Compact, discreet design'],
            ['affordability', 'Overall affordability'],
          ].map(([value, label]) => (
            <label className="choice-card" key={value}>
               <input type="radio" value={value} required aria-invalid={Boolean(form.formState.errors.priorityFeature)} aria-describedby="error-priority-feature" {...form.register('priorityFeature')} data-testid={`radio-feature-${value}`} />
              <span>{label}</span>
            </label>
          ))}
        </div>
         {form.formState.errors.priorityFeature && <p id="error-priority-feature" role="alert" className="mt-2 text-xs text-[#8B3C35]" data-testid="error-priority-feature">Please choose one feature.</p>}
      </fieldset>
      <div>
        <label className="field-label" htmlFor="useReason">What would make you trust a product like this? <span className="font-normal text-[#77796F]">(optional)</span></label>
         <textarea className="form-field min-h-[98px] resize-y" id="useReason" maxLength={500} placeholder="For example: testing, certifications, how it works, who makes it…" aria-invalid={Boolean(form.formState.errors.useReason)} aria-describedby="error-use-reason" {...form.register('useReason')} data-testid="textarea-use-reason" />
         {form.formState.errors.useReason && <p id="error-use-reason" role="alert" className="mt-1 text-xs text-[#8B3C35]" data-testid="error-use-reason">{form.formState.errors.useReason.message}</p>}
      </div>
      <label className="flex cursor-pointer items-start gap-3 text-[12px] leading-5 text-[#55574F]">
         <input className="mt-[3px] h-4 w-4 shrink-0 accent-[#657153]" type="checkbox" required aria-invalid={Boolean(form.formState.errors.consent)} aria-describedby="error-consent" {...form.register('consent')} data-testid="checkbox-consent" />
        <span>I agree to be contacted by NURIN about Safety Bestie development updates and early access. I understand this is not a purchase or preorder. <span aria-hidden="true">*</span></span>
      </label>
      {form.formState.errors.consent && <p id="error-consent" role="alert" className="text-xs text-[#8B3C35]" data-testid="error-consent">{form.formState.errors.consent.message}</p>}
      {formError && <p role="alert" className="border-l-2 border-[#9A443D] bg-[#F7EDEA] px-4 py-3 text-sm text-[#70332D]" data-testid="status-early-access-error">{formError}</p>}
      {pending && <p role="status" className="text-sm text-[#657153]" data-testid="status-early-access-loading">Sending your interest…</p>}
      <button className="primary-button w-full sm:w-auto" type="submit" disabled={pending} data-testid="button-submit-early-access">
         {pending ? 'Sending…' : 'Register My Interest'} <ArrowRight size={16} aria-hidden="true" />
      </button>
      <p className="text-[11px] leading-5 text-[#77796F]" data-testid="text-form-commitment">Free to join. No payment required. No purchase commitment.</p>
      <p className="border-t border-[#292D27]/10 pt-4 text-[11px] leading-5 text-[#77796F]" data-testid="text-privacy-note">Your information is used to understand interest and send relevant development updates. It is never sold or publicly displayed.</p>
    </form>
      </Form>
  );
}

function Home() {
  useEffect(() => {
    document.title = 'NURIN — Safety Bestie | Safety that stays close';
    const description = 'Meet Safety Bestie, a thoughtfully designed personal safety keychain concept. Help shape what comes next.';
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', description);
    const tags = [
      ['og:title', 'NURIN — Safety Bestie | Safety that stays close'],
      ['og:description', description],
      ['og:type', 'website'],
    ];
    tags.forEach(([property, content]) => {
      let element = document.querySelector(`meta[property="${property}"]`);
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute('property', property);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    });
  }, []);

  return (
    <div id="top" className="min-h-[100dvh] overflow-hidden bg-[#FAF9F6]">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:bg-[#FAF9F6] focus:p-3">Skip to content</a>
      <Header />
      <main id="main-content">
        <section className="section-wrap grid min-h-[calc(100vh-76px)] items-center gap-10 py-14 md:grid-cols-[1.05fr_.95fr] md:gap-8 md:py-20" aria-labelledby="hero-title">
          <div className="reveal order-1 max-w-[590px] md:order-1">
            <p className="eyebrow mb-6 flex items-center gap-3 text-[#657153]"><span className="h-px w-8 bg-[#657153]" />INTRODUCING NURIN</p>
            <h1 id="hero-title" className="serif text-[clamp(3.3rem,7.4vw,6.7rem)] leading-[.98] tracking-[-.055em]">
              Safety that<br />stays close.
            </h1>
            <p className="serif mt-5 text-[clamp(1.5rem,3vw,2.4rem)] leading-tight text-[#657153]">Meet Safety Bestie.</p>
            <p className="mt-6 max-w-[475px] text-[15px] leading-7 text-[#62645C]">A thoughtfully designed personal safety keychain concept, created to make everyday safety feel more accessible, discreet, and convenient.</p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <a href="#early-access" className="primary-button" data-testid="link-hero-early-access">Join the Early Access List <ArrowRight size={16} /></a>
              <a href="#concept" className="secondary-button" data-testid="link-discover-concept">Discover Safety Bestie <ArrowDown size={15} /></a>
            </div>
            <p className="mt-6 text-[11px] tracking-[.04em] text-[#77796F]" data-testid="text-development-status">Currently in development · Help shape what comes next</p>
          </div>
          <div className="reveal delay-2 order-2 md:order-2">
            <div className="art-stage" role="img" aria-label="Abstract, CSS illustration of a sage-green keychain concept">
              <span className="orbit-label one">CLOSE AT HAND</span>
              <span className="orbit-label two">THOUGHTFUL FORM</span>
              <span className="orbit-label three">EVERYDAY CARRY</span>
              <div className="keyring" aria-hidden="true"><div className="key-button" /></div>
              <p className="art-caption eyebrow">Safety Bestie · Concept 01</p>
            </div>
          </div>
        </section>

        <section id="concept" className="bg-[#F0EDE5] py-20 md:py-28">
          <div className="section-wrap">
            <div className="grid gap-10 md:grid-cols-[.8fr_1.2fr] md:gap-20">
              <div>
                <p className="eyebrow mb-5 text-[#657153]">01 / The problem</p>
                <h2 className="serif max-w-[420px] text-4xl leading-[1.12] tracking-[-.035em] md:text-[52px]">In an emergency, reaching for help isn’t always simple.</h2>
              </div>
              <div className="pt-1">
                <p className="max-w-[650px] text-[16px] leading-8 text-[#55574F]">When you feel unsafe, every second counts — yet unlocking a phone, finding a contact, and sending a location can feel slow, awkward, or impossible under stress. Many people also carry their phone in a bag or pocket where it isn’t within easy reach.</p>
                <div className="mt-8 border-l-2 border-[#657153] pl-6" data-testid="block-solution">
                  <p className="eyebrow mb-3 text-[#657153]">The proposed solution</p>
                  <p className="max-w-[620px] text-[15px] leading-7 text-[#55574F]">Safety Bestie is a keychain-sized concept built around one simple idea: a single physical press to start an alert. It is a proposed product, still being researched and developed — not yet a working device.</p>
                </div>
              </div>
            </div>
            <div className="mt-16 grid gap-8 border-t border-[#292D27]/15 pt-8 md:grid-cols-3 md:gap-12">
              {[
                ['01', 'Designed for everyday carry'],
                ['02', 'A concept built around quick access'],
                ['03', 'Personal safety meets thoughtful design'],
              ].map(([num, title]) => (
                <div className="feature-card" key={num} data-testid={`feature-benefit-${num}`}>
                  <span className="feature-num">{num}</span>
                  <h3 className="serif mt-4 max-w-[250px] text-[23px] leading-snug">{title}</h3>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section-wrap py-20 md:py-28" aria-labelledby="features-title">
          <div className="grid gap-12 md:grid-cols-[.8fr_1.2fr] md:gap-20">
            <div>
              <p className="eyebrow mb-5 text-[#657153]">A considered starting point</p>
               <h2 id="features-title" className="serif text-4xl leading-[1.12] tracking-[-.035em] md:text-[52px]">Meet your everyday companion.</h2>
               <p className="mt-5 max-w-[380px] text-sm leading-7 text-[#77796F]">Safety Bestie is envisioned as a compact, discreet keychain-style personal safety accessory.</p>
              <div className="mt-7 border-l-2 border-[#657153] bg-[#F0EDE5] px-5 py-4 text-[12px] font-medium leading-6 text-[#4F5C40]" role="note" data-testid="note-feature-disclosure">
                 These are proposed features under development. Safety Bestie is not yet a working product, and functionality, connectivity, and performance have not been validated.
              </div>
            </div>
            <div className="grid gap-x-10 sm:grid-cols-2">
              {[
                 ['01', 'One-Press SOS Alert', 'An envisioned physical button designed to initiate an emergency alert with a simple press.'],
                 ['02', 'Emergency Contact Messaging', 'The proposed system aims to notify selected emergency contacts through an SOS message.'],
                 ['03', 'Smartphone-assisted Location Sharing', 'Future integration with a companion app or website could support location sharing through a paired smartphone.'],
              ].map(([num, title, text]) => (
                <article className="feature-card mb-9" key={num} data-testid={`card-concept-${num}`}>
                  <span className="feature-num">CONCEPT {num}</span>
                  <h3 className="serif mt-4 text-2xl">{title}</h3>
                  <p className="mt-3 text-[13px] leading-6 text-[#77796F]">{text}</p>
                </article>
              ))}
              <div className="self-start border-t border-[#292D27]/20 pt-5 text-[12px] leading-6 text-[#77796F]">
                These ideas are a starting point for research—not a representation of finished functionality.
              </div>
            </div>
          </div>
        </section>

        <section id="how-it-works" className="bg-[#E8E9DF] py-20 md:py-28">
          <div className="section-wrap">
            <div className="flex flex-col justify-between gap-5 md:flex-row md:items-end">
              <div>
                <p className="eyebrow mb-5 text-[#657153]">02 / An illustrative concept</p>
               <h2 className="serif text-4xl leading-tight tracking-[-.035em] md:text-[52px]">Simple by design.</h2>
              </div>
              <p className="max-w-[330px] pb-1 text-sm leading-6 text-[#62645C]">A visual outline of the intended experience. Nothing here is currently functional.</p>
            </div>
            <div className="mt-14 grid gap-9 md:grid-cols-3 md:gap-12">
              {[
                 ['01', 'Carry', 'Keep the compact keychain with your everyday essentials.'],
                 ['02', 'Activate', 'In the proposed design, press the button to initiate an SOS alert.'],
                 ['03', 'Connect', 'The intended system would notify selected contacts, with location sharing dependent on the final technical design.'],
              ].map(([number, title, text]) => (
                <article className="step-card" key={number} data-testid={`step-${title.toLowerCase()}`}>
                  <span className="step-number">{number}</span>
                  <h3 className="serif mt-5 text-[30px]">{title}</h3>
                  <p className="mt-3 max-w-[300px] text-[13px] leading-6 text-[#62645C]">{text}</p>
                </article>
              ))}
            </div>
            <p className="mt-12 border-t border-[#292D27]/15 pt-5 text-[11px] leading-5 text-[#62645C]" data-testid="text-concept-disclaimer">Illustrative concept — final functionality is subject to development and testing.</p>
          </div>
        </section>

        <section className="section-wrap grid gap-12 py-20 md:grid-cols-[.85fr_1.15fr] md:gap-24 md:py-28">
          <div>
            <p className="eyebrow mb-5 text-[#657153]">03 / Design philosophy</p>
             <h2 className="serif text-4xl leading-[1.12] tracking-[-.035em] md:text-[52px]">Thoughtful in every detail.</h2>
          </div>
          <div>
             <p className="text-[15px] leading-8 text-[#62645C]">We believe personal safety products should feel natural to carry, easy to understand, and thoughtfully designed for everyday life.</p>
             <p className="mt-5 text-[15px] leading-8 text-[#62645C]">Safety Bestie is envisioned with a compact form, understated styling, and a calming visual identity that blends into daily essentials.</p>
            <div className="mt-9 flex flex-wrap items-center gap-x-7 gap-y-4 border-t border-[#292D27]/15 pt-6">
              {[
                ['#A3B18A', 'Sage Green'],
                ['#FAF9F6', 'Warm White'],
                ['#D8C3A5', 'Light oak'],
              ].map(([color, name]) => (
                <div key={name} className="flex items-center gap-2.5" data-testid={`swatch-${name.toLowerCase().replace(' ', '-')}`}>
                  <span className="h-7 w-7 rounded-full border border-[#292D27]/15" style={{ backgroundColor: color }} />
                  <span className="text-[11px] text-[#62645C]">{name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="pricing" className="bg-[#F0EDE5] py-20 md:py-28" aria-labelledby="pricing-title">
          <div className="section-wrap">
            <div className="grid gap-12 md:grid-cols-[.85fr_1.15fr] md:gap-20">
              <div>
                <p className="eyebrow mb-5 text-[#657153]">Proposed price</p>
                <h2 id="pricing-title" className="serif text-4xl leading-[1.12] tracking-[-.035em] md:text-[52px]">A price we want to get right.</h2>
                <div className="mt-8 border border-[#657153]/30 bg-[#FAF9F6] px-7 py-7" data-testid="card-proposed-price">
                  <p className="eyebrow text-[#657153]">Proposed price</p>
                  <p className="serif mt-2 text-[56px] leading-none tracking-[-.04em]">≈ ₹2,600</p>
                  <p className="mt-4 text-[12px] leading-6 text-[#62645C]">A target for research only. It is not a final price, and nothing is for sale — joining the list is free and takes no payment.</p>
                </div>
                <p className="mt-5 max-w-[360px] text-[13px] leading-6 text-[#77796F]">Does this feel right? Tell us in the form below — your answer directly shapes the price we aim for.</p>
              </div>
              <div>
                <p className="eyebrow mb-6 text-[#657153]">Who it’s being considered for</p>
                <div className="grid gap-x-8 gap-y-7 sm:grid-cols-2">
                  {[
                    ['01', 'Women', 'For anyone who wants a quicker, more discreet way to ask for help when travelling or out alone.'],
                    ['02', 'Students', 'For campus life, late classes, hostels, and the journeys in between.'],
                    ['03', 'Commuters', 'For people who spend time on buses, metros, autos, and walking to and from stops.'],
                    ['04', 'Parents', 'For parents exploring added peace of mind for the people they care about.'],
                  ].map(([num, title, text]) => (
                    <article className="border-t border-[#292D27]/20 pt-5" key={num} data-testid={`audience-${title.toLowerCase()}`}>
                      <span className="feature-num">{num}</span>
                      <h3 className="serif mt-3 text-[25px]">{title}</h3>
                      <p className="mt-2 text-[13px] leading-6 text-[#62645C]">{text}</p>
                    </article>
                  ))}
                </div>
              </div>
            </div>
            <p className="mt-10 text-[11px] leading-5 text-[#77796F]">Safety Bestie is a concept and cannot guarantee safety, response, or protection for any person.</p>
          </div>
        </section>

        <section id="early-access" className="bg-[#A3B18A] py-20 md:py-28" aria-labelledby="early-access-title">
          <div className="section-wrap grid gap-12 md:grid-cols-[.82fr_1.18fr] md:gap-20">
            <div className="md:sticky md:top-28 md:self-start">
              <p className="eyebrow mb-5 text-[#414A37]">Help shape what comes next</p>
               <h2 id="early-access-title" className="serif max-w-[460px] text-4xl leading-[1.08] tracking-[-.04em] text-[#292D27] md:text-[54px]">Help shape the future of Safety Bestie.</h2>
               <p className="mt-6 max-w-[390px] text-sm leading-7 text-[#3F4737]">We're developing the concept and want to hear from the people it is designed for. Join our early-access list, share your preferences, and help us understand what matters most before we move toward manufacturing.</p>
              <div className="mt-9 flex items-center gap-3 border-t border-[#292D27]/20 pt-5 text-[11px] leading-5 text-[#3F4737]">
                <Shield size={17} strokeWidth={1.5} aria-hidden="true" />
                <span>Your details stay private and are never displayed publicly.</span>
              </div>
            </div>
            <div className="rounded-[3px] bg-[#FAF9F6] p-6 shadow-[0_16px_50px_rgba(41,45,39,.08)] sm:p-9">
              <EarlyAccessForm />
            </div>
          </div>
        </section>

        <section id="faq" className="section-wrap grid gap-10 py-20 md:grid-cols-[.7fr_1.3fr] md:gap-20 md:py-28">
          <div>
            <p className="eyebrow mb-5 text-[#657153]">A few clear answers</p>
            <h2 className="serif text-4xl leading-tight tracking-[-.035em] md:text-[52px]">Good to know.</h2>
            <p className="mt-5 max-w-[290px] text-sm leading-6 text-[#77796F]">We’re early in the process. Here’s what we can—and can’t—say today.</p>
          </div>
          <div>
            {faqItems.map((item, index) => (
              <details className="faq-item" key={item.question} data-testid={`faq-item-${index + 1}`}>
                <summary data-testid={`button-faq-${index + 1}`}>{item.question}</summary>
                <p>{item.answer}</p>
              </details>
            ))}
          </div>
        </section>

        <section id="vision" className="relative overflow-hidden bg-[#657153] py-20 text-[#FAF9F6] md:py-28">
          <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-36 h-[420px] w-[420px] rounded-full border border-[#FAF9F6]/15" />
          <div aria-hidden="true" className="pointer-events-none absolute -right-8 -top-20 h-[290px] w-[290px] rounded-full border border-[#FAF9F6]/15" />
          <div className="section-wrap relative">
            <p className="eyebrow mb-6 text-[#E2E7D8]">Our vision</p>
             <h2 className="serif max-w-[760px] text-[clamp(3rem,7vw,6rem)] leading-[1.03] tracking-[-.04em]">A future where safety feels like a companion.</h2>
            <div className="mt-10 flex flex-col justify-between gap-8 border-t border-[#FAF9F6]/25 pt-7 sm:flex-row sm:items-end">
               <p className="max-w-[470px] text-sm leading-7 text-[#E4E7DE]">Our vision is to make personal safety feel less like a burden and more like an everyday companion. Safety Bestie is the beginning of an idea: combining thoughtful design, accessible technology, and everyday usability to explore a new approach to personal safety.</p>
              <p className="serif text-2xl sm:text-right">Stay Safe. Stay Strong.</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[#292D27] py-12 text-[#FAF9F6]">
        <div className="section-wrap">
          <div className="grid gap-10 border-b border-[#FAF9F6]/20 pb-10 md:grid-cols-[1fr_auto]">
            <div>
              <a href="#top" className="inline-flex items-center gap-2 text-[16px] font-bold tracking-[.19em] no-underline" data-testid="link-footer-brand">
                <span className="grid h-[28px] w-[28px] place-items-center rounded-full bg-[#A3B18A] text-[#292D27]"><Shield size={14} /></span>NURIN
              </a>
              <p className="mt-4 max-w-[380px] text-[12px] leading-6 text-[#C6C8C0]">Safety Bestie — Your Personal Safety Companion.</p>
              {contactEmail && (
                <p className="mt-4 text-[12px] text-[#C6C8C0]">Contact: <a className="underline decoration-[#A3B18A] underline-offset-4" href={`mailto:${contactEmail}`} data-testid="link-contact-email">{contactEmail}</a></p>
              )}
            </div>
            <nav className="flex flex-wrap gap-x-6 gap-y-3 text-[12px]" aria-label="Footer navigation">
              {navItems.map(([label, href]) => <a href={href} key={label} className="nav-link text-[#E2E4DE]" data-testid={`link-footer-${label.toLowerCase().replaceAll(' ', '-')}`}>{label}</a>)}
              <a href="#privacy" className="nav-link text-[#E2E4DE]" data-testid="link-privacy">Privacy Policy</a>
              <a href="#terms" className="nav-link text-[#E2E4DE]" data-testid="link-terms">Terms of Use</a>
            </nav>
          </div>
          <div className="grid gap-7 border-b border-[#FAF9F6]/20 py-8 md:grid-cols-2 md:gap-12">
            <section id="privacy" aria-labelledby="privacy-title">
              <h2 id="privacy-title" className="eyebrow text-[#A3B18A]">Privacy Policy</h2>
              <p className="mt-3 text-[11px] leading-5 text-[#C6C8C0]">If you join the list, NURIN collects the name, email address, audience, product and price preferences, optional feedback, and consent you submit. We use this information to understand interest in the concept and send relevant product-development updates. We do not sell or publicly display personal information. We retain submissions only while they are useful for these purposes or as needed to honor your preferences. {contactEmail ? `You can ask us to stop contacting you or remove your information by emailing ${contactEmail}.` : 'Every update we send will include a way to opt out, and you can ask us to remove your information at any time.'} Please do not include sensitive personal information in the optional response.</p>
            </section>
            <section id="terms" aria-labelledby="terms-title">
              <h2 id="terms-title" className="eyebrow text-[#A3B18A]">Terms of Use</h2>
              <p className="mt-3 text-[11px] leading-5 text-[#C6C8C0]">This website describes a proposed product concept for informational and market-research purposes. Joining the interest list is free and is not a purchase, preorder, reservation, or guarantee of access, availability, functionality, or a future product. Proposed features, price and design may change or may not proceed. Safety Bestie is not currently available and is not a substitute for emergency services. Do not rely on this concept for emergency response or personal protection.</p>
            </section>
          </div>
          <div className="flex flex-col gap-4 pt-7 md:flex-row md:items-end md:justify-between">
            <p className="max-w-[780px] text-[10px] leading-5 text-[#C6C8C0]" data-testid="text-footer-disclaimer">Safety Bestie is a proposed product under development. It is not currently available for purchase, and its proposed features have not been validated. It is not a substitute for emergency services.</p>
            <p className="shrink-0 text-[10px] text-[#AEB1A7]" data-testid="text-copyright">© {new Date().getFullYear()} NURIN. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function Router() {
  return (
    <RoutedErrorBoundary>
      <Switch>
        <Route path="/" component={Home} />
        <Route path="/admin" component={AdminPage} />
        <Route component={NotFound} />
      </Switch>
    </RoutedErrorBoundary>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
