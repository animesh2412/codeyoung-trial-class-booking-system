import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRight, CalendarDays, Check, Clock3, Globe2, LoaderCircle, Mail, UserRound } from 'lucide-react';
import { getSlots, createBooking } from '../lib/api';
import { DateTime } from 'luxon';
const ZONES = [
  ['America/New_York','US Eastern'],['America/Chicago','US Central'],['America/Denver','US Mountain'],['America/Los_Angeles','US Pacific'],['Europe/London','United Kingdom'],['Europe/Dublin','Ireland'],['Asia/Kolkata','India'],['Asia/Dubai','Dubai'],['Australia/Sydney','Sydney'],['Pacific/Auckland','Auckland']
];
const todayInZone = (zone) => DateTime.now().setZone(zone).toISODate();
export default function BookingForm() {
  const guessedZone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York';
  const [form, setForm] = useState({ parentName:'', parentEmail:'', parentTimezone: ZONES.some(z => z[0] === guessedZone) ? guessedZone : 'America/New_York', date:'', startAt:'' });
  const [slots, setSlots] = useState([]); const [loadingSlots, setLoadingSlots] = useState(false); const [submitting, setSubmitting] = useState(false); const [error, setError] = useState(''); const [confirmation, setConfirmation] = useState(null);
  const zone = form.parentTimezone;
  useEffect(() => { const min = todayInZone(zone); setForm(f => ({ ...f, date: f.date && f.date >= min ? f.date : min, startAt:'' })); }, [zone]);
  useEffect(() => {
    if (!form.date || !zone) return;
    let cancelled = false;
    setLoadingSlots(true); setSlots([]); setError('');
    getSlots(form.date, zone).then(data => { if (!cancelled) setSlots(data.slots || []); }).catch(e => { if (!cancelled) setError(e.message); }).finally(() => { if (!cancelled) setLoadingSlots(false); });
    return () => { cancelled = true; };
  }, [form.date, zone]);
  const selectedSlot = useMemo(() => slots.find(s => s.startAt === form.startAt), [slots, form.startAt]);
  const change = (key, value) => setForm(f => ({ ...f, [key]: value }));
  async function submit(event) {
    event.preventDefault(); setError('');
    if (!form.startAt) { setError('Choose an available time before continuing.'); return; }
    setSubmitting(true);
    try { const data = await createBooking({ parentName: form.parentName, parentEmail: form.parentEmail, parentTimezone: zone, startAt: form.startAt }); setConfirmation(data.booking); }
    catch (e) { setError(e.message); if (form.date) getSlots(form.date, zone).then(data => setSlots(data.slots || [])).catch(() => {}); }
    finally { setSubmitting(false); }
  }
  if (confirmation) return <section className="confirmation-card" aria-live="polite">
    <div className="success-icon"><Check size={30}/></div><p className="eyebrow">YOU'RE ALL SET</p><h2>Your trial class is booked.</h2><p className="muted">A confirmation has been created for {confirmation.parentName}. Keep this page open for your meeting details.</p>
    <div className="confirm-detail"><span>YOUR MENTOR</span><strong>{confirmation.mentorName}</strong></div>
    <div className="confirm-detail"><span>YOUR LOCAL TIME</span><strong>{DateTime.fromISO(confirmation.startAt).setZone(confirmation.parentTimezone).toFormat("cccc, LLLL d 'at' h:mm a ZZZZ")}</strong><small>{confirmation.parentTimezone}</small></div>
    <a className="primary-button full-button" href={confirmation.meetingUrl} target="_blank" rel="noreferrer">Open class link <ArrowRight size={18}/></a>
    <div className="email-status"><Mail size={17}/><span>{confirmation.emails?.some(e => e.status === 'sent') ? 'Email status is shown below.' : 'Your booking is saved. Email delivery needs valid SMTP settings and recipient addresses.'}</span></div>
    {confirmation.emails?.map(e => <div className="email-row" key={e.kind}><span>{e.kind === 'parent-confirmation' ? 'Parent confirmation' : 'Mentor notification'}</span><strong className={`status-${e.status}`}>{e.status}</strong></div>)}
    <button className="text-button" onClick={() => { setConfirmation(null); setForm(f => ({ ...f, startAt:'' })); }}>Book another trial</button>
  </section>;
  return <form className="booking-form" onSubmit={submit}>
    <div className="form-heading"><span className="step-number">01</span><div><h2>Let's find your time.</h2><p>Tell us a little about your family to get started.</p></div></div>
    <label className="field-label" htmlFor="parentName">Parent or guardian name</label><div className="input-wrap"><UserRound size={18}/><input id="parentName" autoComplete="name" value={form.parentName} onChange={e => change('parentName', e.target.value)} placeholder="e.g. Alex Morgan" minLength="2" maxLength="100" required /></div>
    <label className="field-label" htmlFor="parentEmail">Email address</label><div className="input-wrap"><Mail size={18}/><input id="parentEmail" type="email" autoComplete="email" value={form.parentEmail} onChange={e => change('parentEmail', e.target.value)} placeholder="you@example.com" maxLength="254" required /></div>
    <div className="field-label-row"><label className="field-label" htmlFor="timezone">Your time zone</label><span className="field-note"><Globe2 size={13}/> Times shown locally</span></div>
    <div className="select-wrap"><Globe2 size={18}/><select id="timezone" value={zone} onChange={e => { change('parentTimezone', e.target.value); change('startAt',''); }} required>{ZONES.map(([value,label]) => <option key={value} value={value}>{label} · {value}</option>)}</select></div>
    <div className="form-heading date-heading"><span className="step-number">02</span><div><h2>Choose a day.</h2><p>We’ll match you with an available mentor.</p></div></div>
    <label className="field-label" htmlFor="date">Preferred date</label><div className="input-wrap"><CalendarDays size={18}/><input id="date" type="date" value={form.date} min={todayInZone(zone)} onChange={e => { change('date', e.target.value); change('startAt',''); }} required /></div>
    <div className="field-label-row slots-title"><span className="field-label">Available times</span><span className="field-note"><Clock3 size={13}/> 30-minute class</span></div>
    {loadingSlots ? <div className="slots-state"><LoaderCircle className="spin" size={19}/> Finding available times…</div> : slots.length ? <div className="slot-grid" role="group" aria-label="Available class times">{slots.map(slot => <button type="button" key={slot.startAt} className={`slot-button ${form.startAt === slot.startAt ? 'selected' : ''}`} onClick={() => change('startAt', slot.startAt)} aria-pressed={form.startAt === slot.startAt}>{slot.label}<small>{slot.offsetLabel}</small></button>)}</div> : <div className="slots-empty">{form.date ? 'No times available on this date. Try another day.' : 'Choose a date to see available times.'}</div>}
    {selectedSlot && <p className="selected-note"><Check size={15}/> Selected {selectedSlot.label} in your local time zone.</p>}
    {error && <div className="error-message" role="alert">{error}</div>}
    <button className="primary-button full-button" type="submit" disabled={submitting || loadingSlots || !form.startAt}>{submitting ? <><LoaderCircle className="spin" size={18}/> Confirming…</> : <>Confirm free trial <ArrowRight size={18}/></>}</button>
    <p className="privacy-note">No payment details required. Your details are used to arrange this trial class.</p>
  </form>;
}
