'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  ArrowRight,
  ArrowLeft,
  CalendarDays,
  Globe,
} from 'lucide-react';
import { defaultPageContent } from '@/lib/pageContent';
import PageSEO from '@/components/layout/PageSEO';

/* ------------------------------------------------------------------ */
/*  Data — fetched from admin services                                 */
/* ------------------------------------------------------------------ */

interface PricingFeature { text: string; included: boolean }
interface PricingTier { name: string; price: string; features: PricingFeature[]; highlighted?: boolean }

interface BookingService {
  id: string;
  label: string;
  packages: Record<string, string>;
  tiers: PricingTier[];
}

const defaultServices: BookingService[] = [];

// Convert BDT 24h slot ("18:00") to display time in a given IANA timezone
function bdtToDisplay(bdt24: string, bookingDate: Date, tz: string): string {
  const [h, m] = bdt24.split(':').map(Number);
  // BDT = UTC+6 → subtract 6h to get UTC
  const utcDate = new Date(Date.UTC(
    bookingDate.getFullYear(), bookingDate.getMonth(), bookingDate.getDate(),
    h - 6, m
  ));
  return utcDate.toLocaleTimeString('en-US', {
    timeZone: tz,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// Timezone list (Calendly-style curated list)
const TIMEZONES = [
  { value: 'Pacific/Honolulu',              label: '(UTC-10:00) Hawaii' },
  { value: 'America/Anchorage',             label: '(UTC-09:00) Alaska' },
  { value: 'America/Los_Angeles',           label: '(UTC-08:00) Pacific Time – US & Canada' },
  { value: 'America/Denver',                label: '(UTC-07:00) Mountain Time – US & Canada' },
  { value: 'America/Phoenix',               label: '(UTC-07:00) Arizona' },
  { value: 'America/Chicago',               label: '(UTC-06:00) Central Time – US & Canada' },
  { value: 'America/Mexico_City',           label: '(UTC-06:00) Mexico City' },
  { value: 'America/New_York',              label: '(UTC-05:00) Eastern Time – US & Canada' },
  { value: 'America/Toronto',               label: '(UTC-05:00) Toronto' },
  { value: 'America/Bogota',                label: '(UTC-05:00) Bogota' },
  { value: 'America/Halifax',               label: '(UTC-04:00) Atlantic Time – Canada' },
  { value: 'America/Sao_Paulo',             label: '(UTC-03:00) Brasilia' },
  { value: 'America/Argentina/Buenos_Aires',label: '(UTC-03:00) Buenos Aires' },
  { value: 'Atlantic/Azores',               label: '(UTC-01:00) Azores' },
  { value: 'Europe/London',                 label: '(UTC+00:00) London' },
  { value: 'Europe/Lisbon',                 label: '(UTC+00:00) Lisbon' },
  { value: 'Africa/Casablanca',             label: '(UTC+00:00) Casablanca' },
  { value: 'Europe/Paris',                  label: '(UTC+01:00) Paris' },
  { value: 'Europe/Berlin',                 label: '(UTC+01:00) Berlin' },
  { value: 'Europe/Rome',                   label: '(UTC+01:00) Rome' },
  { value: 'Europe/Amsterdam',              label: '(UTC+01:00) Amsterdam' },
  { value: 'Africa/Lagos',                  label: '(UTC+01:00) Lagos' },
  { value: 'Europe/Helsinki',               label: '(UTC+02:00) Helsinki' },
  { value: 'Europe/Athens',                 label: '(UTC+02:00) Athens' },
  { value: 'Africa/Cairo',                  label: '(UTC+02:00) Cairo' },
  { value: 'Africa/Johannesburg',           label: '(UTC+02:00) Johannesburg' },
  { value: 'Europe/Moscow',                 label: '(UTC+03:00) Moscow' },
  { value: 'Asia/Kuwait',                   label: '(UTC+03:00) Kuwait' },
  { value: 'Asia/Riyadh',                   label: '(UTC+03:00) Riyadh' },
  { value: 'Africa/Nairobi',                label: '(UTC+03:00) Nairobi' },
  { value: 'Asia/Tehran',                   label: '(UTC+03:30) Tehran' },
  { value: 'Asia/Dubai',                    label: '(UTC+04:00) Abu Dhabi, Dubai' },
  { value: 'Asia/Baku',                     label: '(UTC+04:00) Baku' },
  { value: 'Asia/Kabul',                    label: '(UTC+04:30) Kabul' },
  { value: 'Asia/Karachi',                  label: '(UTC+05:00) Karachi' },
  { value: 'Asia/Kolkata',                  label: '(UTC+05:30) Mumbai, New Delhi' },
  { value: 'Asia/Colombo',                  label: '(UTC+05:30) Sri Lanka' },
  { value: 'Asia/Kathmandu',                label: '(UTC+05:45) Kathmandu' },
  { value: 'Asia/Almaty',                   label: '(UTC+06:00) Almaty' },
  { value: 'Asia/Dhaka',                    label: '(UTC+06:00) Dhaka' },
  { value: 'Asia/Rangoon',                  label: '(UTC+06:30) Yangon (Rangoon)' },
  { value: 'Asia/Bangkok',                  label: '(UTC+07:00) Bangkok' },
  { value: 'Asia/Jakarta',                  label: '(UTC+07:00) Jakarta' },
  { value: 'Asia/Singapore',                label: '(UTC+08:00) Singapore' },
  { value: 'Asia/Shanghai',                 label: '(UTC+08:00) Beijing, Shanghai' },
  { value: 'Asia/Kuala_Lumpur',             label: '(UTC+08:00) Kuala Lumpur' },
  { value: 'Asia/Manila',                   label: '(UTC+08:00) Manila' },
  { value: 'Australia/Perth',               label: '(UTC+08:00) Perth' },
  { value: 'Asia/Tokyo',                    label: '(UTC+09:00) Tokyo' },
  { value: 'Asia/Seoul',                    label: '(UTC+09:00) Seoul' },
  { value: 'Australia/Adelaide',            label: '(UTC+09:30) Adelaide' },
  { value: 'Australia/Darwin',              label: '(UTC+09:30) Darwin' },
  { value: 'Australia/Sydney',              label: '(UTC+10:00) Sydney, Melbourne' },
  { value: 'Australia/Brisbane',            label: '(UTC+10:00) Brisbane' },
  { value: 'Pacific/Auckland',              label: '(UTC+12:00) Auckland, Wellington' },
  { value: 'Pacific/Fiji',                  label: '(UTC+12:00) Fiji' },
];

const STEPS = ['Select Service', 'Choose Date & Time', 'Your Details', 'Confirm'] as const;
const DAYS   = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

function getDaysInMonth(year: number, month: number)  { return new Date(year, month + 1, 0).getDate(); }
function getFirstDayOfMonth(year: number, month: number) { return new Date(year, month, 1).getDay(); }
function isWeekend(year: number, month: number, day: number) {
  const d = new Date(year, month, day).getDay();
  return d === 0 || d === 6;
}
function isPast(year: number, month: number, day: number) {
  const today = new Date(); today.setHours(0, 0, 0, 0);
  return new Date(year, month, day) < today;
}
function isToday(year: number, month: number, day: number) {
  const today = new Date();
  return today.getFullYear() === year && today.getMonth() === month && today.getDate() === day;
}

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function BookingPage() {
  const searchParams = useSearchParams();
  const [services, setServices]         = useState<BookingService[]>(defaultServices);
  const [pageContent, setPageContent]   = useState(defaultPageContent.book);
  const [timezone, setTimezone]         = useState('Asia/Dhaka'); // updated on mount

  useEffect(() => {
    fetch('/api/data/page_content_book', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setPageContent({ ...defaultPageContent.book, ...data }) })
      .catch(() => {});
    // Auto-detect browser timezone
    try {
      const detected = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (detected) setTimezone(detected);
    } catch {}
  }, []);

  const [step, setStep]                 = useState(0);
  const [selectedService, setSelectedService] = useState('');
  const [selectedPackage, setSelectedPackage] = useState('');
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedTime, setSelectedTime] = useState(''); // BDT 24h, e.g. "19:00"
  const [details, setDetails]           = useState({ name: '', email: '', phone: '', message: '' });
  const [submitting, setSubmitting]     = useState(false);
  const [submitted, setSubmitted]       = useState(false);
  const [direction, setDirection]       = useState(1);
  const [servicesLoaded, setServicesLoaded] = useState(false);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]); // BDT 24h strings
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [detailTier, setDetailTier]     = useState<PricingTier | null>(null);

  // Displayed time for the selected slot in the active timezone
  const selectedTimeDisplay = selectedTime && selectedDate
    ? bdtToDisplay(selectedTime, selectedDate, timezone)
    : '—';

  // Fetch available time slots (returns BDT 24h strings from API)
  const fetchSlots = (date: Date, isInitial: boolean) => {
    if (isInitial) { setLoadingSlots(true); setSelectedTime(''); }
    const y  = date.getFullYear();
    const mo = (date.getMonth() + 1).toString().padStart(2, '0');
    const da = date.getDate().toString().padStart(2, '0');
    fetch(`/api/bookings/availability?date=${y}-${mo}-${da}&duration=30&t=${Date.now()}`, { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data?.available_slots) {
          let slots = data.available_slots as string[]; // BDT 24h
          // Filter out past BDT slots for today
          const todayLocal = isToday(date.getFullYear(), date.getMonth(), date.getDate());
          if (todayLocal) {
            const now = new Date();
            const nowBdtMinutes = ((now.getUTCHours() + 6) % 24) * 60 + now.getUTCMinutes();
            slots = slots.filter(s => {
              const [h, m] = s.split(':').map(Number);
              return h * 60 + m > nowBdtMinutes;
            });
          }
          setAvailableSlots(slots);
          if (selectedTime && !slots.includes(selectedTime)) setSelectedTime('');
        }
      })
      .catch(() => {})
      .finally(() => { if (isInitial) setLoadingSlots(false); });
  };

  useEffect(() => {
    if (!selectedDate) return;
    fetchSlots(selectedDate, true);
    const interval = setInterval(() => fetchSlots(selectedDate, false), 15000);
    return () => clearInterval(interval);
  }, [selectedDate]);

  // Fetch services
  useEffect(() => {
    fetch('/api/data/col_services', { cache: 'no-store' })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (Array.isArray(data) && data.length) {
          const mapped: BookingService[] = data
            .filter((s: { active: boolean }) => s.active)
            .map((s: { id: string; title: string; pricing: PricingTier[] }) => ({
              id: s.id, label: s.title,
              packages: Object.fromEntries((s.pricing || []).map(p => [p.name, p.price])),
              tiers: s.pricing || [],
            }));
          setServices(mapped);
        }
        setServicesLoaded(true);
      })
      .catch(() => setServicesLoaded(true));
  }, []);

  // Auto-select service from URL params
  useEffect(() => {
    if (!servicesLoaded || services.length === 0) return;
    const serviceParam = searchParams.get('service');
    const packageParam = searchParams.get('package');
    if (serviceParam) {
      const match = services.find(s => s.label === serviceParam);
      if (match) {
        setSelectedService(match.id);
        if (packageParam) setSelectedPackage(packageParam);
        setStep(1);
      }
    }
  }, [searchParams, servicesLoaded, services]);

  const now = new Date();
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [calYear, setCalYear]   = useState(now.getFullYear());
  const daysInMonth = getDaysInMonth(calYear, calMonth);
  const firstDay    = getFirstDayOfMonth(calYear, calMonth);

  const calendarDays = useMemo(() => {
    const days: (number | null)[] = [];
    for (let i = 0; i < firstDay; i++) days.push(null);
    for (let d = 1; d <= daysInMonth; d++) days.push(d);
    return days;
  }, [daysInMonth, firstDay]);

  const canGoNext = () => {
    switch (step) {
      case 0: return !!selectedService && !!selectedPackage;
      case 1: return !!selectedDate && !!selectedTime;
      case 2: return !!details.name && !!details.email;
      default: return true;
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const formatDate = (d: Date) =>
        `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`;

      const payload = {
        client_name:      details.name,
        client_email:     details.email,
        client_phone:     details.phone || undefined,
        service_name:     serviceName,
        package_name:     selectedPackage || undefined,
        booking_date:     selectedDate ? formatDate(selectedDate) : '',
        booking_time:     selectedTime, // already BDT 24h "HH:MM"
        duration_minutes: 30,
        message:          details.message || undefined,
      };
      const res = await fetch('/api/bookings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setSubmitted(true);
      } else {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        alert(`Booking failed: ${err.error || JSON.stringify(err.details || err)}`);
      }
    } catch {
      alert('Booking failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const serviceName = services.find(s => s.id === selectedService)?.label ?? '';

  const goNext = () => { if (step < 3 && canGoNext()) { setDirection(1);  setStep(s => s + 1); } };
  const goPrev = () => { if (step > 0)                { setDirection(-1); setStep(s => s - 1); } };

  const slideVariants = {
    enter:  (dir: number) => ({ x: dir > 0 ?  60 : -60, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit:   (dir: number) => ({ x: dir > 0 ? -60 :  60, opacity: 0 }),
  };

  const progressPercent = (step / (STEPS.length - 1)) * 100;

  // Get short timezone label for display
  const tzLabel = TIMEZONES.find(t => t.value === timezone)?.label.replace(/^\(UTC[^)]*\)\s*/, '') || timezone;

  /* ---- Success Screen ---- */
  if (submitted) {
    return (
      <main className="min-h-screen bg-brand-darkest flex items-center justify-center px-6">
        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-md text-center">
          <div className="w-20 h-20 rounded-full bg-[#B89B4A]/15 flex items-center justify-center mx-auto mb-6">
            <CalendarDays className="w-9 h-9 text-[#B89B4A]" />
          </div>
          <h2 className="heading-md text-[#E7DDC6] mb-4">Booking Confirmed</h2>
          <p className="body-base text-[#C9BFA6]/55 mb-8">
            Your appointment has been scheduled. You will receive a confirmation email shortly.
          </p>
          <div className="card p-6 text-left space-y-4 text-[14px] mb-8">
            {[
              { label: 'Service', value: serviceName },
              { label: 'Date', value: selectedDate?.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) },
              { label: 'Time', value: selectedTime && selectedDate ? `${bdtToDisplay(selectedTime, selectedDate, timezone)} (${tzLabel})` : '—' },
              { label: 'Name', value: details.name },
              { label: 'Email', value: details.email },
            ].map(item => (
              <div key={item.label} className="flex justify-between">
                <span className="text-[#C9BFA6]/35">{item.label}</span>
                <span className="text-[#E7DDC6]/75 font-semibold">{item.value}</span>
              </div>
            ))}
          </div>
          <button onClick={() => { setSubmitted(false); setStep(0); setSelectedService(''); setSelectedDate(null); setSelectedTime(''); setDetails({ name: '', email: '', phone: '', message: '' }); }} className="btn-secondary">
            Book Another Appointment
          </button>
        </motion.div>
      </main>
    );
  }

  /* ---- Main Booking UI ---- */
  return (
    <main className="min-h-screen bg-brand-darkest">
      <PageSEO title={pageContent.seoTitle} description={pageContent.seoDescription} image={pageContent.seoImage} />

      {/* Hero */}
      <section className="pt-28 md:pt-36 pb-12">
        <div className="container-main text-center">
          <motion.span initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="badge mb-6 inline-block">
            {pageContent.badge}
          </motion.span>
          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, delay: 0.1 }} className="heading-lg text-gradient-cream">
            {pageContent.heading}
          </motion.h1>
          <motion.p initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.25 }} className="mt-5 body-lg text-[#C9BFA6]/55">
            {pageContent.subtitle}
          </motion.p>
        </div>
      </section>

      {/* Progress Bar */}
      <section className="container-main mb-8">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[13px] text-[#C9BFA6]/40">Step {step + 1} of {STEPS.length}</span>
          <span className="text-[13px] text-[#B89B4A]/60 font-medium">{STEPS[step]}</span>
        </div>
        <div className="relative h-1 rounded-full bg-[#215F47]/50 overflow-hidden">
          <motion.div className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#B89B4A] to-[#D4BA6A] rounded-full"
            animate={{ width: `${progressPercent}%` }} transition={{ duration: 0.4, ease: 'easeInOut' }} />
        </div>
      </section>

      {/* Step Content + Summary Sidebar */}
      <section className="container-main pb-20">
        <div className="flex flex-col lg:flex-row gap-6">

          {/* Main form area */}
          <div className="flex-1 min-w-0 glass-strong p-7 sm:p-9 overflow-hidden rounded-2xl">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div key={step} custom={direction} variants={slideVariants} initial="enter" animate="center" exit="exit" transition={{ duration: 0.25 }}>

                {/* Step 0: Service */}
                {step === 0 && (
                  <div>
                    <h2 className="heading-sm text-[#E7DDC6] mb-7">Select a Service</h2>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {services.map(s => (
                        <button key={s.id} onClick={() => { setSelectedService(s.id); setSelectedPackage(''); }}
                          className={`rounded-xl border p-5 text-left text-[14px] font-medium transition-all duration-300 ${selectedService === s.id ? 'border-[#B89B4A]/40 bg-[#B89B4A]/10 text-[#E7DDC6] shadow-lg shadow-[#B89B4A]/5' : 'border-[#4B8A6C]/15 bg-[#215F47]/20 text-[#C9BFA6]/55 hover:border-[#4B8A6C]/30 hover:bg-[#215F47]/30'}`}>
                          {s.label}
                        </button>
                      ))}
                    </div>

                    {selectedService && (() => {
                      const svc = services.find(s => s.id === selectedService);
                      if (!svc) return null;
                      return (
                        <div className="mt-8">
                          <h3 className="text-[16px] font-semibold text-brand-cream mb-4">Select Package</h3>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {svc.tiers.map(tier => (
                              <div key={tier.name} className={`rounded-xl border transition-all duration-300 overflow-hidden ${selectedPackage === tier.name ? 'border-[#B89B4A]/40 bg-[#B89B4A]/10' : 'border-[#4B8A6C]/15 hover:border-[#4B8A6C]/30'}`}>
                                <button onClick={() => setSelectedPackage(tier.name)} className="w-full py-3 sm:py-4 px-4 flex sm:flex-col items-center sm:items-center gap-3 sm:gap-0 sm:text-center">
                                  <div className={`text-[14px] font-medium ${selectedPackage === tier.name ? 'text-[#E7DDC6]' : 'text-[#C9BFA6]/55'}`}>{tier.name}</div>
                                  <div className="text-[16px] font-bold text-brand-gold sm:mt-1">{tier.price}</div>
                                  <div className="text-[10px] text-brand-cream/30 sm:mt-1 ml-auto sm:ml-0">{tier.features?.filter(f => f.included).length || 0} features</div>
                                </button>
                                <button onClick={e => { e.stopPropagation(); setDetailTier(detailTier?.name === tier.name ? null : tier); }}
                                  className="w-full py-2 text-[11px] text-brand-gold/70 hover:text-brand-gold border-t border-[#4B8A6C]/10 hover:bg-brand-gold/5 transition-colors flex items-center justify-center gap-1">
                                  {detailTier?.name === tier.name ? 'Hide Details' : 'View Details'}
                                  <ChevronRight className={`w-3 h-3 transition-transform ${detailTier?.name === tier.name ? 'rotate-90' : ''}`} />
                                </button>
                              </div>
                            ))}
                          </div>
                          {detailTier && (
                            <div className="mt-3 p-4 rounded-xl border border-[#4B8A6C]/15 bg-[#0B2A1F]/50 space-y-2">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-[13px] font-semibold text-brand-cream">{detailTier.name} - {detailTier.price}</span>
                                <button onClick={() => setDetailTier(null)} className="text-[11px] text-brand-cream/40 hover:text-brand-cream">Close</button>
                              </div>
                              {detailTier.features?.map((f, i) => (
                                <div key={i} className={`flex items-center gap-2.5 text-[13px] ${f.included ? 'text-brand-cream/75' : 'text-brand-cream/25'}`}>
                                  {f.included ? <Check className="w-4 h-4 text-brand-mid flex-shrink-0" /> : <span className="w-4 h-4 flex items-center justify-center flex-shrink-0 text-brand-cream/15">×</span>}
                                  {f.text}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* Step 1: Calendar + Time */}
                {step === 1 && (
                  <div>
                    <h2 className="heading-sm text-[#E7DDC6] mb-7">Choose a Date</h2>

                    {/* Month nav */}
                    <div className="flex items-center justify-between mb-5">
                      <button onClick={() => { if (calMonth === 0) { setCalMonth(11); setCalYear(y => y - 1); } else setCalMonth(m => m - 1); }}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#4B8A6C]/15 text-[#6BA88A] hover:text-[#B89B4A] hover:border-[#B89B4A]/30 transition">
                        <ChevronLeft size={16} />
                      </button>
                      <span className="text-[15px] font-display font-semibold text-[#E7DDC6]/80">{MONTHS[calMonth]} {calYear}</span>
                      <button onClick={() => { if (calMonth === 11) { setCalMonth(0); setCalYear(y => y + 1); } else setCalMonth(m => m + 1); }}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-[#4B8A6C]/15 text-[#6BA88A] hover:text-[#B89B4A] hover:border-[#B89B4A]/30 transition">
                        <ChevronRight size={16} />
                      </button>
                    </div>

                    {/* Day headers */}
                    <div className="grid grid-cols-7 text-center text-[12px] text-[#6BA88A]/50 mb-2 font-semibold">
                      {DAYS.map(d => <span key={d} className="py-2">{d}</span>)}
                    </div>

                    {/* Calendar grid */}
                    <div className="grid grid-cols-7 gap-1.5">
                      {calendarDays.map((day, i) => {
                        if (day === null) return <div key={`blank-${i}`} />;
                        const weekend  = isWeekend(calYear, calMonth, day);
                        const past     = isPast(calYear, calMonth, day);
                        const disabled = weekend || past;
                        const today    = isToday(calYear, calMonth, day);
                        const isSelected = selectedDate?.getDate() === day && selectedDate?.getMonth() === calMonth && selectedDate?.getFullYear() === calYear;
                        return (
                          <button key={day} disabled={disabled} onClick={() => setSelectedDate(new Date(calYear, calMonth, day))}
                            className={`relative rounded-xl py-2.5 text-[14px] font-medium transition-all duration-200 ${isSelected ? 'bg-[#B89B4A] text-[#0E3529] shadow-lg shadow-[#B89B4A]/20' : disabled ? 'text-[#C9BFA6]/15 cursor-not-allowed' : 'text-[#E7DDC6]/55 hover:bg-[#215F47]/40 hover:text-[#E7DDC6]'}`}>
                            {day}
                            {today && !isSelected && <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#B89B4A]" />}
                          </button>
                        );
                      })}
                    </div>

                    {selectedDate && (
                      <p className="mt-5 text-[14px] text-[#C9BFA6]/40">
                        Selected: <span className="text-[#E7DDC6]/70 font-semibold">{selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
                      </p>
                    )}

                    {/* Time Slots */}
                    {selectedDate && (
                      <div className="mt-8 pt-6 border-t border-[#4B8A6C]/10">
                        <h3 className="text-[16px] font-semibold text-[#E7DDC6] mb-4">Choose a Time Slot</h3>

                        {/* Timezone selector */}
                        <div className="flex items-center gap-2.5 mb-5 p-3 rounded-xl border border-[#4B8A6C]/15 bg-[#0B2A1F]/40">
                          <Globe className="w-4 h-4 text-brand-gold/60 shrink-0" />
                          <select
                            value={timezone}
                            onChange={e => { setTimezone(e.target.value); setSelectedTime(''); }}
                            className="flex-1 bg-transparent text-[13px] text-brand-cream/70 focus:outline-none cursor-pointer"
                          >
                            {TIMEZONES.map(tz => (
                              <option key={tz.value} value={tz.value} className="bg-[#0E3529] text-brand-cream">
                                {tz.label}
                              </option>
                            ))}
                            {/* Show detected timezone if not in list */}
                            {!TIMEZONES.find(t => t.value === timezone) && (
                              <option value={timezone} className="bg-[#0E3529] text-brand-cream">{timezone}</option>
                            )}
                          </select>
                        </div>

                        {loadingSlots ? (
                          <div className="flex items-center justify-center py-8">
                            <div className="w-5 h-5 border-2 border-[#B89B4A]/30 border-t-[#B89B4A] rounded-full animate-spin" />
                            <span className="ml-3 text-[13px] text-[#C9BFA6]/50">Checking availability...</span>
                          </div>
                        ) : availableSlots.length === 0 ? (
                          <div className="text-center py-8">
                            <p className="text-[#C9BFA6]/50 text-[14px]">No available time slots for this date.</p>
                            <p className="text-[#C9BFA6]/30 text-[12px] mt-2">Try selecting a different date.</p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
                            {availableSlots.map(slot => {
                              const display = bdtToDisplay(slot, selectedDate, timezone);
                              return (
                                <button key={slot} onClick={() => setSelectedTime(slot)}
                                  className={`rounded-full border py-2.5 text-[13px] font-medium transition-all duration-300 ${selectedTime === slot ? 'border-[#B89B4A]/40 bg-[#B89B4A] text-[#0E3529] shadow-lg shadow-[#B89B4A]/20' : 'border-[#4B8A6C]/15 text-[#C9BFA6]/50 hover:border-[#4B8A6C]/30 hover:bg-[#215F47]/30'}`}>
                                  {display}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Step 2: Details */}
                {step === 2 && (
                  <div>
                    <h2 className="heading-sm text-[#E7DDC6] mb-7">Your Details</h2>
                    <div className="space-y-5">
                      <div>
                        <label className="mb-2 block text-[12px] uppercase tracking-widest text-[#B89B4A]/60 font-semibold">Name</label>
                        <input type="text" value={details.name} onChange={e => setDetails(d => ({ ...d, name: e.target.value }))} placeholder="John Doe" className="input-field" />
                      </div>
                      <div>
                        <label className="mb-2 block text-[12px] uppercase tracking-widest text-[#B89B4A]/60 font-semibold">Email</label>
                        <input type="email" value={details.email} onChange={e => setDetails(d => ({ ...d, email: e.target.value }))} placeholder="you@example.com" className="input-field" />
                      </div>
                      <div>
                        <label className="mb-2 block text-[12px] uppercase tracking-widest text-[#B89B4A]/60 font-semibold">Phone (optional)</label>
                        <input type="tel" value={details.phone} onChange={e => setDetails(d => ({ ...d, phone: e.target.value }))} placeholder="+880 1XXX-XXXXXX" className="input-field" />
                      </div>
                      <div>
                        <label className="mb-2 block text-[12px] uppercase tracking-widest text-[#B89B4A]/60 font-semibold">Message (optional)</label>
                        <textarea rows={3} value={details.message} onChange={e => setDetails(d => ({ ...d, message: e.target.value }))} placeholder="Any additional details..." className="textarea-field" />
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3: Confirm */}
                {step === 3 && (
                  <div>
                    <h2 className="heading-sm text-[#E7DDC6] mb-7">Review &amp; Confirm</h2>
                    <div className="space-y-4 text-[14px]">
                      {[
                        { label: 'Service',  value: serviceName },
                        { label: 'Package',  value: selectedPackage || 'Not selected' },
                        { label: 'Date',     value: selectedDate?.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }) },
                        { label: 'Time',     value: selectedTime && selectedDate ? `${bdtToDisplay(selectedTime, selectedDate, timezone)} (${tzLabel})` : '—' },
                        { label: 'Name',     value: details.name },
                        { label: 'Email',    value: details.email },
                      ].map(item => (
                        <div key={item.label} className="flex justify-between py-3 border-b border-[#4B8A6C]/10">
                          <span className="text-[#C9BFA6]/35">{item.label}</span>
                          <span className="text-[#E7DDC6]/75 font-semibold">{item.value}</span>
                        </div>
                      ))}
                      {details.phone && (
                        <div className="flex justify-between py-3 border-b border-[#4B8A6C]/10">
                          <span className="text-[#C9BFA6]/35">Phone</span>
                          <span className="text-[#E7DDC6]/75 font-semibold">{details.phone}</span>
                        </div>
                      )}
                      {details.message && (
                        <div className="py-3">
                          <span className="text-[#C9BFA6]/35 block mb-2">Message</span>
                          <p className="text-[#E7DDC6]/55">{details.message}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>

            {/* Navigation */}
            <div className="mt-9 flex items-center justify-between">
              <button onClick={goPrev} disabled={step === 0} className="btn-ghost disabled:opacity-20 disabled:cursor-not-allowed">
                <ArrowLeft size={14} /> Back
              </button>
              {step < 3 ? (
                <button onClick={goNext} disabled={!canGoNext()} data-track-ignore className="btn-primary disabled:opacity-30 disabled:cursor-not-allowed">
                  Next <ArrowRight size={14} />
                </button>
              ) : (
                <button onClick={() => {
                  const svc = services.find(s => s.id === selectedService);
                  const price = svc?.packages[selectedPackage as keyof typeof svc.packages] || '';
                  window.dataLayer = window.dataLayer || [];
                  window.dataLayer.push({ event: 'confirm_booking', service_name: serviceName, package_name: selectedPackage, package_amount: price, booking_date: selectedDate?.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) || '', booking_time: selectedTime, customer_name: details.name, customer_email: details.email, customer_phone: details.phone, customer_message: details.message });
                  handleSubmit();
                }} disabled={submitting} data-track-ignore className="btn-primary disabled:opacity-50">
                  {submitting ? 'Booking...' : <><Check size={14} /> Confirm Booking</>}
                </button>
              )}
            </div>
          </div>

          {/* Summary Sidebar */}
          <div className="lg:w-[340px] shrink-0">
            <div className="lg:sticky lg:top-24 rounded-2xl border border-brand-mid/[0.08] p-6 relative overflow-hidden">
              <div className="absolute inset-0 opacity-[0.03] pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(75,138,108,1) 1px, transparent 1px), linear-gradient(90deg, rgba(75,138,108,1) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
              <div className="relative z-10">
                <h3 className="text-[14px] font-semibold text-brand-cream mb-5">Booking Summary</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-start">
                    <span className="text-[12px] text-brand-cream/40 uppercase tracking-wider">Service</span>
                    <span className="text-[14px] text-brand-cream/80 font-medium text-right max-w-[180px]">{serviceName || '—'}</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-[12px] text-brand-cream/40 uppercase tracking-wider">Package</span>
                    <span className="text-[14px] text-brand-cream/80 font-medium">{selectedPackage || '—'}</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-[12px] text-brand-cream/40 uppercase tracking-wider">Date</span>
                    <span className="text-[14px] text-brand-cream/80 font-medium">{selectedDate ? selectedDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}</span>
                  </div>
                  <div className="flex justify-between items-start">
                    <span className="text-[12px] text-brand-cream/40 uppercase tracking-wider">Time</span>
                    <div className="text-right">
                      <span className="text-[14px] text-brand-cream/80 font-medium block">{selectedTime && selectedDate ? bdtToDisplay(selectedTime, selectedDate, timezone) : '—'}</span>
                      {selectedTime && <span className="text-[11px] text-brand-cream/30">{tzLabel}</span>}
                    </div>
                  </div>
                  {details.name && (
                    <div className="flex justify-between items-start">
                      <span className="text-[12px] text-brand-cream/40 uppercase tracking-wider">Name</span>
                      <span className="text-[14px] text-brand-cream/80 font-medium">{details.name}</span>
                    </div>
                  )}
                </div>

                {selectedService && selectedPackage && (() => {
                  const svc = services.find(s => s.id === selectedService);
                  const price = svc?.packages[selectedPackage as keyof typeof svc.packages];
                  if (!price) return null;
                  return (
                    <div className="mt-6 pt-5 border-t border-brand-mid/10">
                      <div className="flex justify-between items-center">
                        <div>
                          <span className="text-[13px] text-brand-cream/50 block">Starting from</span>
                          <span className="text-[11px] text-brand-cream/30">Discussed after meeting</span>
                        </div>
                        <span className="text-[24px] font-display font-bold text-brand-gold">{price}</span>
                      </div>
                    </div>
                  );
                })()}

                {!selectedService && <p className="text-[13px] text-brand-cream/30 italic mt-2">Select a service to see your summary.</p>}

                <div className="mt-6 pt-5 border-t border-brand-mid/10 space-y-3">
                  {(pageContent.perks || "100% free consultation — no payment needed\nMeet first, pay only when you're ready\nNo commitment, cancel anytime").split('\n').filter(Boolean).map((perk: string, i: number) => (
                    <div key={i} className="flex items-start gap-2.5">
                      <Check className="w-4 h-4 text-brand-mid shrink-0 mt-0.5" />
                      <span className="text-[12px] text-brand-cream/50">{perk}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>
    </main>
  );
}
